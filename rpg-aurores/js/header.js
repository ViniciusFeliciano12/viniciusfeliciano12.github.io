(function () {
  const PAGES = [
    { key: 'ficha',      label: '⚡ Ficha',      slug: 'ficha/' },
    { key: 'campanha',   label: '📢 Campanha',   slug: 'campanha/' },
    { key: 'regras',     label: '📖 Regras',     slug: 'regras/' },
    { key: 'glossario',  label: '📚 Glossário',  slug: 'glossario/' },
    { key: 'itens',      label: '🧪 Itens',      slug: 'itens/' },
  ];
  const currentScript = document.currentScript;
  const activePage = currentScript ? currentScript.dataset.page : '';
  const root = currentScript ? (currentScript.dataset.root || '../') : '../';

  function inject() {
    const nav = document.querySelector('.page-nav');
    if (!nav) return;
    nav.innerHTML = PAGES.map(p =>
      p.key === activePage
        ? `<a class="active">${p.label}</a>`
        : `<a href="${root}${p.slug}">${p.label}</a>`
    ).join('');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }
})();
