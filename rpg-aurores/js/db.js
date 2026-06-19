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

// ─── Auth ─────────────────────────────────────────────────────

async function dbLogin(email, password) {
  _boot();
  const { user } = await _auth.signInWithEmailAndPassword(email, password);
  DB_USER = user;
  await _carregarPerfil();
  return DB_USER;
}

async function dbSignup(email, password) {
  _boot();
  const { user } = await _auth.createUserWithEmailAndPassword(email, password);
  DB_USER = user;
  return DB_USER;
}

async function dbLogout() {
  dbStopListen();
  await _auth.signOut();
  DB_USER  = null;
  DB_IS_GM = false;
}

// ─── CRUD ─────────────────────────────────────────────────────

async function dbLoadFichas() {
  let q = _db.collection('fichas').orderBy('createdAt');
  if (!DB_IS_GM) q = q.where('userId', '==', DB_USER.uid);
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
    userId:    ficha.user_id || DB_USER.uid,
    nome:      ficha.nome,
    dados:     ficha.dados,
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
function dbListenFichas(onRemoteChange) {
  dbStopListen();
  let q = _db.collection('fichas');
  if (!DB_IS_GM) q = q.where('userId', '==', DB_USER.uid);

  let primeiroSnapshot = true;

  _unsubscribeListen = q.onSnapshot(snapshot => {
    snapshot.docChanges().forEach(change => {
      // Ignorar escritas locais pendentes
      if (change.doc.metadata.hasPendingWrites) return;

      // No primeiro snapshot o Firestore dispara 'added' para todos os documentos
      // existentes — já carregados via dbLoadFichas(). Ignorar para evitar conflito.
      if (primeiroSnapshot && change.type === 'added') return;

      if (change.type === 'removed') {
        onRemoteChange(change.doc.id, null);
        return;
      }

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
  return { id: doc.id, user_id: d.userId, nome: d.nome, dados: d.dados || {} };
}
