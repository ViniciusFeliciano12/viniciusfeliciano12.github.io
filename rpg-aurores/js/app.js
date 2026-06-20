/* ═══════════════════════════════════════════════════════════════
   APP — inicialização e autenticação Firebase
═══════════════════════════════════════════════════════════════ */

// UID do jogador a ser visualizado pelo Mestre (param ?jogador=UID)
const _JOGADOR_UID = new URLSearchParams(location.search).get('jogador');
// ID de uma ficha específica a ser aberta (param ?ficha=ID)
const _FICHA_ID = new URLSearchParams(location.search).get('ficha');

// true quando o usuário está apenas visualizando a ficha de outro jogador
let _modoLeitura = false;

document.getElementById('btn-nova-aba').addEventListener('click', novaAba);

async function initApp() {
  if (typeof dbConfigured === 'undefined' || !dbConfigured()) {
    carregarFichas();
    abaAtiva = fichas[0].id;
    renderTabs();
    renderConteudo();
    return;
  }

  _mostrarOverlay(true);

  try {
    const user = await dbInit();
    if (!user) { _mostrarFormLogin(); return; }
    if (_FICHA_ID) {
      await _carregarFichaEspecifica(user);
    } else {
      await _carregarEIniciar(user);
    }
  } catch (e) {
    console.error('Erro na inicialização:', e);
    _mostrarFormLogin();
  }
}

// Abre uma ficha específica por ID, determinando permissão de edição
async function _carregarFichaEspecifica(user) {
  const ficha = await dbGetFichaById(_FICHA_ID).catch(() => null);
  if (!ficha) {
    _esconderOverlay();
    document.getElementById('tabs-content-area').innerHTML =
      '<p style="padding:3rem 2rem;color:var(--ink-soft);text-align:center">Ficha não encontrada ou acesso negado.</p>';
    _atualizarBarraUsuario(user);
    return;
  }

  // Determina permissão: dono e adm do site → edição; GM da campanha → edição; outros participantes → leitura
  let podeEditar = ficha.user_id === user.uid || DB_IS_GM;

  if (!podeEditar && ficha.campanhaId) {
    const camp = await dbGetCampanha(ficha.campanhaId).catch(() => null);
    if (camp) {
      if (camp.gmId === user.uid) podeEditar = true;
      // participante mas não GM → modo leitura (Firestore já bloqueou o update)
    }
  }

  _modoLeitura = !podeEditar;

  fichas = [ficha];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(fichas));

  const perfil = await dbGetUser(user.uid).catch(() => null);
  const donoLabel = await _resolverNomeDono(ficha);

  _esconderOverlay();
  _atualizarBarraUsuario(user, perfil);

  // Na barra de contexto, mostra de quem é a ficha quando é de outro jogador
  if (ficha.user_id !== user.uid) {
    const ctx = document.getElementById('jogador-ctx');
    if (ctx) { ctx.style.display = 'inline'; ctx.textContent = donoLabel; }
  }

  // Esconde export-bar, nova aba e aba-delete quando não é a própria ficha ou é leitura
  if (_modoLeitura || ficha.user_id !== user.uid) {
    document.getElementById('export-bar').style.display = 'none';
    document.getElementById('btn-nova-aba').style.display = 'none';
  }

  abaAtiva = ficha.id;
  renderTabs();
  renderConteudo();

  if (_modoLeitura) {
    _aplicarModoLeitura(ficha.id, donoLabel);
  }
}

async function _resolverNomeDono(ficha) {
  try {
    const u = await dbGetUser(ficha.user_id);
    return u?.username || u?.email || ficha.user_id.slice(0, 8) + '…';
  } catch {
    return ficha.user_id.slice(0, 8) + '…';
  }
}

// Desabilita todos os campos de dados e mostra banner de modo leitura
function _aplicarModoLeitura(fichaId, donoLabel) {
  const c = document.getElementById('content-' + fichaId);
  if (!c) return;

  c.querySelectorAll('input[data-field], select[data-field], textarea[data-field]').forEach(el => {
    el.disabled = true;
  });
  c.querySelectorAll('input.objeto-input, .btn-add-obj, .btn-rm-obj').forEach(el => {
    el.disabled = true;
    if (el.tagName === 'BUTTON') el.style.visibility = 'hidden';
  });

  const fotoArea = c.querySelector('.foto-area');
  if (fotoArea) { fotoArea.style.pointerEvents = 'none'; fotoArea.style.cursor = 'default'; }
  const fotoBtn = c.querySelector('.foto-btn');
  if (fotoBtn) fotoBtn.style.display = 'none';

  const wrap = c.querySelector('.sheet-wrap');
  if (wrap) {
    const banner = document.createElement('div');
    banner.className = 'readonly-banner';
    banner.innerHTML = `👁 Ficha de <strong>${donoLabel}</strong> — modo somente leitura`;
    wrap.insertBefore(banner, wrap.firstChild);
  }

  // Esconde botão de deletar aba
  document.querySelectorAll('.tab-del').forEach(b => b.style.display = 'none');
}

async function _carregarEIniciar(user) {
  // Mestre sem filtro de jogador → painel de controle
  if (DB_IS_GM && !_JOGADOR_UID) {
    window.location.href = '../painel/';
    return;
  }

  try {
    const remotas = await dbLoadFichas(_JOGADOR_UID);
    if (remotas.length) {
      fichas = remotas;
    } else if (!DB_IS_GM) {
      // Jogador sem fichas no servidor → migra do localStorage
      carregarFichas();
      fichas.forEach(f => { f.user_id = user.uid; });
      await Promise.all(fichas.map(f => dbCreateFicha(f).catch(() => { })));
    }
    // GM visualizando jogador sem fichas → fichas fica vazio
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fichas));
  } catch (e) {
    console.warn('Firestore indisponível, usando localStorage:', e);
    if (!DB_IS_GM) carregarFichas();
  }

  // Lê perfil após carregar fichas — garante que o token de auth do Firestore
  // já está propagado antes desta leitura da coleção users.
  const perfil = await dbGetUser(user.uid).catch(() => null);

  _esconderOverlay();
  _atualizarBarraUsuario(user, perfil);
  _mostrarContextoJogador();

  const lbl = document.getElementById('sync-status-label');
  if (lbl) lbl.textContent = '☁ Sincronizado com a nuvem · tempo real ativo';

  const loadedIds = new Set(fichas.map(f => f.id));

  if (!fichas.length) {
    renderTabs();
    const area = document.getElementById('tabs-content-area');
    area.innerHTML = '<p id="msg-sem-fichas" style="padding:3rem 2rem; color:var(--ink-soft); text-align:center; font-style:italic;">Este jogador ainda não criou nenhuma ficha.</p>';
    dbListenFichas(_aplicarMudancaRemota, _JOGADOR_UID, loadedIds);
    return;
  }

  abaAtiva = fichas[0].id;
  renderTabs();
  renderConteudo();

  dbListenFichas(_aplicarMudancaRemota, _JOGADOR_UID, loadedIds);
}

async function _mostrarContextoJogador() {
  const ctx = document.getElementById('jogador-ctx');
  if (!ctx || !_JOGADOR_UID || !DB_IS_GM) return;
  ctx.style.display = 'inline';
  ctx.textContent = 'Carregando…';
  const player = await dbGetUser(_JOGADOR_UID);
  ctx.textContent = player?.username || player?.email || (_JOGADOR_UID.slice(0, 8) + '…');
}

function _aplicarMudancaRemota(fichaId, fichaRemota) {
  const idx = fichas.findIndex(f => f.id === fichaId);

  if (!fichaRemota) {
    if (idx === -1) return;
    fichas.splice(idx, 1);
    document.getElementById('content-' + fichaId)?.remove();
    if (abaAtiva === fichaId) abaAtiva = fichas[0]?.id;
    renderTabs();
    if (abaAtiva) ativarAba(abaAtiva);
    mostrarToast('↻ Ficha removida por outro dispositivo');
    return;
  }

  if (idx === -1) {
    const eraPrimeira = fichas.length === 0;
    fichas.push(fichaRemota);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fichas));

    // Se era o estado vazio, limpa a mensagem e ativa esta ficha como aba corrente
    if (eraPrimeira) {
      document.getElementById('msg-sem-fichas')?.remove();
      abaAtiva = fichaRemota.id;
    }

    renderTabs();

    const area = document.getElementById('tabs-content-area');
    const div = document.createElement('div');
    div.className = 'tab-content-ficha';
    div.id = 'content-' + fichaRemota.id;
    div.style.display = eraPrimeira ? 'block' : 'none';
    div.innerHTML = criarFichaHTML(fichaRemota.id);
    area.appendChild(div);
    preencherFicha(fichaRemota.id, fichaRemota.dados);
    bindFichaEvents(fichaRemota.id);
    atualizarLabelPostura(fichaRemota.id);
    setTimeout(() => atualizarTodasPericias(fichaRemota.id), 0);

    mostrarToast('↻ Nova ficha: ' + fichaRemota.nome);
    return;
  }

  fichas[idx] = { ...fichas[idx], ...fichaRemota };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(fichas));

  const tabText = document.querySelector(`.tab-btn[data-id="${fichaId}"] .tab-name-text`);
  if (tabText) tabText.textContent = fichaRemota.nome;

  // Verdadeiro apenas quando esta aba/janela foi quem salvou a mudança.
  // Usa _SESSION_ID (não o UID) para que dois browsers com a mesma conta
  // ainda recebam as mudanças um do outro.
  const editadoPorMim = fichaRemota.lastEditedBy === _SESSION_ID;

  if (fichaId === abaAtiva && !editadoPorMim) {
    preencherFicha(fichaId, fichaRemota.dados);
    mostrarToast('↻ Ficha atualizada ao vivo');
  } else if (fichaId !== abaAtiva && !editadoPorMim) {
    mostrarToast('↻ ' + fichaRemota.nome + ' foi atualizada');
  }
}

/* ═══ UTILITÁRIOS ══════════════════════════════════════════════ */
function toggleSenha(inputId, btn) {
  const inp = document.getElementById(inputId);
  const reveal = inp.type === 'password';
  inp.type = reveal ? 'text' : 'password';
  btn.classList.toggle('revelado', reveal);
  btn.title = reveal ? 'Ocultar senha' : 'Mostrar senha';
}

/* ═══ AUTH UI ═════════════════════════════════════════════════ */
function _mostrarOverlay(loading) {
  document.getElementById('auth-overlay').style.display = 'flex';
  document.getElementById('auth-loading-init').style.display = loading ? 'block' : 'none';
  document.getElementById('auth-forms').style.display = loading ? 'none' : 'block';
}

function _mostrarFormLogin() {
  _mostrarOverlay(false);
  document.getElementById('auth-error').style.display = 'none';
}

function _esconderOverlay() {
  document.getElementById('auth-overlay').style.display = 'none';
}

function _atualizarBarraUsuario(user, perfil = null) {
  const bar = document.getElementById('user-bar');
  bar.style.display = 'flex';
  const displayName = perfil?.username || user.email;
  document.getElementById('user-email-display').textContent = displayName;

  const avatarMini = document.getElementById('user-avatar-mini');
  if (avatarMini) {
    if (perfil?.avatarUrl) {
      avatarMini.innerHTML = '<img src="' + perfil.avatarUrl + '" alt="">';
    } else {
      avatarMini.textContent = displayName[0].toUpperCase();
    }
  }

  const isGM = typeof DB_IS_GM !== 'undefined' && DB_IS_GM;
  document.getElementById('gm-badge').style.display = isGM ? 'inline' : 'none';
  const btnPainel = document.getElementById('btn-painel');
  if (btnPainel) btnPainel.style.display = isGM ? 'inline-flex' : 'none';
  const btnPerfil = document.getElementById('btn-perfil');
  if (btnPerfil) btnPerfil.style.display = 'inline-flex';
}

function authSwitchTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.getElementById('auth-form-login').style.display = tab === 'login' ? 'block' : 'none';
  document.getElementById('auth-form-signup').style.display = tab === 'signup' ? 'block' : 'none';
  document.getElementById('auth-error').style.display = 'none';
}

async function authLogin() {
  const email = document.getElementById('auth-email').value.trim();
  const pass = document.getElementById('auth-password').value;
  if (!email || !pass) { _authErro('Preencha e-mail e senha.'); return; }
  _authBotoes(true);
  try {
    const user = await dbLogin(email, pass);
    await _carregarEIniciar(user);
  } catch (e) {
    _authErro(e.message || 'Erro ao entrar.');
    _authBotoes(false);
  }
}

async function authSignup() {
  const email = document.getElementById('auth-signup-email').value.trim();
  const username = document.getElementById('auth-signup-username').value.trim();
  const pass = document.getElementById('auth-signup-password').value;
  if (!email || !pass) { _authErro('Preencha e-mail e senha.'); return; }
  if (pass.length < 6) { _authErro('Senha deve ter ao menos 6 caracteres.'); return; }
  _authBotoes(true);
  try {
    const user = await dbSignup(email, pass);
    if (username) await dbUpdateProfile({ username }).catch(() => { });
    await _carregarEIniciar(user);
  } catch (e) {
    _authErro(e.message || 'Erro ao criar conta.');
    _authBotoes(false);
  }
}

async function authLogout() {
  await dbLogout();
  fichas = [];
  localStorage.removeItem(STORAGE_KEY);
  document.getElementById('user-bar').style.display = 'none';
  document.getElementById('tabs-content-area').innerHTML = '';
  renderTabs();
  const lbl = document.getElementById('sync-status-label');
  if (lbl) lbl.textContent = '💾 Dados salvos localmente no navegador';
  _mostrarFormLogin();
}

function _authErro(msg) {
  const el = document.getElementById('auth-error');
  el.textContent = msg;
  el.style.display = 'block';
}

function _authBotoes(disabled) {
  ['auth-login-btn', 'auth-signup-btn'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.disabled = disabled;
  });
}

// Login e cadastro com Enter
['auth-email', 'auth-password'].forEach(id => {
  document.getElementById(id)?.addEventListener('keydown', e => { if (e.key === 'Enter') authLogin(); });
});
['auth-signup-email', 'auth-signup-username', 'auth-signup-password'].forEach(id => {
  document.getElementById(id)?.addEventListener('keydown', e => { if (e.key === 'Enter') authSignup(); });
});

initApp();
