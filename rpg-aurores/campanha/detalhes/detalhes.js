/* ═══════════════════════════════════════════════════════════════
   CAMPANHA — DETALHES
   Depende de: db.js (todas as funções dbXxx, DB_USER, DB_IS_GM)
═══════════════════════════════════════════════════════════════ */

// ─── Estado ───────────────────────────────────────────────────

let _campanha = null;
let _role = 'none'; // 'gm' | 'player' | 'none'
let _campanhaId = null;
let _confirmCallback = null;

// ─── Boot ─────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  mostrarAuthOverlay(true);

  _campanhaId = new URLSearchParams(location.search).get('id');
  if (!_campanhaId) {
    location.replace('../');
    return;
  }

  const user = await dbInit();
  if (user) {
    onLogin(user);
  } else {
    mostrarAuthOverlay(false);
  }
});

// ─── Auth ─────────────────────────────────────────────────────

function mostrarAuthOverlay(loading) {
  const overlay = document.getElementById('auth-overlay');
  overlay.style.display = 'flex';
  document.getElementById('auth-loading-init').style.display = loading ? 'block' : 'none';
  document.getElementById('auth-forms').style.display = loading ? 'none' : 'block';
}

async function onLogin(user) {
  document.getElementById('auth-overlay').style.display = 'none';
  await dbRegisterUser().catch(() => { });
  const perfil = await dbGetUser(user.uid).catch(() => null);
  _atualizarTopbar(perfil, user);
  await _carregarCampanha();
}

function _atualizarTopbar(perfil, user) {
  const displayName = perfil?.username || user.email;
  document.getElementById('user-bar').style.display = 'flex';
  document.getElementById('user-email-display').textContent = displayName;
  document.getElementById('gm-badge').style.display = DB_IS_GM ? 'inline' : 'none';
  const btnPerfil = document.getElementById('btn-perfil');
  if (btnPerfil) btnPerfil.style.display = 'inline-flex';
  const avatarEl = document.getElementById('user-avatar-mini');
  if (avatarEl) {
    if (perfil?.avatarUrl) {
      avatarEl.innerHTML = '<img src="' + perfil.avatarUrl + '" alt="">';
    } else {
      avatarEl.textContent = displayName[0].toUpperCase();
    }
  }
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

async function authLogout() {
  await dbLogout();
  location.reload();
}

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

// ─── Carregamento principal ───────────────────────────────────

async function _carregarCampanha() {
  document.getElementById('detail-loading').style.display = 'block';

  _campanha = await dbGetCampanha(_campanhaId).catch(() => null);

  if (!_campanha) {
    document.getElementById('detail-loading').textContent = 'Campanha não encontrada.';
    return;
  }

  const uid = DB_USER.uid;
  if (_campanha.gmId === uid) {
    _role = 'gm';
  } else if (_campanha.jogadoresIds.includes(uid)) {
    _role = 'player';
  } else {
    document.getElementById('detail-loading').textContent = 'Acesso negado.';
    setTimeout(() => location.replace('../'), 2000);
    return;
  }

  document.getElementById('detail-loading').style.display = 'none';
  _renderCabecalho();
  _renderTabs();
  _ativarTab(_role === 'gm' ? 'fichas' : 'fichas');
}

function _renderCabecalho() {
  const c = _campanha;
  document.title = c.nome + ' — Aurores RPG';
  document.getElementById('detail-nome').textContent = c.nome;
  document.getElementById('detail-desc').textContent = c.descricao || 'Sem descrição.';
  document.getElementById('detail-gm-name').textContent = c.gmUsername || c.gmEmail || 'Mestre';
  document.getElementById('detail-sistema').textContent = c.sistema || 'd100';

  const badge = document.getElementById('detail-status-badge');
  const statusLabel = { ativa: 'Ativa', pausada: 'Pausada', encerrada: 'Encerrada' }[c.status] || c.status;
  badge.textContent = statusLabel;
  badge.className = `camp-status camp-status--${c.status}`;

  document.getElementById('camp-detail-header').style.display = 'block';
  document.getElementById('detail-tabs-bar').style.display = 'block';
}

function _renderTabs() {
  const tabsEl = document.getElementById('detail-tabs');
  const tabsDef = _role === 'gm'
    ? [
        { key: 'fichas',       label: 'Fichas' },
        { key: 'jogadores',    label: 'Jogadores' },
        { key: 'escudo',       label: 'Escudo do Mestre' },
        { key: 'solicitacoes', label: 'Solicitações', badge: true },
        { key: 'config',       label: 'Configurações' },
      ]
    : [
        { key: 'fichas',      label: 'Fichas' },
        { key: 'minha-part',  label: 'Minha Participação' },
      ];

  tabsEl.innerHTML = tabsDef.map(t => `
    <button class="camp-tab" data-tab="${t.key}" role="tab" aria-selected="false"
            onclick="trocarTabDetail('${t.key}')">
      ${t.label}${t.badge ? ' <span class="camp-tab-badge" id="badge-solicitacoes" style="display:none">0</span>' : ''}
    </button>`).join('');
}

function trocarTabDetail(tab) {
  document.querySelectorAll('#detail-tabs .camp-tab').forEach(b => {
    const ativo = b.dataset.tab === tab;
    b.classList.toggle('active', ativo);
    b.setAttribute('aria-selected', ativo ? 'true' : 'false');
  });

  const allPanels = ['panel-fichas', 'panel-jogadores', 'panel-escudo', 'panel-solicitacoes', 'panel-minha-part', 'panel-config'];
  allPanels.forEach(id => {
    document.getElementById(id).style.display = 'none';
  });

  const panelMap = {
    'fichas':       'panel-fichas',
    'jogadores':    'panel-jogadores',
    'escudo':       'panel-escudo',
    'solicitacoes': 'panel-solicitacoes',
    'minha-part':   'panel-minha-part',
    'config':       'panel-config',
  };
  const panelId = panelMap[tab];
  if (panelId) document.getElementById(panelId).style.display = 'block';

  // Carrega dados da tab ao abrir
  if (tab === 'fichas') carregarFichas();
  if (tab === 'jogadores') carregarJogadores();
  if (tab === 'escudo') carregarEscudoMestre();
  if (tab === 'solicitacoes') carregarSolicitacoes();
  if (tab === 'minha-part') renderMinhaParticipacao();
  if (tab === 'config') renderConfiguracoesCampanha();
}

function _ativarTab(tab) {
  trocarTabDetail(tab);
}

// ─── Tab: Fichas ──────────────────────────────────────────────

async function carregarFichas() {
  const loadEl = document.getElementById('loading-fichas');
  const content = document.getElementById('fichas-content');
  loadEl.style.display = 'block';
  content.innerHTML = '';

  try {
    const fichas = await dbGetCampanhaFichas(_campanhaId);
    loadEl.style.display = 'none';

    const cards = fichas.map(_renderFichaCard).join('');
    const addCard = `
      <button type="button" class="detail-card detail-card--add" onclick="abrirModalAddFicha()">
        <div class="detail-add-icon">+</div>
        <div class="detail-add-label">Adicionar ficha</div>
      </button>`;

    content.innerHTML = `
      ${!fichas.length ? `
        <div class="camp-empty" style="padding:8px 0 28px">
          <div class="camp-empty-icon">📄</div>
          <p>Nenhuma ficha vinculada a esta campanha ainda.</p>
        </div>` : ''}
      <div class="detail-card-grid">${cards}${addCard}</div>`;
  } catch (e) {
    loadEl.style.display = 'none';
    content.innerHTML = `<p class="auth-error" style="display:block">Erro ao carregar fichas: ${_esc(e.message)}</p>`;
  }
}

function _fichaCardAvatar(f) {
  const foto = f.dados && f.dados._foto;
  return foto
    ? `<img src="${foto}" alt="">`
    : `<span>${_esc((f.nome || '?')[0]).toUpperCase()}</span>`;
}

function _renderFichaCard(f) {
  const membro = _campanha.membros[f.user_id];
  const label = membro
    ? (membro.username || membro.email)
    : (f.user_id === _campanha.gmId ? (_campanha.gmUsername || _campanha.gmEmail) : f.user_id.slice(0, 8) + '…');
  const isOwn = f.user_id === DB_USER.uid;
  const abrirLabel = (_role === 'gm' || isOwn) ? '📝 Editar' : '👁 Ver';
  const desvincularBtn = (_role === 'gm' || isOwn)
    ? `<button class="btn-desvincular" onclick="solicitarDesvinculaFicha('${_esc(f.id)}','${_esc(f.nome)}')">Desvincular</button>`
    : '';

  return `
    <div class="detail-card detail-ficha-card">
      <div class="detail-card-avatar">${_fichaCardAvatar(f)}</div>
      <div class="detail-card-name" title="${_esc(f.nome)}">${_esc(f.nome)}</div>
      <div class="detail-card-owner">${_esc(label)}${isOwn ? ' <span class="detail-you-tag">(você)</span>' : ''}</div>
      <div class="detail-card-actions">
        <a href="../../ficha/?ficha=${_esc(f.id)}" class="btn-ver-ficha" target="_blank">${abrirLabel} ficha</a>
        <button class="btn-clonar" title="Clonar personagem para você" onclick="clonarPersonagem('${_esc(f.id)}','${_esc(f.nome)}')">🧬 Clonar</button>
        ${desvincularBtn}
      </div>
    </div>`;
}

function solicitarDesvinculaFicha(fichaId, fichaNome) {
  abrirConfirm(
    'Desvincular ficha',
    `Deseja desvincular "${fichaNome}" desta campanha? A ficha não será excluída.`,
    async () => {
      await dbDesvinculaFicha(fichaId);
      mostrarToast('Ficha desvinculada.');
      carregarFichas();
    }
  );
}

// Clona a ficha de qualquer participante (inclusive a própria) para uma ficha
// nova e independente do clicante — não fica vinculada a esta (ou nenhuma)
// campanha, e editar a cópia não afeta o personagem original.
function clonarPersonagem(fichaId, fichaNome) {
  abrirConfirm(
    'Clonar personagem',
    `Deseja criar uma cópia de "${fichaNome}" para você? A cópia é uma ficha independente — não afeta a campanha nem o personagem original.`,
    async () => {
      const original = await dbGetFichaById(fichaId);
      if (!original) throw new Error('Ficha não encontrada.');
      const clone = {
        id: _gerarFichaCloneId(original.nome),
        user_id: DB_USER.uid,
        nome: (original.nome || 'Personagem') + ' (cópia)',
        dados: JSON.parse(JSON.stringify(original.dados || {})),
      };
      await dbCreateFicha(clone);
      mostrarToast('✓ Personagem clonado! Veja na aba "Fichas" fora da campanha.');
    }
  );
}

function _gerarFichaCloneId(nome) {
  const slug = (nome || 'personagem')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 32) || 'personagem';
  return 'ficha_' + slug + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// ─── Tab: Jogadores (GM) ──────────────────────────────────────

function carregarJogadores() {
  const content = document.getElementById('jogadores-content');
  const membros = _campanha.membros || {};
  const ids = _campanha.jogadoresIds || [];

  if (!ids.length) {
    content.innerHTML = `
      <div class="camp-empty" style="padding:32px 0">
        <div class="camp-empty-icon">👥</div>
        <p>Nenhum jogador aceito ainda.</p>
      </div>`;
    return;
  }

  const cards = ids.map(uid => {
    const m = membros[uid] || {};
    const label = m.username || m.email || uid.slice(0, 12) + '…';
    return `
      <div class="detail-card detail-player-card">
        <div class="detail-card-avatar"><span>${_esc(label[0] || '?').toUpperCase()}</span></div>
        <div class="detail-card-name" title="${_esc(label)}">${_esc(label)}</div>
        ${m.email && m.username ? `<div class="detail-card-owner">${_esc(m.email)}</div>` : ''}
        <div class="detail-card-actions">
          <button class="btn-expulsar" onclick="solicitarExpulsao('${_esc(uid)}','${_esc(label)}')">Expulsar</button>
        </div>
      </div>`;
  }).join('');

  content.innerHTML = `<div class="detail-card-grid">${cards}</div>`;
}

function solicitarExpulsao(uid, label) {
  abrirConfirm(
    'Expulsar jogador',
    `Deseja expulsar "${label}" da campanha? Todas as fichas dele serão desvinculadas.`,
    async () => {
      await dbExpulsarJogador(_campanhaId, uid);
      // Atualiza estado local
      _campanha.jogadoresIds = _campanha.jogadoresIds.filter(id => id !== uid);
      delete _campanha.membros[uid];
      mostrarToast('Jogador expulso.');
      carregarJogadores();
      // Atualiza badge de solicitações se estiver visível
      _atualizarBadgeSolicitacoes();
    }
  );
}

// ─── Tab: Solicitações (GM) ───────────────────────────────────

async function carregarSolicitacoes() {
  const loadEl = document.getElementById('loading-solicitacoes');
  const content = document.getElementById('solicitacoes-content');
  loadEl.style.display = 'block';
  content.innerHTML = '';

  try {
    const sols = await dbGetSolicitacoes(_campanhaId);
    loadEl.style.display = 'none';

    // Atualiza badge
    const badge = document.getElementById('badge-solicitacoes');
    if (badge) {
      badge.textContent = sols.length;
      badge.style.display = sols.length ? 'inline-flex' : 'none';
    }

    if (!sols.length) {
      content.innerHTML = `
        <div class="camp-empty" style="padding:32px 0">
          <div class="camp-empty-icon">📬</div>
          <p>Nenhuma solicitação pendente.</p>
        </div>`;
      return;
    }

    content.innerHTML = sols.map(s => `
      <div class="detail-request-card" id="req-${_esc(s.uid)}">
        <div class="detail-request-info">
          <span class="detail-request-player">${_esc(s.email || s.uid)}</span>
          <span class="detail-request-ficha">Ficha: <strong>${_esc(s.fichaName || '—')}</strong></span>
        </div>
        <div class="detail-request-actions">
          <button class="btn-aceitar" onclick="aceitarJogador('${_esc(s.uid)}','${_esc(s.fichaId)}','${_esc(s.email || '')}')">Aceitar</button>
          <button class="btn-recusar" onclick="recusarJogador('${_esc(s.uid)}')">Recusar</button>
        </div>
      </div>`).join('');
  } catch (e) {
    loadEl.style.display = 'none';
    content.innerHTML = `<p class="auth-error" style="display:block">Erro: ${_esc(e.message)}</p>`;
  }
}

async function aceitarJogador(uid, fichaId, email) {
  const card = document.getElementById('req-' + uid);
  if (card) {
    card.querySelectorAll('button').forEach(b => b.disabled = true);
    card.querySelector('.btn-aceitar').textContent = 'Aceitando…';
  }
  try {
    await dbAceitarJogador(_campanhaId, uid, fichaId, { email });
    // Atualiza estado local
    if (!_campanha.jogadoresIds.includes(uid)) _campanha.jogadoresIds.push(uid);
    _campanha.membros[uid] = { email };
    if (card) card.remove();
    mostrarToast('✓ Jogador aceito!');
    _atualizarBadgeSolicitacoes();
  } catch (e) {
    if (card) {
      card.querySelectorAll('button').forEach(b => b.disabled = false);
      card.querySelector('.btn-aceitar').textContent = 'Aceitar';
    }
    mostrarToast('Erro: ' + (e.message || 'tente novamente.'));
  }
}

async function recusarJogador(uid) {
  const card = document.getElementById('req-' + uid);
  if (card) {
    card.querySelectorAll('button').forEach(b => b.disabled = true);
    card.querySelector('.btn-recusar').textContent = 'Recusando…';
  }
  try {
    await dbRecusarJogador(_campanhaId, uid);
    if (card) card.remove();
    mostrarToast('Solicitação recusada.');
    _atualizarBadgeSolicitacoes();
  } catch (e) {
    if (card) {
      card.querySelectorAll('button').forEach(b => b.disabled = false);
      card.querySelector('.btn-recusar').textContent = 'Recusar';
    }
    mostrarToast('Erro: ' + (e.message || 'tente novamente.'));
  }
}

function _atualizarBadgeSolicitacoes() {
  const badge = document.getElementById('badge-solicitacoes');
  if (!badge) return;
  const atual = parseInt(badge.textContent || '0', 10);
  const novo = Math.max(0, atual - 1);
  badge.textContent = novo;
  badge.style.display = novo ? 'inline-flex' : 'none';
}

// ─── Tab: Minha Participação (Jogador) ────────────────────────

function renderMinhaParticipacao() {
  const content = document.getElementById('minha-part-content');
  content.innerHTML = `
    <div class="minha-part-section">
      <h3 class="minha-part-title">Sua participação</h3>
      <p class="minha-part-info">Você é membro desta campanha como jogador.</p>
      <p class="minha-part-info">Para adicionar ou remover fichas, acesse a aba <strong>Fichas</strong>.</p>
    </div>
    <div class="minha-part-section minha-part-danger">
      <h4>Sair da campanha</h4>
      <p>Ao sair, todas as suas fichas serão desvinculadas desta campanha. Elas <strong>não serão excluídas</strong>.</p>
      <button class="btn-perigo" onclick="solicitarSaida()">Sair da campanha</button>
    </div>`;
}

function solicitarSaida() {
  abrirConfirm(
    'Sair da campanha',
    'Deseja sair desta campanha? Suas fichas serão desvinculadas, mas não serão excluídas.',
    async () => {
      await dbSairDaCampanha(_campanhaId);
      mostrarToast('Você saiu da campanha.');
      setTimeout(() => location.replace('../'), 1200);
    }
  );
}

// ─── Modal: Adicionar ficha (jogador) ─────────────────────────

async function abrirModalAddFicha() {
  document.getElementById('add-ficha-error').style.display = 'none';
  document.getElementById('btn-confirmar-add-ficha').disabled = true;
  document.getElementById('modal-add-ficha').classList.add('open');
  await _carregarFichasLivres();
}

function fecharModalAddFicha() {
  document.getElementById('modal-add-ficha').classList.remove('open');
}

async function _carregarFichasLivres() {
  const loading = document.getElementById('add-ficha-loading');
  const empty = document.getElementById('add-ficha-empty');
  const list = document.getElementById('add-ficha-list');

  loading.style.display = 'block';
  empty.style.display = 'none';
  list.innerHTML = '';

  try {
    const todas = await dbLoadFichas(DB_USER.uid);
    const livres = todas.filter(f => !f.campanhaId);
    loading.style.display = 'none';

    if (!livres.length) {
      empty.style.display = 'block';
      empty.innerHTML = todas.length
        ? '<p style="text-align:center;color:var(--ink-soft);font-size:13px">Todas as suas fichas já estão em campanhas.</p>'
        : '<p style="text-align:center;color:var(--ink-soft);font-size:13px">Você não tem fichas criadas. <a href="../../ficha/">Criar ficha →</a></p>';
      return;
    }

    list.innerHTML = livres.map(f => `
      <label class="ficha-option" data-id="${_esc(f.id)}" onclick="_selecionarFichaAdd(this)">
        <input type="radio" name="add-ficha-pick" value="${_esc(f.id)}" style="position:absolute;opacity:0;width:0;height:0">
        <div class="ficha-option-radio"></div>
        <div class="ficha-option-avatar">${_esc((f.nome || '?')[0]).toUpperCase()}</div>
        <div class="ficha-option-info">
          <div class="ficha-option-name">${_esc(f.nome)}</div>
          <div class="ficha-option-meta">Sem campanha</div>
        </div>
      </label>`).join('');
  } catch (e) {
    loading.style.display = 'none';
    console.warn('[add-ficha]', e);
  }
}

function _selecionarFichaAdd(el) {
  document.querySelectorAll('#add-ficha-list .ficha-option').forEach(o => o.classList.remove('ficha-option--selected'));
  el.classList.add('ficha-option--selected');
  document.getElementById('btn-confirmar-add-ficha').disabled = false;
}

async function confirmarAddFicha() {
  const selecionada = document.querySelector('#add-ficha-list .ficha-option--selected');
  if (!selecionada) return;
  const fichaId = selecionada.dataset.id;
  const btn = document.getElementById('btn-confirmar-add-ficha');
  const errEl = document.getElementById('add-ficha-error');
  btn.disabled = true;
  btn.textContent = 'Vinculando…';
  errEl.style.display = 'none';
  try {
    await dbVincularFicha(fichaId, _campanhaId);
    fecharModalAddFicha();
    mostrarToast('✓ Ficha adicionada!');
    carregarFichas();
  } catch (e) {
    errEl.textContent = e.message || 'Erro ao vincular ficha.';
    errEl.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Vincular ficha';
  }
}

// ─── Tab: Configurações (GM) ─────────────────────────────────

function renderConfiguracoesCampanha() {
  const content = document.getElementById('config-content');
  content.innerHTML = `
    <div class="minha-part-section minha-part-danger">
      <h4>Zona de perigo</h4>
      <p>Ao deletar a campanha, todas as fichas dos jogadores serão <strong>desvinculadas</strong> (não excluídas). Esta ação é <strong>irreversível</strong>.</p>
      <button class="btn-perigo" onclick="solicitarDeletarCampanha()">Deletar campanha</button>
    </div>`;
}

function solicitarDeletarCampanha() {
  abrirConfirm(
    'Deletar campanha',
    `Deseja deletar "${_campanha.nome}"? Todas as fichas serão desvinculadas. Esta ação é irreversível.`,
    async () => {
      await dbDeleteCampanha(_campanhaId);
      mostrarToast('Campanha deletada.');
      setTimeout(() => location.replace('../'), 1200);
    }
  );
}

// ─── Modal: Confirmação de ação destrutiva ────────────────────

function abrirConfirm(title, msg, onConfirm) {
  _confirmCallback = onConfirm;
  document.getElementById('confirm-title').textContent = title;
  document.getElementById('confirm-msg').textContent = msg;
  document.getElementById('confirm-error').style.display = 'none';
  document.getElementById('btn-confirm-ok').disabled = false;
  document.getElementById('btn-confirm-ok').textContent = 'Confirmar';
  document.getElementById('modal-confirm').classList.add('open');
}

async function executarConfirm() {
  const btn = document.getElementById('btn-confirm-ok');
  const errEl = document.getElementById('confirm-error');
  btn.disabled = true;
  btn.textContent = 'Aguarde…';
  errEl.style.display = 'none';
  try {
    await _confirmCallback();
    fecharConfirm();
  } catch (e) {
    errEl.textContent = e.message || 'Erro ao executar ação.';
    errEl.style.display = 'block';
    btn.disabled = false;
    btn.textContent = 'Confirmar';
  }
}

function fecharConfirm() {
  document.getElementById('modal-confirm').classList.remove('open');
  _confirmCallback = null;
}

// ─── Toast ────────────────────────────────────────────────────

function mostrarToast(msg) {
  const t = document.getElementById('save-toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}

// ─── Helpers ─────────────────────────────────────────────────

function _esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
