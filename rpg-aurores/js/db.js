/* ═══════════════════════════════════════════════════════════════
   FIREBASE — Auth + Firestore
   Depende de: firebase-config.js (firebaseConfig)
   SDK: firebase-app-compat, firebase-auth-compat, firebase-firestore-compat
═══════════════════════════════════════════════════════════════ */

let _auth = null;
let _db = null;
let _unsubscribeListen = null;

let DB_USER = null;
let DB_IS_GM = false;

// ID único por aba/sessão de browser — distingue dois browsers logados na mesma conta.
// Usado em lastEditedBy para que o eco do próprio save não sobrescreva o formulário,
// mas mudanças de outra janela (mesmo usuário) ainda sejam aplicadas.
const _SESSION_ID = Math.random().toString(36).slice(2) + Date.now().toString(36);

// ─── Inicialização ────────────────────────────────────────────

function dbConfigured() {
  return typeof firebaseConfig !== 'undefined' &&
    firebaseConfig.projectId &&
    !firebaseConfig.projectId.includes('COLE_');
}

function _boot() {
  if (_db) return;
  if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
  _auth = firebase.auth();
  _db = firebase.firestore();
}

// Verifica sessão existente. Retorna o usuário ou null.
async function dbInit() {
  if (!dbConfigured()) return null;
  _boot();
  return new Promise(resolve => {
    const unsub = _auth.onAuthStateChanged(async user => {
      unsub();
      if (user) {
        DB_USER = user;
        await _carregarPerfil();
        dbRegisterUser();
        resolve(DB_USER);
      } else {
        resolve(null);
      }
    });
  });
}

async function _carregarPerfil() {
  try {
    const doc = await _db.collection('gm_users').doc(DB_USER.uid).get();
    DB_IS_GM = doc.exists;
  } catch (_) {
    DB_IS_GM = false;
  }
}

// Upsert do e-mail do usuário na coleção users (chamado a cada login/cadastro)
async function dbRegisterUser() {
  if (!DB_USER) return;
  try {
    await _db.collection('users').doc(DB_USER.uid).set({ email: DB_USER.email }, { merge: true });
  } catch (_) { }
}

// Busca perfil de um usuário pelo uid (GM pode ler qualquer um)
// { source: 'server' } garante dado fresco, ignorando cache do IndexedDB.
async function dbGetUser(uid) {
  try {
    const doc = await _db.collection('users').doc(uid).get({ source: 'server' });
    return doc.exists ? { uid: doc.id, ...doc.data() } : null;
  } catch (e) {
    console.warn('[dbGetUser] Erro ao ler perfil:', e.code || e.message);
    return null;
  }
}

// Lista todos os jogadores registrados (GM only)
// { source: 'server' } garante lista fresca, sem cache do IndexedDB.
async function dbListUsers() {
  const snap = await _db.collection('users').orderBy('email').get({ source: 'server' });
  return snap.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
}

// Atualiza perfil do usuário (username, avatarUrl)
async function dbUpdateProfile(data) {
  if (!DB_USER) throw new Error('Não autenticado.');
  const campos = {};
  if (data.username !== undefined) campos.username = data.username;
  if (data.avatarUrl !== undefined) campos.avatarUrl = data.avatarUrl;
  await _db.collection('users').doc(DB_USER.uid).set(campos, { merge: true });
}

// Troca de senha: reautentica com a senha atual e atualiza
async function dbChangePassword(senhaAtual, senhaNova) {
  if (!DB_USER) throw new Error('Não autenticado.');
  const cred = firebase.auth.EmailAuthProvider.credential(DB_USER.email, senhaAtual);
  await _auth.currentUser.reauthenticateWithCredential(cred);
  await _auth.currentUser.updatePassword(senhaNova);
}

// Apaga a conta: reautentica, remove dados do Firestore e deleta a conta Firebase Auth
async function dbDeleteAccount(senhaAtual) {
  if (!DB_USER) throw new Error('Não autenticado.');
  const cred = firebase.auth.EmailAuthProvider.credential(DB_USER.email, senhaAtual);
  await _auth.currentUser.reauthenticateWithCredential(cred);
  const uid = DB_USER.uid;
  // Remove campanhas criadas pelo GM (libera fichas de outros jogadores)
  const campsSnap = await _db.collection('campanhas').where('gmId', '==', uid).get();
  for (const doc of campsSnap.docs) {
    await dbDeleteCampanha(doc.id);
  }
  // Remove fichas do usuário
  const snap = await _db.collection('fichas').where('userId', '==', uid).get();
  if (!snap.empty) {
    const batch = _db.batch();
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
  }
  // Remove perfil do usuário
  await _db.collection('users').doc(uid).delete().catch(() => { });
  // Deleta a conta Firebase Auth
  await _auth.currentUser.delete();
  DB_USER = null;
  DB_IS_GM = false;
}

// ─── Auth ─────────────────────────────────────────────────────

async function dbLogin(email, password) {
  _boot();
  const { user } = await _auth.signInWithEmailAndPassword(email, password);
  DB_USER = user;
  await _carregarPerfil();
  dbRegisterUser();
  return DB_USER;
}

async function dbSignup(email, password) {
  _boot();
  const { user } = await _auth.createUserWithEmailAndPassword(email, password);
  DB_USER = user;
  dbRegisterUser();
  return DB_USER;
}

async function dbLogout() {
  dbStopListen();
  await _auth.signOut();
  DB_USER = null;
  DB_IS_GM = false;
}

// ─── CRUD ─────────────────────────────────────────────────────

async function dbLoadFichas(filterUserId = null) {
  let q = _db.collection('fichas');
  if (DB_IS_GM && filterUserId) {
    // where + orderBy juntos exigem índice composto — usa só where e ordena no cliente
    q = q.where('userId', '==', filterUserId);
  } else if (!DB_IS_GM) {
    q = q.where('userId', '==', DB_USER.uid);
  } else {
    q = q.orderBy('createdAt'); // GM sem filtro: índice simples, sem where
  }
  const snap = await q.get();
  return snap.docs.map(_docToFicha);
}

// Cria uma ficha nova (usa set com createdAt)
async function dbCreateFicha(ficha) {
  if (!DB_USER) return;
  await _db.collection('fichas').doc(ficha.id).set({
    userId: ficha.user_id || DB_USER.uid,
    nome: ficha.nome,
    dados: ficha.dados || {},
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
}

// Atualiza uma ficha existente (merge para não sobrescrever createdAt)
async function dbSaveFicha(ficha) {
  if (!DB_USER) return;
  await _db.collection('fichas').doc(ficha.id).set({
    userId: ficha.user_id || DB_USER.uid,
    nome: ficha.nome,
    dados: ficha.dados,
    lastEditedBy: _SESSION_ID,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
}

async function dbDeleteFicha(id) {
  if (!DB_USER) return;
  await _db.collection('fichas').doc(id).delete();
}

// ─── Listener em tempo real ────────────────────────────────────

// onRemoteChange(fichaId, fichaObj | null)
//   fichaObj = { id, user_id, nome, dados }
//   null = ficha foi removida
//
// loadedIds: Set com IDs já carregados por dbLoadFichas().
//   No primeiro snapshot, 'added' de IDs que já estão no set são ignorados
//   (evita duplicar fichas já renderizadas). IDs ausentes do set — carga
//   inicial falhou ou ficha é nova — passam normalmente.
function dbListenFichas(onRemoteChange, filterUserId = null, loadedIds = new Set()) {
  dbStopListen();
  let q = _db.collection('fichas');
  if (DB_IS_GM && filterUserId) {
    q = q.where('userId', '==', filterUserId);
  } else if (!DB_IS_GM) {
    q = q.where('userId', '==', DB_USER.uid);
  }

  let primeiroSnapshot = true;

  _unsubscribeListen = q.onSnapshot(snapshot => {
    snapshot.docChanges().forEach(change => {
      if (change.doc.metadata.hasPendingWrites) return;

      if (change.type === 'removed') {
        onRemoteChange(change.doc.id, null);
        return;
      }

      // No primeiro snapshot, pular apenas fichas que já foram carregadas com sucesso
      if (primeiroSnapshot && change.type === 'added' && loadedIds.has(change.doc.id)) return;

      onRemoteChange(change.doc.id, _docToFicha(change.doc));
    });
    primeiroSnapshot = false;
  });
}

function dbStopListen() {
  if (_unsubscribeListen) { _unsubscribeListen(); _unsubscribeListen = null; }
}

// Listener em tempo real para UMA ficha específica (GM abrindo ?ficha=ID)
function dbListenFicha(fichaId, onChange) {
  dbStopListen();
  _unsubscribeListen = _db.collection('fichas').doc(fichaId).onSnapshot(doc => {
    if (doc.metadata.hasPendingWrites) return;
    if (!doc.exists) { onChange(fichaId, null); return; }
    onChange(fichaId, _docToFicha(doc));
  });
}

// Lista campanhas em que o jogador autenticado é membro aceito
async function dbGetCampanhasJogador() {
  if (!DB_USER) return [];
  try {
    const snap = await _db.collection('campanhas')
      .where('jogadoresIds', 'array-contains', DB_USER.uid)
      .get();
    return snap.docs.map(d => ({
      id: d.id,
      nome: d.data().nome || '(sem nome)',
      status: d.data().status || 'ativa',
    }));
  } catch (e) {
    console.warn('[dbGetCampanhasJogador]', e);
    return [];
  }
}

// ─── Helpers ──────────────────────────────────────────────────

function _docToFicha(doc) {
  const d = doc.data();
  return {
    id: doc.id,
    user_id: d.userId,
    nome: d.nome,
    dados: d.dados || {},
    lastEditedBy: d.lastEditedBy || null,
    campanhaId: d.campanhaId || null,
  };
}

// Busca uma ficha específica pelo ID (acesso por GM de campanha, participantes ou dono)
async function dbGetFichaById(id) {
  const doc = await _db.collection('fichas').doc(id).get();
  if (!doc.exists) return null;
  return _docToFicha(doc);
}

// ─── Campanhas ────────────────────────────────────────────────

async function dbGetCampanha(id) {
  const doc = await _db.collection('campanhas').doc(id).get();
  if (!doc.exists) return null;
  const d = doc.data();
  return {
    id: doc.id,
    gmId: d.gmId || '',
    gmEmail: d.gmEmail || '',
    gmUsername: d.gmUsername || null,
    nome: d.nome || '',
    descricao: d.descricao || '',
    sistema: d.sistema || 'd100',
    status: d.status || 'ativa',
    jogadoresIds: d.jogadoresIds || [],
    membros: d.membros || {},
  };
}

// Fichas vinculadas a uma campanha (lidas pelo GM ou participantes)
async function dbGetCampanhaFichas(campanhaId) {
  const snap = await _db.collection('fichas')
    .where('campanhaId', '==', campanhaId)
    .get();
  return snap.docs.map(_docToFicha);
}

async function dbGetSolicitacoes(campanhaId) {
  const snap = await _db.collection('campanhas').doc(campanhaId)
    .collection('solicitacoes')
    .orderBy('requestedAt', 'desc')
    .get();
  return snap.docs.map(d => ({ uid: d.id, ...d.data() }));
}

// Jogador solicita entrada com uma ficha (cria/sobrescreve solicitação)
async function dbSolicitarEntrada(campanhaId, fichaId, fichaName) {
  if (!DB_USER) throw new Error('Não autenticado.');
  const fichaDoc = await _db.collection('fichas').doc(fichaId).get();
  if (!fichaDoc.exists) throw new Error('Ficha não encontrada.');
  if (fichaDoc.data().campanhaId) throw new Error('Esta ficha já está vinculada a uma campanha.');
  await _db.collection('campanhas').doc(campanhaId)
    .collection('solicitacoes').doc(DB_USER.uid).set({
      email: DB_USER.email,
      fichaId,
      fichaName,
      requestedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
}

async function dbCancelarSolicitacao(campanhaId) {
  if (!DB_USER) throw new Error('Não autenticado.');
  await _db.collection('campanhas').doc(campanhaId)
    .collection('solicitacoes').doc(DB_USER.uid).delete();
}

// GM aceita jogador: vincula ficha, adiciona à campanha, remove solicitação
// A campanha é atualizada primeiro (operação separada) para que o get(campanha)
// nas regras da ficha e da solicitação não conflite com a escrita da campanha
// no mesmo batch — comportamento conhecido do Firestore Security Rules.
async function dbAceitarJogador(campanhaId, uid, fichaId, userData) {
  if (!DB_USER) throw new Error('Não autenticado.');
  const campRef = _db.collection('campanhas').doc(campanhaId);

  await campRef.update({
    jogadoresIds: firebase.firestore.FieldValue.arrayUnion(uid),
    [`membros.${uid}`]: {
      email: userData.email || '',
      username: userData.username || null,
      joinedAt: firebase.firestore.FieldValue.serverTimestamp(),
    },
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  });

  const batch = _db.batch();
  batch.update(_db.collection('fichas').doc(fichaId), {
    campanhaId,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
  batch.delete(campRef.collection('solicitacoes').doc(uid));
  await batch.commit();
}

async function dbRecusarJogador(campanhaId, uid) {
  await _db.collection('campanhas').doc(campanhaId)
    .collection('solicitacoes').doc(uid).delete();
}

// GM expulsa jogador: remove da campanha e desvincula todas as suas fichas
async function dbExpulsarJogador(campanhaId, uid) {
  if (!DB_USER) throw new Error('Não autenticado.');
  const campRef = _db.collection('campanhas').doc(campanhaId);
  await campRef.update({
    jogadoresIds: firebase.firestore.FieldValue.arrayRemove(uid),
    [`membros.${uid}`]: firebase.firestore.FieldValue.delete(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
  const snap = await _db.collection('fichas')
    .where('userId', '==', uid)
    .where('campanhaId', '==', campanhaId)
    .get();
  if (!snap.empty) {
    const batch = _db.batch();
    snap.docs.forEach(d => batch.update(d.ref, {
      campanhaId: null,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    }));
    await batch.commit();
  }
}

// GM deleta a campanha: libera fichas vinculadas, remove solicitações e deleta o documento
async function dbDeleteCampanha(campanhaId) {
  if (!DB_USER) throw new Error('Não autenticado.');
  const [fichasSnap, solsSnap] = await Promise.all([
    _db.collection('fichas').where('campanhaId', '==', campanhaId).get(),
    _db.collection('campanhas').doc(campanhaId).collection('solicitacoes').get(),
  ]);
  const batch = _db.batch();
  fichasSnap.docs.forEach(d => batch.update(d.ref, {
    campanhaId: null,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  }));
  solsSnap.docs.forEach(d => batch.delete(d.ref));
  batch.delete(_db.collection('campanhas').doc(campanhaId));
  await batch.commit();
}

// GM ou dono desvincula uma ficha da campanha (sem deletar)
async function dbDesvinculaFicha(fichaId) {
  await _db.collection('fichas').doc(fichaId).update({
    campanhaId: null,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
}

// Jogador vincula uma ficha livre a uma campanha em que já é membro
async function dbVincularFicha(fichaId, campanhaId) {
  if (!DB_USER) throw new Error('Não autenticado.');
  const fichaDoc = await _db.collection('fichas').doc(fichaId).get();
  if (!fichaDoc.exists) throw new Error('Ficha não encontrada.');
  const atual = fichaDoc.data().campanhaId;
  if (atual && atual !== campanhaId) throw new Error('Esta ficha já está vinculada a outra campanha.');
  await _db.collection('fichas').doc(fichaId).update({
    campanhaId,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
}

// Jogador sai da campanha: remove-se de jogadoresIds e desvincula suas fichas
async function dbSairDaCampanha(campanhaId) {
  if (!DB_USER) throw new Error('Não autenticado.');
  const campRef = _db.collection('campanhas').doc(campanhaId);
  await campRef.update({
    jogadoresIds: firebase.firestore.FieldValue.arrayRemove(DB_USER.uid),
    [`membros.${DB_USER.uid}`]: firebase.firestore.FieldValue.delete(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
  const snap = await _db.collection('fichas')
    .where('userId', '==', DB_USER.uid)
    .where('campanhaId', '==', campanhaId)
    .get();
  if (!snap.empty) {
    const batch = _db.batch();
    snap.docs.forEach(d => batch.update(d.ref, {
      campanhaId: null,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    }));
    await batch.commit();
  }
}
