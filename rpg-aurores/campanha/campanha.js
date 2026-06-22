/* ═══════════════════════════════════════════════════════════════
   CAMPANHAS — Lógica principal
   Depende de: db.js (dbInit, DB_USER, DB_IS_GM, dbLogin, dbSignup, dbLogout)
═══════════════════════════════════════════════════════════════ */

// ─── Estado ───────────────────────────────────────────────────

let _campanhasMinhas = [];
let _campanhasParticipo = [];
let _campanhasBuscadas = [];

let _perfilAtual = null;

let _campanhaAlvoId = null;
let _campanhaAlvoNome = '';
const _solicitacoesEnviadas = new Set();

// ─── Inicialização ────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  mostrarAuthOverlay(true);

  const user = await dbInit();

  if (user) {
    onLogin(user);
  } else {
    mostrarAuthOverlay(false);
  }

  // Tabs principais
  document.querySelectorAll('.camp-tab').forEach(btn => {
    btn.addEventListener('click', () => trocarTab(btn.dataset.tab));
  });

  // Modal nova campanha
  document.getElementById('btn-nova-camp').addEventListener('click', abrirModalNova);
  document.getElementById('btn-nova-camp-2')?.addEventListener('click', abrirModalNova);
  document.getElementById('btn-cancel-camp').addEventListener('click', fecharModalNova);
  document.getElementById('btn-criar-camp').addEventListener('click', criarCampanha);
  document.getElementById('modal-nova-camp').addEventListener('click', e => {
    if (e.target === e.currentTarget) fecharModalNova();
  });
  document.getElementById('inp-camp-nome').addEventListener('keydown', e => {
    if (e.key === 'Enter') criarCampanha();
  });

  // Modal solicitar entrada (ficha picker)
  document.getElementById('btn-cancel-entrar').addEventListener('click', fecharModalEntrar);
  document.getElementById('btn-confirmar-entrar').addEventListener('click', confirmarEntradaCampanha);
  document.getElementById('modal-entrar-camp').addEventListener('click', e => {
    if (e.target === e.currentTarget) fecharModalEntrar();
  });

  // Busca
  document.getElementById('btn-buscar-camp').addEventListener('click', buscarCampanha);
  document.getElementById('inp-busca-camp').addEventListener('keydown', e => {
    if (e.key === 'Enter') buscarCampanha();
  });
});

// ─── Auth helpers ─────────────────────────────────────────────

function mostrarAuthOverlay(loading) {
  const overlay = document.getElementById('auth-overlay');
  overlay.style.display = 'flex';
  document.getElementById('auth-loading-init').style.display = loading ? 'block' : 'none';
  document.getElementById('auth-forms').style.display = loading ? 'none' : 'block';
}

async function onLogin(user) {
  document.getElementById('auth-overlay').style.display = 'none';
  await dbRegisterUser().catch(() => { });
  _perfilAtual = await dbGetUser(user.uid).catch(() => null);
  if (typeof headerUpdate === 'function') headerUpdate(user, _perfilAtual, DB_IS_GM);
  _carregarPaineis();
}

async function authLogin() {
  const email = document.getElementById('auth-email').value.trim();
  const senha = document.getElementById('auth-password').value;
  const errEl = document.getElementById('auth-error');
  errEl.style.display = 'none';
  const btn = document.getElementById('auth-login-btn');
  btn.disabled = true;
  try {
    const user = await dbLogin(email, senha);
    onLogin(user);
  } catch (e) {
    errEl.textContent = _mensagemErro(e);
    errEl.style.display = 'block';
  } finally {
    btn.disabled = false;
  }
}

async function authSignup() {
  const email = document.getElementById('auth-signup-email').value.trim();
  const senha = document.getElementById('auth-signup-password').value;
  const errEl = document.getElementById('auth-error');
  errEl.style.display = 'none';
  const btn = document.getElementById('auth-signup-btn');
  btn.disabled = true;
  try {
    const user = await dbSignup(email, senha);
    onLogin(user);
  } catch (e) {
    errEl.textContent = _mensagemErro(e);
    errEl.style.display = 'block';
  } finally {
    btn.disabled = false;
  }
}

// Cleanup específico da página após headerLogout() chamar dbLogout()
window._onHeaderLogout = function () {
  location.reload();
};

function authSwitchTab(tab) {
  document.getElementById('auth-form-login').style.display = tab === 'login' ? 'block' : 'none';
  document.getElementById('auth-form-signup').style.display = tab === 'signup' ? 'block' : 'none';
  document.querySelectorAll('.auth-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.getElementById('auth-error').style.display = 'none';
}

function toggleSenha(id, btn) {
  const inp = document.getElementById(id);
  const revelado = inp.type === 'text';
  inp.type = revelado ? 'password' : 'text';
  btn.classList.toggle('revelado', !revelado);
}

function _mensagemErro(e) {
  const map = {
    'auth/user-not-found': 'E-mail não encontrado.',
    'auth/wrong-password': 'Senha incorreta.',
    'auth/invalid-email': 'E-mail inválido.',
    'auth/email-already-in-use': 'Este e-mail já está cadastrado.',
    'auth/weak-password': 'Senha muito fraca (mínimo 6 caracteres).',
    'auth/too-many-requests': 'Muitas tentativas. Tente mais tarde.',
    'auth/invalid-credential': 'E-mail ou senha incorretos.',
  };
  return map[e.code] || e.message || 'Erro desconhecido.';
}

// ─── Tabs ─────────────────────────────────────────────────────

function trocarTab(tab) {
  document.querySelectorAll('.camp-tab').forEach(b => {
    const ativo = b.dataset.tab === tab;
    b.classList.toggle('active', ativo);
    b.setAttribute('aria-selected', ativo ? 'true' : 'false');
  });
  const paineis = { minhas: 'panel-minhas', participo: 'panel-participo' };
  Object.entries(paineis).forEach(([key, id]) => {
    document.getElementById(id).style.display = key === tab ? 'block' : 'none';
  });
  document.getElementById('btn-nova-camp').style.display = tab === 'minhas' ? 'inline-block' : 'none';
}

// ─── Carregar dados ───────────────────────────────────────────

async function _carregarPaineis() {
  await Promise.all([_carregarMinhas(), _carregarParticipo()]);
}

async function _carregarMinhas() {
  setLoading('minhas', true);
  try {
    const snap = await _db.collection('campanhas')
      .where('gmId', '==', DB_USER.uid)
      .orderBy('createdAt', 'desc')
      .get();
    _campanhasMinhas = snap.docs.map(_docToCampanha);
    _renderizarGrid('grid-minhas', 'empty-minhas', _campanhasMinhas, true);
  } catch (e) {
    console.warn('[campanhas] Erro ao carregar minhas campanhas:', e);
    _renderizarGrid('grid-minhas', 'empty-minhas', [], true);
  } finally {
    setLoading('minhas', false);
  }
}

async function _carregarParticipo() {
  setLoading('participo', true);
  try {
    const snap = await _db.collection('campanhas')
      .where('jogadoresIds', 'array-contains', DB_USER.uid)
      .orderBy('createdAt', 'desc')
      .get();
    _campanhasParticipo = snap.docs.map(_docToCampanha);
    _renderizarGrid('grid-participo', 'empty-participo', _campanhasParticipo, false);
  } catch (e) {
    console.warn('[campanhas] Erro ao carregar campanhas que participo:', e);
    _renderizarGrid('grid-participo', 'empty-participo', [], false);
  } finally {
    setLoading('participo', false);
  }
}

function setLoading(tab, show) {
  document.getElementById('loading-' + tab).style.display = show ? 'block' : 'none';
}

// ─── Renderização ─────────────────────────────────────────────

function _renderizarGrid(gridId, emptyId, campanhas, isGM) {
  const grid = document.getElementById(gridId);
  const empty = document.getElementById(emptyId);
  if (!campanhas.length) {
    grid.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';
  grid.innerHTML = campanhas.map(c => _campCard(c, isGM)).join('');
}

function _campCard(c, isGM) {
  const statusLabel = { ativa: 'Ativa', pausada: 'Pausada', encerrada: 'Encerrada' }[c.status] || c.status;
  const meta = isGM
    ? `<span class="camp-meta-item"><span class="camp-meta-icon">👥</span>${c.jogadoresIds.length} jogador${c.jogadoresIds.length !== 1 ? 'es' : ''}</span>`
    : `<span class="camp-meta-item"><span class="camp-meta-icon">🧙</span>${_esc(c.gmUsername || c.gmEmail || 'Mestre')}</span>`;
  return `
    <div class="camp-card">
      <div class="camp-card-top">
        <h3 class="camp-name">${_esc(c.nome)}</h3>
        <span class="camp-status camp-status--${c.status}">${statusLabel}</span>
      </div>
      <p class="camp-desc">${_esc(c.descricao || 'Sem descrição.')}</p>
      <div class="camp-meta">${meta}</div>
      <div class="camp-card-footer">
        <span class="camp-system-tag">d100</span>
        <a href="detalhes/?id=${c.id}" class="btn-entrar">Entrar →</a>
      </div>
    </div>`;
}

// Card para resultados de busca (jogador ainda não é membro)
function _campCardBusca(c) {
  const statusLabel = { ativa: 'Ativa', pausada: 'Pausada', encerrada: 'Encerrada' }[c.status] || c.status;
  const jaMembro = _campanhasParticipo.some(p => p.id === c.id) || _campanhasMinhas.some(p => p.id === c.id);
  const pendente = _solicitacoesEnviadas.has(c.id);

  let acaoBtn;
  if (jaMembro) {
    acaoBtn = `<a href="detalhes/?id=${c.id}" class="btn-entrar">Entrar →</a>`;
  } else if (pendente) {
    acaoBtn = `<button class="btn-entrar btn-entrar--pendente" disabled>Solicitação enviada ✓</button>`;
  } else {
    acaoBtn = `<button class="btn-solicitar" onclick="abrirModalEntrar('${_esc(c.id)}','${_esc(c.nome).replace(/'/g, "\\'")}')">Solicitar entrada</button>`;
  }

  return `
    <div class="camp-card">
      <div class="camp-card-top">
        <h3 class="camp-name">${_esc(c.nome)}</h3>
        <span class="camp-status camp-status--${c.status}">${statusLabel}</span>
      </div>
      <p class="camp-desc">${_esc(c.descricao || 'Sem descrição.')}</p>
      <div class="camp-meta">
        <span class="camp-meta-item"><span class="camp-meta-icon">🧙</span>${_esc(c.gmUsername || c.gmEmail || 'Mestre')}</span>
      </div>
      <div class="camp-card-footer">
        <span class="camp-system-tag">d100</span>
        ${acaoBtn}
      </div>
    </div>`;
}

// ─── Modal nova campanha ──────────────────────────────────────

function abrirModalNova() {
  document.getElementById('inp-camp-nome').value = '';
  document.getElementById('inp-camp-desc').value = '';
  document.getElementById('camp-modal-error').style.display = 'none';
  document.getElementById('modal-nova-camp').classList.add('open');
  setTimeout(() => document.getElementById('inp-camp-nome').focus(), 50);
}

function fecharModalNova() {
  document.getElementById('modal-nova-camp').classList.remove('open');
}

async function criarCampanha() {
  const nome = document.getElementById('inp-camp-nome').value.trim();
  const desc = document.getElementById('inp-camp-desc').value.trim();
  const errEl = document.getElementById('camp-modal-error');
  const btn = document.getElementById('btn-criar-camp');
  if (!nome) {
    errEl.textContent = 'Informe um nome para a campanha.';
    errEl.style.display = 'block';
    document.getElementById('inp-camp-nome').focus();
    return;
  }
  errEl.style.display = 'none';
  btn.disabled = true;
  btn.textContent = 'Criando…';
  try {
    await _db.collection('campanhas').add({
      nome,
      descricao: desc,
      sistema: 'd100',
      status: 'ativa',
      gmId: DB_USER.uid,
      gmEmail: DB_USER.email,
      gmUsername: _perfilAtual?.username || null,
      jogadoresIds: [],
      membros: {},
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    fecharModalNova();
    mostrarToast('✓ Campanha criada!');
    await _carregarMinhas();
  } catch (e) {
    errEl.textContent = 'Erro ao criar campanha: ' + (e.message || 'tente novamente.');
    errEl.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Criar Campanha';
  }
}

// ─── Busca ────────────────────────────────────────────────────

async function buscarCampanha() {
  const nomeDaCampanha = document.getElementById('inp-busca-camp').value.trim();
  const resultados = document.getElementById('search-results');
  const barraDeCarregamento = document.getElementById('search-loading');
  const resultadoVazio = document.getElementById('search-empty');
  const buscaVazia = document.getElementById('value-empty');

  resultados.style.display = 'block';
  barraDeCarregamento.style.display = 'none';
  resultadoVazio.style.display = 'none';
  buscaVazia.style.display = 'none';
  document.getElementById('grid-busca').innerHTML = '';

  if (!nomeDaCampanha.length) {
    buscaVazia.style.display = 'block';
    return;
  }

  barraDeCarregamento.style.display = 'block';
  try {
    const snap = await _db.collection('campanhas')
      .where('nome', '==', nomeDaCampanha)
      .orderBy('createdAt', 'desc')
      .get();
    _campanhasBuscadas = snap.docs.map(_docToCampanha);
  } catch (e) {
    console.warn('[busca]', e);
    _campanhasBuscadas = [];
  } finally {
    barraDeCarregamento.style.display = 'none';
    if (!_campanhasBuscadas.length) {
      resultadoVazio.style.display = 'block';
    } else {
      const grid = document.getElementById('grid-busca');
      grid.innerHTML = _campanhasBuscadas.map(c => _campCardBusca(c)).join('');
    }
  }
}

// ─── Modal solicitar entrada (ficha picker) ───────────────────

async function abrirModalEntrar(campanhaId, nomeCampanha) {
  _campanhaAlvoId = campanhaId;
  _campanhaAlvoNome = nomeCampanha;
  document.getElementById('modal-entrar-titulo').textContent = 'Solicitar: ' + nomeCampanha;
  document.getElementById('modal-entrar-error').style.display = 'none';
  document.getElementById('btn-confirmar-entrar').disabled = true;
  document.getElementById('modal-entrar-camp').classList.add('open');
  await _carregarFichasDisponiveis();
}

function fecharModalEntrar() {
  document.getElementById('modal-entrar-camp').classList.remove('open');
  _campanhaAlvoId = null;
}

async function _carregarFichasDisponiveis() {
  const loading = document.getElementById('ficha-picker-loading');
  const empty = document.getElementById('ficha-picker-empty');
  const list = document.getElementById('ficha-picker-list');

  loading.style.display = 'block';
  empty.style.display = 'none';
  list.innerHTML = '';

  try {
    const fichas = await dbLoadFichas();
    const disponiveis = fichas.filter(f => !f.campanhaId);
    loading.style.display = 'none';

    if (!disponiveis.length) {
      empty.style.display = 'block';
      empty.innerHTML = fichas.length
        ? '<p>Todas as suas fichas já estão vinculadas a outras campanhas.</p>'
        : '<p>Você ainda não tem fichas criadas.</p><a href="../ficha/" class="btn-nova-camp-inline" style="display:inline-block;text-decoration:none;margin-top:12px;">Criar ficha →</a>';
      return;
    }

    list.innerHTML = disponiveis.map(f => `
      <label class="ficha-option" data-id="${_esc(f.id)}" onclick="_selecionarFichaOpcao(this)">
        <input type="radio" name="ficha-pick" value="${_esc(f.id)}" style="position:absolute;opacity:0;width:0;height:0">
        <div class="ficha-option-radio"></div>
        <div class="ficha-option-avatar">${_esc((f.nome || '?')[0]).toUpperCase()}</div>
        <div class="ficha-option-info">
          <div class="ficha-option-name">${_esc(f.nome)}</div>
          <div class="ficha-option-meta">Sem campanha</div>
        </div>
      </label>`).join('');
  } catch (e) {
    loading.style.display = 'none';
    console.warn('[ficha-picker]', e);
  }
}

function _selecionarFichaOpcao(el) {
  document.querySelectorAll('#ficha-picker-list .ficha-option').forEach(o => {
    o.classList.remove('ficha-option--selected');
  });
  el.classList.add('ficha-option--selected');
  el.querySelector('input[type="radio"]').checked = true;
  document.getElementById('btn-confirmar-entrar').disabled = false;
}

async function confirmarEntradaCampanha() {
  const selecionada = document.querySelector('#ficha-picker-list .ficha-option--selected');
  if (!selecionada || !_campanhaAlvoId) return;

  const fichaId = selecionada.dataset.id;
  const fichaName = selecionada.querySelector('.ficha-option-name').textContent;
  const btn = document.getElementById('btn-confirmar-entrar');
  const errEl = document.getElementById('modal-entrar-error');

  btn.disabled = true;
  btn.textContent = 'Enviando…';
  errEl.style.display = 'none';

  try {
    await dbSolicitarEntrada(_campanhaAlvoId, fichaId, fichaName);
    _solicitacoesEnviadas.add(_campanhaAlvoId);
    fecharModalEntrar();
    mostrarToast('✓ Solicitação enviada!');
    // Atualiza o card de busca para refletir estado pendente
    const grid = document.getElementById('grid-busca');
    if (grid.innerHTML) {
      grid.innerHTML = _campanhasBuscadas.map(c => _campCardBusca(c)).join('');
    }
  } catch (e) {
    errEl.textContent = e.message || 'Erro ao solicitar entrada.';
    errEl.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Confirmar participação';
  }
}

// ─── Toast ────────────────────────────────────────────────────

function mostrarToast(msg) {
  const t = document.getElementById('save-toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}

// ─── Helpers ─────────────────────────────────────────────────

function _docToCampanha(doc) {
  const d = doc.data();
  return {
    id: doc.id,
    nome: d.nome || 'Sem nome',
    descricao: d.descricao || '',
    sistema: d.sistema || 'd100',
    status: d.status || 'ativa',
    gmId: d.gmId || '',
    gmEmail: d.gmEmail || '',
    gmUsername: d.gmUsername || null,
    jogadoresIds: d.jogadoresIds || [],
    membros: d.membros || {},
  };
}

function _esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
