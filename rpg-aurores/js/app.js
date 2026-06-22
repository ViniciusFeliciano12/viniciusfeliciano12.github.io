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

  const _hUid = typeof window.headerCacheUid === 'function' ? window.headerCacheUid() : null;
  const perfil = _hUid !== user.uid ? await dbGetUser(user.uid).catch(() => null) : null;
  const donoLabel = await _resolverNomeDono(ficha);

  _esconderOverlay();
  _atualizarBarraUsuario(user, perfil, ficha.user_id !== user.uid ? donoLabel : null);

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

  // ── Listener em tempo real para o GM (ou participante) ver atualizações ao vivo ──
  dbListenFicha(_FICHA_ID, (fichaId, fichaRemota) => {
    if (!fichaRemota) return;
    if (fichaRemota.lastEditedBy === _SESSION_ID) return; // eco do próprio save
    const f = fichas.find(f => f.id === fichaId);
    if (f) Object.assign(f, fichaRemota);
    preencherFicha(fichaId, fichaRemota.dados);
    const tabText = document.querySelector(`.tab-btn[data-id="${fichaId}"] .tab-name-text`);
    if (tabText) tabText.textContent = fichaRemota.nome;
    mostrarToast('↻ Ficha atualizada ao vivo');
  });
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

  // Oculta a seção de segredos para jogadores que não são donos nem mestre da campanha
  c.querySelectorAll('.lore-card-secret').forEach(el => {
    el.style.display = 'none';
  });

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
      // Jogador sem fichas no servidor → migra do localStorage (migração única)
      carregarFichas();
      fichas.forEach(f => { f.user_id = user.uid; });
      await Promise.all(fichas.map(f => dbCreateFicha(f).catch(() => { })));
    }
    // GM visualizando jogador sem fichas → fichas fica vazio
  } catch (e) {
    console.warn('Firestore indisponível:', e);
    if (!DB_IS_GM) carregarFichas(); // fallback local somente offline
  }

  // Só busca perfil no Firestore se não há cache válido para este usuário
  // (primeiro acesso na aba, após logout, ou nova aba). Em navegação normal,
  // o header usa o sessionStorage e não precisa de chamada extra ao Firebase.
  const _hUid = typeof window.headerCacheUid === 'function' ? window.headerCacheUid() : null;
  const perfil = _hUid !== user.uid ? await dbGetUser(user.uid).catch(() => null) : null;

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
  if (typeof window._onAbaAtivada === 'function') window._onAbaAtivada(abaAtiva);

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

function _atualizarBarraUsuario(user, perfil = null, jogadorCtx = null) {
  if (typeof headerUpdate === 'function') {
    headerUpdate(user, perfil, typeof DB_IS_GM !== 'undefined' && DB_IS_GM, jogadorCtx);
  }
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

// Chamado por headerLogout() após dbLogout() — cleanup específico da página de fichas
window._onHeaderLogout = function () {
  fichas = [];
  localStorage.removeItem(STORAGE_KEY);
  document.getElementById('tabs-content-area').innerHTML = '';
  renderTabs();
  const lbl = document.getElementById('sync-status-label');
  if (lbl) lbl.textContent = '💾 Dados salvos localmente no navegador';
  _mostrarFormLogin();
};

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

/* ═══ CAMPANHA — DISPLAY E VINCULAR ══════════════════════════ */

// Atualiza o indicador de campanha no export-bar para a ficha ativa
function _atualizarDisplayCampanha(fichaId) {
  const labelEl  = document.getElementById('ficha-camp-label');
  const textEl   = document.getElementById('ficha-camp-text');
  const btnEl    = document.getElementById('btn-vincular-camp');
  if (!labelEl) return;

  // Oculta para GM (não vincula fichas de outros) ou modo de leitura
  if (DB_IS_GM || _modoLeitura || !dbConfigured()) {
    labelEl.style.display = 'none';
    if (btnEl) btnEl.style.display = 'none';
    return;
  }

  const f = getFicha(fichaId);
  if (!f) return;

  labelEl.style.display = 'inline-flex';
  if (f.campanhaId) {
    textEl.textContent = 'Vinculada a uma campanha';
    if (btnEl) btnEl.style.display = 'none';
  } else {
    textEl.textContent = 'Livre — sem campanha';
    if (btnEl) btnEl.style.display = 'inline-flex';
  }
}

// Hook chamado pelo sheet.js ao ativar uma aba
window._onAbaAtivada = function (id) {
  _atualizarDisplayCampanha(id);
};

/* ─── Modal: Vincular ficha à campanha ──────────────────────── */
let _vincularCampSelecionada = null;

async function abrirModalVincular() {
  _vincularCampSelecionada = null;
  const btn    = document.getElementById('btn-confirmar-vincular');
  const errEl  = document.getElementById('modal-vincular-error');
  const listEl = document.getElementById('modal-vincular-list');
  if (btn)   btn.disabled = true;
  if (errEl) errEl.style.display = 'none';
  if (listEl) listEl.innerHTML = '<p style="color:var(--ink-soft);font-size:13px;padding:8px 0">Carregando campanhas…</p>';
  document.getElementById('modal-vincular-camp').classList.add('open');

  try {
    const campanhas = await dbGetCampanhasJogador();
    const f = getFicha(abaAtiva);
    // Exclui a campanha que já está vinculada (se houver)
    const disponiveis = campanhas.filter(c => c.id !== f?.campanhaId);

    if (!disponiveis.length) {
      listEl.innerHTML = campanhas.length
        ? '<p style="color:var(--ink-soft);font-size:13px;text-align:center">Esta ficha já está na única campanha que você participa.</p>'
        : '<p style="color:var(--ink-soft);font-size:13px;text-align:center">Você ainda não está em nenhuma campanha. <a href="../campanha/">Ver campanhas →</a></p>';
      return;
    }

    listEl.innerHTML = disponiveis.map(c => `
      <label class="vincular-camp-opt" data-id="${c.id}">
        <input type="radio" name="vincular-camp-pick" value="${c.id}"
               style="position:absolute;opacity:0;width:0;height:0"
               onchange="_selecionarVincularCamp(this)">
        <div class="vincular-camp-radio"></div>
        <div>
          <div class="vincular-camp-nome">${c.nome}</div>
          <div class="vincular-camp-status">${c.status}</div>
        </div>
      </label>`).join('');
  } catch (e) {
    if (listEl) listEl.innerHTML = '<p style="color:var(--crimson);font-size:13px">Erro ao carregar campanhas.</p>';
  }
}

function _selecionarVincularCamp(radio) {
  _vincularCampSelecionada = radio.value;
  document.querySelectorAll('.vincular-camp-opt').forEach(o => {
    o.classList.toggle('vincular-camp-opt--selected', o.dataset.id === _vincularCampSelecionada);
  });
  const btn = document.getElementById('btn-confirmar-vincular');
  if (btn) btn.disabled = false;
}

function fecharModalVincular() {
  document.getElementById('modal-vincular-camp').classList.remove('open');
  _vincularCampSelecionada = null;
}

async function confirmarVincular() {
  if (!_vincularCampSelecionada || !abaAtiva) return;
  const btn   = document.getElementById('btn-confirmar-vincular');
  const errEl = document.getElementById('modal-vincular-error');
  btn.disabled = true;
  btn.textContent = 'Vinculando…';
  if (errEl) errEl.style.display = 'none';
  try {
    await dbVincularFicha(abaAtiva, _vincularCampSelecionada);
    const f = getFicha(abaAtiva);
    if (f) f.campanhaId = _vincularCampSelecionada;
    fecharModalVincular();
    mostrarToast('✓ Ficha vinculada à campanha!');
    _atualizarDisplayCampanha(abaAtiva);
  } catch (e) {
    if (errEl) { errEl.textContent = e.message || 'Erro ao vincular.'; errEl.style.display = 'block'; }
    btn.disabled = false;
  } finally {
    btn.textContent = 'Vincular';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('modal-vincular-camp')?.addEventListener('click', function (e) {
    if (e.target === this) fecharModalVincular();
  });
});

initApp();
