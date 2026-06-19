/* ═══════════════════════════════════════════════════════════════
   FIREBASE — Auth + Firestore
   Depende de: firebase-config.js (firebaseConfig)
   SDK: firebase-app-compat, firebase-auth-compat, firebase-firestore-compat
═══════════════════════════════════════════════════════════════ */

let _auth = null;
let _db   = null;
let _unsubscribeListen = null;

let DB_USER  = null;
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
  _db   = firebase.firestore();
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
  } catch (_) {}
}

// Busca perfil de um usuário pelo uid (GM pode ler qualquer um)
async function dbGetUser(uid) {
  try {
    const doc = await _db.collection('users').doc(uid).get();
    return doc.exists ? { uid: doc.id, ...doc.data() } : null;
  } catch (_) { return null; }
}

// Lista todos os jogadores registrados (GM only)
async function dbListUsers() {
  const snap = await _db.collection('users').orderBy('email').get();
  return snap.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
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
  DB_USER  = null;
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
    userId:    ficha.user_id || DB_USER.uid,
    nome:      ficha.nome,
    dados:     ficha.dados || {},
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
}

// Atualiza uma ficha existente (merge para não sobrescrever createdAt)
async function dbSaveFicha(ficha) {
  if (!DB_USER) return;
  await _db.collection('fichas').doc(ficha.id).set({
    userId:       ficha.user_id || DB_USER.uid,
    nome:         ficha.nome,
    dados:        ficha.dados,
    lastEditedBy: _SESSION_ID,
    updatedAt:    firebase.firestore.FieldValue.serverTimestamp(),
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

// ─── Helpers ──────────────────────────────────────────────────

function _docToFicha(doc) {
  const d = doc.data();
  return { id: doc.id, user_id: d.userId, nome: d.nome, dados: d.dados || {}, lastEditedBy: d.lastEditedBy || null };
}
