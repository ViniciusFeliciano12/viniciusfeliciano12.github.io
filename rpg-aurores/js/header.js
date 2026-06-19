(function () {
  const PAGES = [
    { key: 'ficha',     label: '⚡ Ficha',      href: '../ficha/' },
    { key: 'regras',    label: '📖 Regras',     href: '../regras/' },
    { key: 'glossario', label: '📚 Glossário',  href: '../glossario/' },
    { key: 'itens',     label: '🧪 Itens',      href: '../itens/' },
  ];
  const currentScript = document.currentScript;
  const activePage = currentScript ? currentScript.dataset.page : '';

  function inject() {
    const nav = document.querySelector('.page-nav');
    if (!nav) return;
    nav.innerHTML = PAGES.map(p =>
      p.key === activePage
        ? `<a class="active">${p.label}</a>`
        : `<a href="${p.href}">${p.label}</a>`
    ).join('');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }
})();
