// ── Utilitários ────────────────────────────────────────────
function toggleSenha(inputId, btn) {
  const inp = document.getElementById(inputId);
  const reveal = inp.type === 'password';
  inp.type = reveal ? 'text' : 'password';
  btn.classList.toggle('revelado', reveal);
  btn.title = reveal ? 'Ocultar senha' : 'Mostrar senha';
}

function _msg(elId, tipo, texto) {
  const el = document.getElementById(elId);
  el.className = 'perfil-msg ' + tipo;
  el.textContent = texto;
}
function _clearMsg(elId) {
  const el = document.getElementById(elId);
  el.className = 'perfil-msg';
  el.textContent = '';
}

function _setBusy(btnId, busy) {
  const btn = document.getElementById(btnId);
  if (btn) btn.disabled = busy;
}

// ── Avatar ─────────────────────────────────────────────────
let _avatarDataUrl = null; // null = sem mudança, '' = remover, 'data:...' = nova foto

function _atualizarPreviewAvatar(src, inicial) {
  const circulo = document.getElementById('avatar-preview');
  const btnRemover = document.getElementById('btn-remover-foto');
  if (src) {
    circulo.innerHTML = '<img src="' + src + '" alt="">';
    if (btnRemover) btnRemover.disabled = false;
  } else {
    circulo.innerHTML = '<span id="avatar-inicial">' + (inicial || '?') + '</span>';
    if (btnRemover) btnRemover.disabled = true;
  }
}

document.getElementById('input-foto').addEventListener('change', async function (e) {
  const file = e.target.files[0];
  if (!file) return;
  if (file.size > 8 * 1024 * 1024) {
    _msg('msg-perfil', 'erro', 'Imagem muito grande. Escolha uma imagem menor que 8 MB.');
    this.value = '';
    return;
  }
  try {
    _avatarDataUrl = await _comprimirImagem(file);
    _atualizarPreviewAvatar(_avatarDataUrl, null);
    _clearMsg('msg-perfil');
  } catch (err) {
    _msg('msg-perfil', 'erro', 'Erro ao processar imagem: ' + err.message);
  }
  this.value = '';
});

function removerFoto() {
  _avatarDataUrl = '';
  const inicial = document.getElementById('perfil-username').value.trim()[0]?.toUpperCase()
    || (DB_USER?.email || '?')[0].toUpperCase();
  _atualizarPreviewAvatar('', inicial);
}

function _comprimirImagem(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Falha ao ler o arquivo.'));
    reader.onload = function (e) {
      const img = new Image();
      img.onerror = () => reject(new Error('Arquivo não é uma imagem válida.'));
      img.onload = function () {
        const canvas = document.createElement('canvas');
        canvas.width = 120;
        canvas.height = 120;
        const ctx = canvas.getContext('2d');
        const size = Math.min(img.width, img.height);
        const ox = (img.width - size) / 2;
        const oy = (img.height - size) / 2;
        ctx.drawImage(img, ox, oy, size, size, 0, 0, 120, 120);
        resolve(canvas.toDataURL('image/jpeg', 0.78));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// ── Salvar Perfil ──────────────────────────────────────────
async function salvarPerfil() {
  _clearMsg('msg-perfil');
  const username = document.getElementById('perfil-username').value.trim();
  const dados = { username };
  if (_avatarDataUrl !== null) dados.avatarUrl = _avatarDataUrl;

  _setBusy('btn-salvar-perfil', true);
  try {
    await firebase.firestore().collection('users').doc(DB_USER.uid).set(dados, { merge: true });
    _avatarDataUrl = null;

    const perfilAtualizado = await dbGetUser(DB_USER.uid).catch(() => null);
    _atualizarTopbar(perfilAtualizado, DB_USER);

    _msg('msg-perfil', 'ok', 'Perfil salvo com sucesso!');
  } catch (e) {
    _msg('msg-perfil', 'erro', e.message || 'Erro ao salvar perfil.');
  } finally {
    _setBusy('btn-salvar-perfil', false);
  }
}

// ── Trocar Senha ───────────────────────────────────────────
async function trocarSenha() {
  _clearMsg('msg-senha');
  const atual = document.getElementById('senha-atual').value;
  const nova = document.getElementById('senha-nova').value;
  const conf = document.getElementById('senha-nova-conf').value;

  if (!atual || !nova || !conf) {
    _msg('msg-senha', 'erro', 'Preencha todos os campos.'); return;
  }
  if (nova.length < 6) {
    _msg('msg-senha', 'erro', 'A nova senha deve ter ao menos 6 caracteres.'); return;
  }
  if (nova !== conf) {
    _msg('msg-senha', 'erro', 'A nova senha e a confirmação não coincidem.'); return;
  }

  _setBusy('btn-trocar-senha', true);
  try {
    const auth = firebase.auth();
    const cred = firebase.auth.EmailAuthProvider.credential(DB_USER.email, atual);
    await auth.currentUser.reauthenticateWithCredential(cred);
    await auth.currentUser.updatePassword(nova);
    document.getElementById('senha-atual').value = '';
    document.getElementById('senha-nova').value = '';
    document.getElementById('senha-nova-conf').value = '';
    _msg('msg-senha', 'ok', 'Senha alterada com sucesso!');
  } catch (e) {
    const mensagem = e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential'
      ? 'Senha atual incorreta.'
      : e.code === 'auth/weak-password'
        ? 'A nova senha é muito fraca.'
        : e.message || 'Erro ao trocar senha.';
    _msg('msg-senha', 'erro', mensagem);
  } finally {
    _setBusy('btn-trocar-senha', false);
  }
}

// ── Modal de Exclusão ──────────────────────────────────────
function abrirModalExcluir() {
  document.getElementById('excluir-senha').value = '';
  _clearMsg('msg-excluir');
  document.getElementById('modal-excluir').classList.add('open');
}

function fecharModalExcluir() {
  document.getElementById('modal-excluir').classList.remove('open');
}

async function confirmarExcluir() {
  _clearMsg('msg-excluir');
  const senha = document.getElementById('excluir-senha').value;
  if (!senha) { _msg('msg-excluir', 'erro', 'Digite sua senha para confirmar.'); return; }

  _setBusy('btn-confirmar-excluir', true);
  try {
    const auth = firebase.auth();
    const db = firebase.firestore();
    const uid = DB_USER.uid;
    const cred = firebase.auth.EmailAuthProvider.credential(DB_USER.email, senha);
    await auth.currentUser.reauthenticateWithCredential(cred);
    // Remove fichas
    const snap = await db.collection('fichas').where('userId', '==', uid).get();
    if (!snap.empty) {
      const batch = db.batch();
      snap.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();
    }
    // Remove perfil
    await db.collection('users').doc(uid).delete().catch(() => { });
    // Deleta conta
    await auth.currentUser.delete();
    localStorage.clear();
    window.location.href = '../ficha/';
  } catch (e) {
    const mensagem = e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential'
      ? 'Senha incorreta.'
      : e.message || 'Erro ao excluir conta.';
    _msg('msg-excluir', 'erro', mensagem);
    _setBusy('btn-confirmar-excluir', false);
  }
}

// Fecha modal ao clicar fora
document.getElementById('modal-excluir').addEventListener('click', function (e) {
  if (e.target === this) fecharModalExcluir();
});


function _atualizarTopbar(perfil, user) {
  if (typeof headerUpdate === 'function') headerUpdate(user, perfil, DB_IS_GM);
}

// ── Inicialização ──────────────────────────────────────────
async function initPerfil() {
  if (typeof dbConfigured === 'undefined' || !dbConfigured()) {
    window.location.href = '../ficha/'; return;
  }
  try {
    const user = await dbInit();
    if (!user) { window.location.href = '../ficha/'; return; }

    // dbRegisterUser() em dbInit não é aguardado; esperá-lo aqui garante que o
    // Firestore SDK já estabeleceu conexão com o servidor antes da leitura source:server.
    await dbRegisterUser().catch(() => { });

    const perfil = await dbGetUser(user.uid).catch(() => null);
    const inicial = (perfil?.username || user.email || '?')[0].toUpperCase();

    // Barra de usuário via header singleton
    _atualizarTopbar(perfil, user);

    // Preenche formulário com dados salvos
    document.getElementById('perfil-username').value = perfil?.username || '';
    _atualizarPreviewAvatar(perfil?.avatarUrl || '', inicial);

    document.getElementById('perfil-loading').style.display = 'none';
    document.getElementById('perfil-content').style.display = 'block';
  } catch (e) {
    document.getElementById('perfil-loading').textContent = 'Erro ao carregar perfil: ' + e.message;
  }
}

// Cleanup específico da página após headerLogout() chamar dbLogout()
window._onHeaderLogout = function () {
  window.location.href = '../ficha/';
};

initPerfil();
