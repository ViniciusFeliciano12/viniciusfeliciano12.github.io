/* ═══════════════════════════════════════════════════════════════
   HEADER — componente singleton (nav + user-bar)
   Cache de dados do usuário em sessionStorage para evitar
   requisições repetidas ao Firestore ao navegar entre páginas.
   O estado é limpo/recarregado apenas no login e logout.
═══════════════════════════════════════════════════════════════ */

(function () {
  const CACHE_KEY = 'hp_header_user';
  const PAGES = [
    { key: 'ficha',     label: '⚡ Ficha',     slug: 'ficha/' },
    { key: 'campanha',  label: '📢 Campanha',  slug: 'campanha/' },
    { key: 'regras',    label: '📖 Regras',    slug: 'regras/' },
    { key: 'glossario', label: '📚 Glossário', slug: 'glossario/' },
    { key: 'itens',     label: '🧪 Itens',     slug: 'itens/' },
  ];

  const currentScript = document.currentScript;
  const activePage = currentScript ? (currentScript.dataset.page || '') : '';
  const root = currentScript ? (currentScript.dataset.root || '../') : '../';

  // ── Helpers de cache ───────────────────────────────────────
  function _cacheGet() {
    try { return JSON.parse(sessionStorage.getItem(CACHE_KEY)); }
    catch { return null; }
  }

  function _cacheSet(data) {
    try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(data)); }
    catch {}
  }

  function _cacheClear() {
    try { sessionStorage.removeItem(CACHE_KEY); } catch {}
  }

  // ── Geração do HTML do user-bar ────────────────────────────
  function _buildUserBar() {
    const bar = document.getElementById('user-bar');
    if (!bar || bar.dataset.headerBuilt) return;
    bar.dataset.headerBuilt = '1';

    const painelLink = activePage !== 'painel'
      ? `<a class="btn-painel" id="btn-painel" href="${root}painel/" style="display:none">← Painel</a>`
      : '';

    bar.innerHTML = `
      <div class="user-avatar-mini" id="user-avatar-mini"></div>
      <span class="user-email" id="user-email-display"></span>
      <span class="gm-badge" id="gm-badge" style="display:none">Mestre</span>
      <span class="jogador-ctx" id="jogador-ctx" style="display:none"></span>
      ${painelLink}
      <a class="btn-painel" id="btn-perfil" href="${root}perfil/" style="display:none">Perfil</a>
      <button class="btn-logout" onclick="headerLogout()">Sair</button>
    `;
  }

  // ── Nav links ──────────────────────────────────────────────
  function _buildNav() {
    const nav = document.querySelector('.page-nav');
    if (!nav) return;
    // Preserva filhos não-link (ex: título estático no painel)
    const hasStaticContent = nav.children.length > 0 && !nav.querySelector('a[href]');
    if (hasStaticContent) return;
    nav.innerHTML = PAGES.map(p =>
      p.key === activePage
        ? `<a class="active" href="${root}${p.slug}">${p.label}</a>`
        : `<a href="${root}${p.slug}">${p.label}</a>`
    ).join('');
  }

  // ── Preenche o user-bar com dados (cache ou frescos) ───────
  function _applyUserData(data) {
    if (!data) return;
    const bar = document.getElementById('user-bar');
    if (!bar) return;

    bar.style.display = 'flex';

    const displayName = data.username || data.email || '';
    const emailEl = document.getElementById('user-email-display');
    if (emailEl) emailEl.textContent = displayName;

    const avatarEl = document.getElementById('user-avatar-mini');
    if (avatarEl) {
      avatarEl.innerHTML = data.avatarUrl
        ? `<img src="${data.avatarUrl}" alt="">`
        : (displayName[0] || '').toUpperCase();
    }

    const gmBadge = document.getElementById('gm-badge');
    if (gmBadge) gmBadge.style.display = data.isGM ? 'inline' : 'none';

    const btnPainel = document.getElementById('btn-painel');
    if (btnPainel) btnPainel.style.display = data.isGM ? 'inline-flex' : 'none';

    const btnPerfil = document.getElementById('btn-perfil');
    if (btnPerfil) btnPerfil.style.display = 'inline-flex';

    if (data.jogadorCtx) {
      const ctx = document.getElementById('jogador-ctx');
      if (ctx) { ctx.style.display = 'inline'; ctx.textContent = data.jogadorCtx; }
    }
  }

  // ── Init (chamado no DOMContentLoaded) ────────────────────
  function inject() {
    _buildNav();
    _buildUserBar();
    _applyUserData(_cacheGet()); // exibição instantânea sem Firestore
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }

  // ── API pública ────────────────────────────────────────────

  /**
   * Chamado após auth bem-sucedida para atualizar o header com dados frescos.
   * Salva no cache para uso nas próximas páginas.
   * @param {object} user    - Firebase user (uid, email)
   * @param {object} perfil  - Dados do Firestore (username, avatarUrl)
   * @param {boolean} isGM
   * @param {string} [jogadorCtx] - Label exibido quando Mestre vê ficha alheia
   */
  window.headerUpdate = function (user, perfil, isGM, jogadorCtx) {
    const existing = _cacheGet();
    const sameUser = existing && existing.uid === (user?.uid || null);
    const data = {
      uid: user?.uid || null,
      email: user?.email || null,
      // Se perfil falhou (null), preserva username/avatarUrl do cache — evita
      // apagar foto/nome quando dbGetUser tem erro transiente de auth/rede.
      username: perfil ? (perfil.username || null) : (sameUser ? existing.username : null),
      avatarUrl: perfil ? (perfil.avatarUrl || null) : (sameUser ? existing.avatarUrl : null),
      isGM: !!isGM,
      jogadorCtx: jogadorCtx || null,
    };
    _cacheSet(data);
    _buildUserBar();   // garante que o HTML exista (caso ainda não tenha sido injetado)
    _applyUserData(data);
  };

  /** Remove o cache e oculta o user-bar (chamar no logout). */
  window.headerClear = function () {
    _cacheClear();
    const bar = document.getElementById('user-bar');
    if (bar) bar.style.display = 'none';
    const gmBadge = document.getElementById('gm-badge');
    if (gmBadge) gmBadge.style.display = 'none';
    const ctx = document.getElementById('jogador-ctx');
    if (ctx) ctx.style.display = 'none';
  };

  /**
   * Logout centralizado: limpa cache, chama dbLogout e delega à página.
   * Cada página pode definir window._onHeaderLogout para cleanup próprio;
   * caso contrário, a página é recarregada.
   */
  window.headerLogout = async function () {
    window.headerClear();
    try { localStorage.removeItem('hp_auror_fichas_v3'); } catch {}
    if (typeof dbLogout === 'function') {
      try { await dbLogout(); } catch {}
    }
    if (typeof window._onHeaderLogout === 'function') {
      window._onHeaderLogout();
    } else {
      location.reload();
    }
  };
})();
