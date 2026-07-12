/* ═══════════════════════════════════════════════════════════════
   RULES COLLAPSE — permite recolher cada subseção (h2.rules-sec-title)
   das páginas de Regras/Itens clicando no próprio header, deixando
   apenas o título visível para facilitar a navegação.
═══════════════════════════════════════════════════════════════ */

(function () {
  function setup(body) {
    const titles = Array.from(body.querySelectorAll(':scope > .rules-sec-title'));
    titles.forEach((title) => {
      const content = document.createElement('div');
      content.className = 'rules-sec-content';
      title.insertAdjacentElement('afterend', content);

      let node = content.nextSibling;
      while (node && !(node.nodeType === 1 && node.classList.contains('rules-sec-title'))) {
        const next = node.nextSibling;
        content.appendChild(node);
        node = next;
      }

      title.addEventListener('click', () => {
        const collapsed = title.classList.toggle('is-collapsed');
        content.classList.toggle('is-collapsed', collapsed);
      });
    });
  }

  function init() {
    document.querySelectorAll('.rules-body').forEach(setup);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
