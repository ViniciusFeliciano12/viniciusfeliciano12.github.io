/* ═══════════════════════════════════════════════════════════════
   STORAGE — persistência localStorage + Firestore
═══════════════════════════════════════════════════════════════ */

const STORAGE_KEY = 'hp_auror_fichas_v3';
let fichas = [];
let abaAtiva = null;
let tabParaDeletar = null;
let modalItensId = null;

function carregarFichas() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) fichas = JSON.parse(raw);
  } catch (e) { fichas = []; }
  if (!fichas.length) fichas = [{ id: gerarId(), nome: 'Personagem 1', dados: {} }];
}

function salvarFichas(fichaId) {
  if (typeof _modoLeitura !== 'undefined' && _modoLeitura) return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(fichas)); }
  catch (e) { console.warn('Erro ao salvar local:', e); }
  if (typeof DB_USER !== 'undefined' && DB_USER) {
    const lista = fichaId ? [getFicha(fichaId)].filter(Boolean) : fichas;
    lista.forEach(f => dbSaveFicha(f).catch(() => { }));
  }
}

function getFicha(id) { return fichas.find(f => f.id === id); }

function exportarFichas() {
  if (abaAtiva) coletarDados(abaAtiva);
  const json = JSON.stringify(fichas, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const date = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `fichas_auror_${date}.json`;
  a.click();
  URL.revokeObjectURL(url);
  mostrarToast('✓ Fichas exportadas');
}

document.getElementById('import-file-input').addEventListener('change', function (e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const importadas = JSON.parse(ev.target.result);
      if (!Array.isArray(importadas) || !importadas[0]?.id) throw new Error('formato inválido');
      importadas.forEach(f => {
        if (fichas.some(ex => ex.id === f.id)) f.id = gerarId();
      });
      fichas.push(...importadas);
      salvarFichas();
      abaAtiva = importadas[0].id;
      renderConteudo();
      renderTabs();
      mostrarToast(`✓ ${importadas.length} ficha(s) importada(s)`);
    } catch (err) {
      mostrarToast('✗ Arquivo inválido');
    }
  };
  reader.readAsText(file);
  this.value = '';
});
