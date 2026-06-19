/* ═══════════════════════════════════════════════════════════════
   APP — inicialização e autenticação Firebase
═══════════════════════════════════════════════════════════════ */

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
    await _carregarEIniciar(user);
  } catch (e) {
    console.error('Erro na inicialização:', e);
    _mostrarFormLogin();
  }
}

async function _carregarEIniciar(user) {
  try {
    const remotas = await dbLoadFichas();
    if (remotas.length) {
      fichas = remotas;
    } else {
      carregarFichas();
      fichas.forEach(f => { f.user_id = user.uid; });
      await Promise.all(fichas.map(f => dbCreateFicha(f).catch(() => {})));
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fichas));
  } catch (e) {
    console.warn('Firestore indisponível, usando localStorage:', e);
    carregarFichas();
  }

  _esconderOverlay();
  _atualizarBarraUsuario(user);

  const lbl = document.getElementById('sync-status-label');
  if (lbl) lbl.textContent = '☁ Sincronizado com a nuvem · tempo real ativo';

  abaAtiva = fichas[0].id;
  renderTabs();
  renderConteudo();

  dbListenFichas(_aplicarMudancaRemota);
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
    fichas.push(fichaRemota);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fichas));
    renderTabs();

    // Cria o painel de conteúdo da ficha (sem isso, clicar na aba deixa tela em branco)
    const area = document.getElementById('tabs-content-area');
    const div = document.createElement('div');
    div.className = 'tab-content-ficha';
    div.id = 'content-' + fichaRemota.id;
    div.style.display = 'none';
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

  const ehProprietario = fichaRemota.user_id === DB_USER?.uid;

  if (fichaId === abaAtiva && !ehProprietario) {
    preencherFicha(fichaId, fichaRemota.dados);
    mostrarToast('↻ Ficha atualizada ao vivo');
  } else if (fichaId !== abaAtiva) {
    mostrarToast('↻ ' + fichaRemota.nome + ' atualizou sua ficha');
  }
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

function _atualizarBarraUsuario(user) {
  const bar = document.getElementById('user-bar');
  bar.style.display = 'flex';
  document.getElementById('user-email-display').textContent = user.email;
  document.getElementById('gm-badge').style.display = (typeof DB_IS_GM !== 'undefined' && DB_IS_GM) ? 'inline' : 'none';
}

function authSwitchTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.getElementById('auth-form-login').style.display  = tab === 'login'  ? 'block' : 'none';
  document.getElementById('auth-form-signup').style.display = tab === 'signup' ? 'block' : 'none';
  document.getElementById('auth-error').style.display = 'none';
}

async function authLogin() {
  const email = document.getElementById('auth-email').value.trim();
  const pass  = document.getElementById('auth-password').value;
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
  const pass  = document.getElementById('auth-signup-password').value;
  if (!email || !pass) { _authErro('Preencha e-mail e senha.'); return; }
  if (pass.length < 6) { _authErro('Senha deve ter ao menos 6 caracteres.'); return; }
  _authBotoes(true);
  try {
    const user = await dbSignup(email, pass);
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

initApp();
