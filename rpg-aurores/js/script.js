/* ═══════════════════════════════════════════════════════════════
   PAGE SWITCHER
═══════════════════════════════════════════════════════════════ */
function switchPage(name, btn) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + name).classList.add('active');
  document.querySelectorAll('.page-nav button').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  // hide/show tab strip on regras/glossario page
  const isSheet = name === 'ficha';
  document.getElementById('tabs-strip').style.opacity = isSheet ? '1' : '0.35';
  document.getElementById('tabs-strip').style.pointerEvents = isSheet ? '' : 'none';
}

function filtrarGlossario(query) {
  const q = query.trim().toLowerCase();
  const entries = document.querySelectorAll('#glossario-content .gloss-entry');
  const categories = document.querySelectorAll('#glossario-content .gloss-category');
  let totalVisible = 0;

  entries.forEach(entry => {
    const text = entry.textContent.toLowerCase();
    const show = !q || text.includes(q);
    entry.style.display = show ? '' : 'none';
    if (show) totalVisible++;
  });

  categories.forEach(cat => {
    const visibleEntries = [...cat.querySelectorAll('.gloss-entry')].some(e => e.style.display !== 'none');
    cat.style.display = visibleEntries ? '' : 'none';
  });

  // mostrar mensagem se nenhum resultado
  let noResult = document.getElementById('gloss-no-result');
  if (totalVisible === 0) {
    if (!noResult) {
      noResult = document.createElement('p');
      noResult.id = 'gloss-no-result';
      noResult.className = 'gloss-no-result';
      noResult.textContent = 'Nenhum termo encontrado. Tente outra palavra-chave.';
      document.getElementById('glossario-content').appendChild(noResult);
    }
    noResult.style.display = '';
  } else if (noResult) {
    noResult.style.display = 'none';
  }
}

/* ═══════════════════════════════════════════════════════════════
   PERSISTÊNCIA + ABAS
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
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(fichas)); }
  catch (e) { console.warn('Erro ao salvar local:', e); }
  if (typeof DB_USER !== 'undefined' && DB_USER) {
    const lista = fichaId ? [getFicha(fichaId)].filter(Boolean) : fichas;
    lista.forEach(f => dbSaveFicha(f).catch(() => {}));
  }
}
function gerarId() { return 'f' + Date.now() + Math.random().toString(36).slice(2, 6); }
function getFicha(id) { return fichas.find(f => f.id === id); }

function renderTabs() {
  const strip = document.getElementById('tabs-strip');
  const addBtn = document.getElementById('btn-nova-aba');
  strip.querySelectorAll('.tab-btn').forEach(el => el.remove());
  fichas.forEach(f => {
    const btn = document.createElement('button');
    btn.className = 'tab-btn' + (f.id === abaAtiva ? ' active' : '');
    btn.dataset.id = f.id;
    btn.innerHTML = `<span class="tab-name-text" title="${f.nome}">${f.nome}</span>
      <button class="tab-close" onclick="pedirDeletar(event,'${f.id}')" title="Remover">×</button>`;
    btn.addEventListener('click', () => ativarAba(f.id));
    strip.insertBefore(btn, addBtn);
  });
}

function renderConteudo() {
  const area = document.getElementById('tabs-content-area');
  area.innerHTML = '';
  fichas.forEach(f => {
    const div = document.createElement('div');
    div.className = 'tab-content-ficha' + (f.id === abaAtiva ? ' active-ficha' : '');
    div.id = 'content-' + f.id;
    div.style.display = f.id === abaAtiva ? 'block' : 'none';
    div.innerHTML = criarFichaHTML(f.id);
    area.appendChild(div);
    preencherFicha(f.id, f.dados);
    // se ficha nova (dados vazio), persiste os defaults do template
    if (!Object.keys(f.dados).length) coletarDados(f.id);
    bindFichaEvents(f.id);
    atualizarLabelPostura(f.id);
    aplicarHighlightEspecializacao(f.id);
    setTimeout(() => atualizarTodasPericias(f.id), 0);
  });
}

function ativarAba(id) {
  if (abaAtiva) coletarDados(abaAtiva);
  abaAtiva = id;
  document.querySelectorAll('[id^="content-"]').forEach(el => {
    el.style.display = el.id === 'content-' + id ? 'block' : 'none';
  });
  renderTabs();
  const btn = document.querySelector(`.tab-btn[data-id="${id}"]`);
  if (btn) btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
}

function novaAba() {
  if (abaAtiva) coletarDados(abaAtiva);
  const id = gerarId();
  const novaFicha = { id, user_id: DB_USER?.uid, nome: 'Personagem ' + (fichas.length + 1), dados: {} };
  fichas.push(novaFicha);
  dbCreateFicha(novaFicha).catch(() => {});
  salvarFichas(id);
  abaAtiva = id;
  const area = document.getElementById('tabs-content-area');
  area.querySelectorAll('[id^="content-"]').forEach(el => el.style.display = 'none');
  const div = document.createElement('div');
  div.id = 'content-' + id;
  div.style.display = 'block';
  div.innerHTML = criarFichaHTML(id);
  area.appendChild(div);
  preencherFicha(id, {});
  coletarDados(id);   // persiste os valores padrão do template imediatamente
  bindFichaEvents(id);
  atualizarLabelPostura(id);
  aplicarHighlightEspecializacao(id);
  setTimeout(() => atualizarTodasPericias(id), 0);
  renderTabs();
  mostrarToast('✦ Nova ficha criada');
}

function pedirDeletar(e, id) {
  e.stopPropagation();
  if (fichas.length <= 1) { mostrarToast('Não é possível remover a única ficha.'); return; }
  tabParaDeletar = id;
  document.getElementById('modal-del-msg').textContent =
    `Deseja remover a ficha "${getFicha(id)?.nome}"? Os dados serão apagados permanentemente.`;
  document.getElementById('modal-del').classList.add('open');
}
function fecharModal() {
  document.getElementById('modal-del').classList.remove('open');
  tabParaDeletar = null;
}
function confirmarDeletar() {
  if (!tabParaDeletar) return;
  const idx = fichas.findIndex(f => f.id === tabParaDeletar);
  fichas.splice(idx, 1);
  document.getElementById('content-' + tabParaDeletar)?.remove();
  abaAtiva = fichas[Math.min(idx, fichas.length - 1)].id;
  dbDeleteFicha(tabParaDeletar).catch(() => {});
  salvarFichas();
  fecharModal();
  renderTabs();
  ativarAba(abaAtiva);
  mostrarToast('Ficha removida');
}

/* ═══ POSTURA STATUS ══════════════════════════════════════════ */
function atualizarLabelPostura(id) {
  const c = document.getElementById('content-' + id);
  if (!c) return;
  const atual = parseInt(c.querySelector('[data-field="postura_atual"]')?.value) || 0;
  const max = parseInt(c.querySelector('[data-field="postura_max"]')?.value) || 1;
  const lbl = c.querySelector('[data-calc="postura_status"]');
  if (!lbl) return;
  const pct = atual / max;
  if (atual <= 0) { lbl.textContent = 'QUEBRADA'; lbl.style.color = 'var(--rank-sss)'; }
  else if (pct <= .25) { lbl.textContent = 'DESGASTADA'; lbl.style.color = 'var(--rank-ss)'; }
  else if (pct <= .50) { lbl.textContent = 'CANSADA'; lbl.style.color = '#b8860b'; }
  else { lbl.textContent = 'SAUDÁVEL'; lbl.style.color = 'var(--forest)'; }
}

/* ═══ COLETA / PREENCHE ═══════════════════════════════════════ */
function coletarDados(id) {
  const c = document.getElementById('content-' + id);
  if (!c) return;
  const dados = {};
  c.querySelectorAll('[data-field]').forEach(el => { dados[el.dataset.field] = el.value; });
  const img = c.querySelector('.foto-preview-img');
  if (img?.src && img.style.display !== 'none') dados['_foto'] = img.src;
  const objs = [];
  c.querySelectorAll('.objeto-item').forEach(row => {
    const ins = row.querySelectorAll('input');
    objs.push({ item: ins[0]?.value || '', descricao: ins[1]?.value || '' });
  });
  dados['_objetos'] = objs;
  dados['_itens_mochila'] = (fichas.find(f => f.id === id) || {})._itens_mochila || [];
  const f = getFicha(id);
  if (f) {
    f.dados = dados;
    const nome = dados['nome_completo']?.trim();
    if (nome) f.nome = nome.split(' ')[0];
  }
  salvarFichas(id);
}

function preencherFicha(id, dados) {
  const c = document.getElementById('content-' + id);
  if (!c || !dados) return;
  c.querySelectorAll('[data-field]').forEach(el => {
    if (dados[el.dataset.field] !== undefined) el.value = dados[el.dataset.field];
  });
  if (dados['_foto']) {
    const img = c.querySelector('.foto-preview-img');
    const ph = c.querySelector('.foto-placeholder-div');
    if (img) { img.src = dados['_foto']; img.style.display = 'block'; }
    if (ph) ph.style.display = 'none';
  }
  if (dados['_objetos']?.length) {
    const lista = c.querySelector('.objetos-lista');
    if (lista) {
      lista.innerHTML = '';
      dados['_objetos'].forEach(o => {
        const div = criarObjetoItem();
        lista.appendChild(div);
        const ins = div.querySelectorAll('input');
        ins[0].value = o.item;
        ins[1].value = o.descricao;
      });
    }
  }
  atualizarLabelPostura(id);
  // Restore escola bonus display
  setTimeout(() => onEscolaChange(id), 0);
  // Atualiza totais e limiares das perícias
  setTimeout(() => atualizarTodasPericias(id), 0);
  // Restore items
  const ficha = fichas.find(f => f.id === id);
  if (ficha) ficha._itens_mochila = dados._itens_mochila || [];
  renderizarItensMochila(id);
  atualizarCargaDisplay(id);
}

function bindFichaEvents(id) {
  const c = document.getElementById('content-' + id);
  if (!c) return;

  // ── Cálculo automático de derivados ──────────────────────────
  const BASE_FIELDS = ['for', 'int_attr', 'des', 'con', 'apa', 'pod', 'tam', 'edu'];
  function recalcDerived() {
    const v = {};
    BASE_FIELDS.forEach(f => {
      v[f] = parseInt(c.querySelector(`[data-field="${f}"]`)?.value) || 0;
    });
    const hpMax = Math.floor((v.con + v.tam) / 5);
    const posturaMax = Math.floor((v.con + v.pod) / 5);
    const pmMax = Math.floor(v.pod / 5);

    const setIfUnchanged = (field, newMax) => {
      const maxEl = c.querySelector(`[data-field="${field}_max"]`);
      const atualEl = c.querySelector(`[data-field="${field}_atual"]`);
      if (!maxEl) return;
      const oldMax = parseInt(maxEl.value) || 0;
      const oldAtual = parseInt(atualEl?.value) || 0;
      // ajusta atual proporcionalmente se o máximo mudou
      if (oldMax !== newMax) {
        maxEl.value = newMax;
        if (atualEl) {
          const ratio = oldMax > 0 ? oldAtual / oldMax : 1;
          atualEl.value = Math.max(0, Math.round(newMax * ratio));
        }
      }
    };
    setIfUnchanged('hp', hpMax);
    setIfUnchanged('postura', posturaMax);
    setIfUnchanged('pm', pmMax);
    atualizarLabelPostura(id);
  }

  c.addEventListener('input', e => {
    if (BASE_FIELDS.includes(e.target.dataset?.field)) recalcDerived();
    if (e.target.dataset.field === 'postura_atual' || e.target.dataset.field === 'postura_max')
      atualizarLabelPostura(id);
    // Atualiza totais/limiares ao digitar em qualquer perícia ou em DES (para esquiva)
    if (e.target.dataset?.field?.startsWith('sk_') || e.target.dataset?.field === 'des')
      atualizarTodasPericias(id);
  });
  c.addEventListener('input', debounce(() => { coletarDados(id); atualizarNomeAba(id); }, 600));
  c.addEventListener('change', debounce(() => { coletarDados(id); atualizarNomeAba(id); }, 600));
  // highlight de perícias ao mudar especialização (imediato, sem debounce)
  c.querySelector('[data-field="especializacao"]')?.addEventListener('change', () => {
    aplicarHighlightEspecializacao(id);
  });
  // bônus de escola nas perícias (imediato)
  c.querySelector('[data-field="escola"]')?.addEventListener('change', () => {
    onEscolaChange(id);
    setTimeout(() => atualizarTodasPericias(id), 0);
  });
  c.querySelector('[data-field="domiciliar_sk1"]')?.addEventListener('change', () => {
    onDomiciliarChange(id);
    setTimeout(() => atualizarTodasPericias(id), 0);
  });
  c.querySelector('[data-field="domiciliar_sk2"]')?.addEventListener('change', () => {
    onDomiciliarChange(id);
    setTimeout(() => atualizarTodasPericias(id), 0);
  });
  // carga display ao mudar patente ou FOR
  c.querySelector('[data-field="patente"]')?.addEventListener('change', () => {
    atualizarCargaDisplay(id);
  });
  c.addEventListener('input', e => {
    if (e.target.dataset?.field === 'for') atualizarCargaDisplay(id);
  });
  c.querySelector('.foto-file-input')?.addEventListener('change', function (e) {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const img = c.querySelector('.foto-preview-img');
      const ph = c.querySelector('.foto-placeholder-div');
      img.src = ev.target.result; img.style.display = 'block';
      ph.style.display = 'none'; coletarDados(id);
    };
    reader.readAsDataURL(file);
  });
}

function atualizarNomeAba(id) {
  const c = document.getElementById('content-' + id);
  const v = c?.querySelector('[data-field="nome_completo"]')?.value?.trim();
  if (!v) return;
  const f = getFicha(id);
  if (f) { f.nome = v.split(' ')[0]; salvarFichas(id); }
  const t = document.querySelector(`.tab-btn[data-id="${id}"] .tab-name-text`);
  if (t) t.textContent = getFicha(id)?.nome;
}

/* ═══ OBJETOS ═════════════════════════════════════════════════ */
function criarObjetoItem() {
  const div = document.createElement('div');
  div.className = 'objeto-item';
  div.innerHTML = `<input type="text" placeholder="Nome do item">
    <input type="text" placeholder="Descrição ou efeito mágico">
    <button class="btn-del-obj" onclick="removerObjeto(this)" title="Remover">✕</button>`;
  return div;
}
function adicionarObjeto(btn) {
  const lista = btn.closest('.sheet-body').querySelector('.objetos-lista');
  const div = criarObjetoItem();
  lista.appendChild(div);
  div.querySelector('input').focus();
}
function removerObjeto(btn) {
  const lista = btn.closest('.objetos-lista');
  if (lista.children.length <= 1) {
    btn.closest('.objeto-item').querySelectorAll('input').forEach(i => i.value = '');
    return;
  }
  btn.closest('.objeto-item').remove();
}

/* ═══ MISC ════════════════════════════════════════════════════ */
let toastTimer = null;
function mostrarToast(msg) {
  const t = document.getElementById('save-toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}
function debounce(fn, ms) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => { fn.apply(this, args); mostrarToast('✓ Ficha salva'); }, ms);
  };
}

document.getElementById('modal-del').addEventListener('click', function (e) {
  if (e.target === this) fecharModal();
});

document.addEventListener('DOMContentLoaded', function () {
  const modalItens = document.getElementById('modal-itens');
  if (modalItens) {
    modalItens.addEventListener('click', function (e) {
      if (e.target === this) fecharSeletorItens();
    });
  }
});

/* ═══ TEMPLATE DA FICHA ═══════════════════════════════════════ */
function criarFichaHTML(id) {
  const templateEl = document.getElementById('template-ficha');
  if (!templateEl) return '';

  let templateHTML = templateEl.innerHTML;

  // Mude para '${id}' para bater com o que está no seu index.html
  templateHTML = templateHTML.replaceAll('${id}', id);

  return templateHTML;
}

/* ═══ TOTAIS E LIMIARES DE PERÍCIA ════════════════════════════ */

// Valores base de cada perícia extraídos dos labels do HTML
const SKILL_BASE = {
  sk_arremessar: 20, sk_atletismo: 20, sk_conjuracao: 5, sk_defesa: 20,
  sk_encantamento: 20, sk_esquiva: 0, sk_furtividade: 20, sk_luta: 15,
  sk_trevas: 1, sk_magia_combate: 20, sk_natacao: 20, sk_transfiguracao: 5,
  sk_voo: 10, sk_alquimia: 1, sk_antiguidades: 5, sk_aritmancia: 1,
  sk_arqueologia: 1, sk_curandeirismo: 10, sk_trouxas: 10, sk_herbologia: 10,
  sk_historia: 5, sk_leis: 5, sk_pocoes: 10, sk_teoria: 1,
  sk_criaturas: 10, sk_biblioteca: 20, sk_arte: 5, sk_charme: 15,
  sk_disfarce: 5, sk_esconder: 10, sk_escutar: 20, sk_intimidacao: 15,
  sk_labia: 5, sk_linguas: 1, sk_percepcao: 25, sk_prestidigi: 10,
  sk_psicologia: 10, sk_rastreamento: 10, sk_sobrevivencia: 10
};

// Lê o bônus numérico de escola/ensino a partir do texto do span .escola-bonus
function lerBonusEscola(c, skillKey) {
  const span = c.querySelector(`.escola-bonus[data-skill="${skillKey}"]`);
  if (!span || !span.textContent) return 0;
  const m = span.textContent.match(/\+(\d+)/);
  return m ? parseInt(m[1]) : 0;
}

// Lê o valor base de uma perícia a partir do label no DOM
// (sk_esquiva é especial: base = metade de DES)
function lerBasePericia(c, skillKey) {
  if (skillKey === 'sk_esquiva') {
    const des = parseInt(c.querySelector('[data-field="des"]')?.value) || 0;
    return Math.floor(des / 2);
  }
  return SKILL_BASE[skillKey] || 0;
}

// Atualiza o total e os thresholds de UMA perícia
function atualizarPericia(c, skillKey) {
  const base = lerBasePericia(c, skillKey);
  const bonusEsc = lerBonusEscola(c, skillKey);
  const distribEl = c.querySelector(`[data-field="${skillKey}"]`);
  const distrib = parseInt(distribEl?.value) || 0;

  const total = Math.min(99, Math.max(0, base + bonusEsc + distrib));

  // Caixa de total
  const totalEl = c.querySelector(`[data-total="${skillKey}"]`);
  if (totalEl) totalEl.textContent = total + '%';

  // Thresholds
  const thrEl = c.querySelector(`[data-thresh="${skillKey}"]`);
  if (!thrEl) return;

  const regular = total;
  const dificil = Math.floor(total / 2);
  const extremo = Math.floor(total / 5);

  thrEl.innerHTML =
    `<span class="thr-line thr-regular">${regular}</span>` +
    `<span class="thr-sep">/</span>` +
    `<span class="thr-line thr-dificil">${dificil}</span>` +
    `<span class="thr-sep">/</span>` +
    `<span class="thr-line thr-extremo">${extremo}</span>`;
}

// Atualiza TODAS as perícias de uma ficha
function atualizarTodasPericias(id) {
  const c = document.getElementById('content-' + id);
  if (!c) return;
  Object.keys(SKILL_BASE).forEach(sk => atualizarPericia(c, sk));
  // sk_esquiva precisa de DES, então inclui também
  atualizarPericia(c, 'sk_esquiva');
}

/* ═══ BÔNUS DE MÉTODO DE ENSINO (ESCOLA) ══════════════════════ */
const ESCOLA_BONUSES = {
  'hogwarts': { choose: true, choices: [['sk_encantamento', 10], ['sk_defesa', 10]], fixed: [['sk_magia_combate', 5]] },
  'ilvermorny': { choose: false, fixed: [['sk_magia_combate', 10], ['sk_conjuracao', 5]] },
  'beauxbatons': { choose: false, fixed: [['sk_charme', 10], ['sk_prestidigi', 10]] },
  'mahoutokoro': { choose: false, fixed: [['sk_voo', 15], ['sk_esquiva', 5]] },
  'uagadou': { choose: false, fixed: [['sk_conjuracao', 10]] },
  'castelobruxo': { choose: false, fixed: [['sk_herbologia', 10], ['sk_criaturas', 10]] },
  'koldovstoretz': { choose: false, fixed: [['sk_sobrevivencia', 10], ['sk_magia_combate', 5]] },
  'durmstrang': { choose: false, fixed: [['sk_trevas', 10], ['sk_intimidacao', 5]] },
  'domiciliar': null  // handled separately via onDomiciliarChange
};

// Hogwarts tem escolha entre Encantamento ou Defesa — para simplificar, aplicamos ambas como lista
// e o jogador escolhe via nota; aqui mostramos +10% nos dois para destaque visual
// mas na prática o bônus real vem de UMA delas. Ajustar conforme preferência do mestre.
// Na implementação abaixo, mostramos os dois com "(escolha)" discriminado.
const ESCOLA_BONUSES_HOGWARTS_EITHER = ['sk_encantamento', 'sk_defesa'];

function limparBonusEscola(c) {
  c.querySelectorAll('.escola-bonus').forEach(span => {
    span.textContent = '';
    span.title = '';
  });
}

function aplicarBonusEscola(id) {
  const c = document.getElementById('content-' + id);
  if (!c) return;
  limparBonusEscola(c);

  const escola = c.querySelector('[data-field="escola"]')?.value || '';
  if (!escola || escola === 'domiciliar') return;

  const bonus = ESCOLA_BONUSES[escola];
  if (!bonus) return;

  bonus.fixed.forEach(([skill, pct]) => {
    const span = c.querySelector(`.escola-bonus[data-skill="${skill}"]`);
    if (span) {
      span.textContent = ` (+${pct}%)`;
      span.title = 'Bônus do Método de Ensino';
      span.style.fontStyle = '';
    }
  });

  // Hogwarts: aplicar +10% apenas na perícia escolhida pelo jogador
  if (escola === 'hogwarts') {
    const escolha = c.querySelector('[data-field="hogwarts_escolha"]')?.value || '';
    if (escolha) {
      const span = c.querySelector(`.escola-bonus[data-skill="${escolha}"]`);
      if (span) {
        span.textContent = ` (+10%)`;
        span.title = 'Hogwarts: bônus de Método de Ensino';
        span.style.fontStyle = '';
      }
    }
    // Se ainda não escolheu, mostrar "?" nas duas como indicação
    else {
      ESCOLA_BONUSES_HOGWARTS_EITHER.forEach(skill => {
        const span = c.querySelector(`.escola-bonus[data-skill="${skill}"]`);
        if (span) {
          span.textContent = ` (+10%?)`;
          span.title = 'Hogwarts: escolha Encantamento OU Defesa/Protego';
          span.style.fontStyle = 'italic';
        }
      });
    }
  }
}

function onHogwartsChoiceChange(id) {
  aplicarBonusEscola(id);
  setTimeout(() => atualizarTodasPericias(id), 0);
}

function aplicarBonusDomiciliar(id) {
  const c = document.getElementById('content-' + id);
  if (!c) return;
  limparBonusEscola(c);

  const sk1 = c.querySelector('[data-field="domiciliar_sk1"]')?.value || '';
  const sk2 = c.querySelector('[data-field="domiciliar_sk2"]')?.value || '';

  if (!sk1) return;

  if (sk2 && sk2 !== sk1) {
    // Duas perícias: +5% cada
    [sk1, sk2].forEach(skill => {
      const span = c.querySelector(`.escola-bonus[data-skill="${skill}"]`);
      if (span) {
        span.textContent = ` (+5%)`;
        span.title = 'Ensino Domiciliar: +5% (duas perícias escolhidas)';
      }
    });
  } else {
    // Uma perícia: +12%
    const span = c.querySelector(`.escola-bonus[data-skill="${sk1}"]`);
    if (span) {
      span.textContent = ` (+12%)`;
      span.title = 'Ensino Domiciliar: +12% (uma perícia escolhida)';
    }
  }
}

function onEscolaChange(id) {
  const c = document.getElementById('content-' + id);
  if (!c) return;
  const escola = c.querySelector('[data-field="escola"]')?.value || '';
  const isDom = escola === 'domiciliar';
  const isHog = escola === 'hogwarts';

  // Campos condicionais
  const fHog = document.getElementById(`hogwarts-choose-field-${id}`);
  const f1 = document.getElementById(`dom-sk1-field-${id}`);
  const f2 = document.getElementById(`dom-sk2-field-${id}`);
  if (fHog) fHog.style.display = isHog ? '' : 'none';
  if (f1) f1.style.display = isDom ? '' : 'none';
  if (f2) f2.style.display = isDom ? '' : 'none';

  // Limpar selects ao trocar de escola
  if (!isDom) {
    const sk1El = c.querySelector('[data-field="domiciliar_sk1"]');
    const sk2El = c.querySelector('[data-field="domiciliar_sk2"]');
    if (sk1El) sk1El.value = '';
    if (sk2El) sk2El.value = '';
  }
  if (!isHog) {
    const hogEl = c.querySelector('[data-field="hogwarts_escolha"]');
    if (hogEl) hogEl.value = '';
  }

  if (isDom) {
    aplicarBonusDomiciliar(id);
  } else {
    aplicarBonusEscola(id);
  }
}

function onDomiciliarChange(id) {
  aplicarBonusDomiciliar(id);
}

/* ═══ MAPA DE ESPECIALIZAÇÕES → PERÍCIAS ═════════════════════ */
const SPEC_SKILLS = {
  // ── Linha de Combate ────────────────────────────────────────
  'Duelista de Linha': [
    'sk_magia_combate', 'sk_defesa', 'sk_esquiva', 'sk_conjuracao',
    'sk_luta', 'sk_atletismo', 'sk_percepcao', 'sk_transfiguracao'
  ],
  'Artilheiro de Cerco': [
    'sk_magia_combate', 'sk_arremessar', 'sk_encantamento', 'sk_conjuracao',
    'sk_percepcao', 'sk_atletismo', 'sk_teoria', 'sk_esquiva'
  ],
  'Caçador das Trevas': [
    'sk_trevas', 'sk_magia_combate', 'sk_intimidacao', 'sk_furtividade',
    'sk_rastreamento', 'sk_historia', 'sk_defesa', 'sk_esquiva'
  ],
  'Combatente Corpo-a-Corpo': [
    'sk_luta', 'sk_atletismo', 'sk_esquiva', 'sk_natacao',
    'sk_defesa', 'sk_percepcao', 'sk_arremessar', 'sk_sobrevivencia'
  ],
  'Cavaleiro de Vassoura (Aéreo)': [
    'sk_voo', 'sk_magia_combate', 'sk_percepcao', 'sk_arremessar',
    'sk_esquiva', 'sk_atletismo', 'sk_encantamento', 'sk_conjuracao'
  ],
  // ── Linha de Investigação ────────────────────────────────────
  'Investigador Forense': [
    'sk_percepcao', 'sk_biblioteca', 'sk_psicologia', 'sk_disfarce',
    'sk_rastreamento', 'sk_leis', 'sk_escutar', 'sk_arqueologia'
  ],
  'Especialista em Necro-investigação': [
    'sk_trevas', 'sk_historia', 'sk_percepcao', 'sk_psicologia',
    'sk_rastreamento', 'sk_biblioteca', 'sk_antiguidades', 'sk_intimidacao'
  ],
  'Rastreador Mágico': [
    'sk_rastreamento', 'sk_sobrevivencia', 'sk_percepcao', 'sk_furtividade',
    'sk_criaturas', 'sk_atletismo', 'sk_escutar', 'sk_esconder'
  ],
  'Analista Arcano': [
    'sk_teoria', 'sk_aritmancia', 'sk_historia', 'sk_antiguidades',
    'sk_biblioteca', 'sk_percepcao', 'sk_linguas', 'sk_leis'
  ],
  'Agente de Inteligência': [
    'sk_furtividade', 'sk_disfarce', 'sk_escutar', 'sk_psicologia',
    'sk_linguas', 'sk_biblioteca', 'sk_leis', 'sk_percepcao'
  ],
  // ── Linha Social ─────────────────────────────────────────────
  'Diplomata do Ministério': [
    'sk_charme', 'sk_labia', 'sk_leis', 'sk_psicologia',
    'sk_linguas', 'sk_trouxas', 'sk_arte', 'sk_intimidacao'
  ],
  'Infiltrador Social': [
    'sk_disfarce', 'sk_esconder', 'sk_furtividade', 'sk_prestidigi',
    'sk_psicologia', 'sk_percepcao', 'sk_atletismo', 'sk_luta'
  ],
  'Negociador de Crise': [
    'sk_labia', 'sk_psicologia', 'sk_intimidacao', 'sk_charme',
    'sk_percepcao', 'sk_leis', 'sk_escutar', 'sk_defesa'
  ],
  'Especialista em Trouxas': [
    'sk_trouxas', 'sk_disfarce', 'sk_charme', 'sk_labia',
    'sk_prestidigi', 'sk_arte', 'sk_linguas', 'sk_percepcao'
  ],
  'Mediador Mágico-Criatura': [
    'sk_criaturas', 'sk_linguas', 'sk_charme', 'sk_psicologia',
    'sk_herbologia', 'sk_sobrevivencia', 'sk_percepcao', 'sk_labia'
  ],
  // ── Linha de Campo ───────────────────────────────────────────
  'Batedor de Fronteira': [
    'sk_sobrevivencia', 'sk_furtividade', 'sk_esconder', 'sk_rastreamento',
    'sk_atletismo', 'sk_natacao', 'sk_percepcao', 'sk_arremessar'
  ],
  'Magizoologista': [
    'sk_criaturas', 'sk_herbologia', 'sk_sobrevivencia', 'sk_rastreamento',
    'sk_percepcao', 'sk_arremessar', 'sk_natacao', 'sk_voo'
  ],
  'Curandeiro de Campo': [
    'sk_curandeirismo', 'sk_herbologia', 'sk_pocoes', 'sk_psicologia',
    'sk_percepcao', 'sk_biblioteca', 'sk_alquimia', 'sk_sobrevivencia'
  ],
  'Alquimista de Campo': [
    'sk_alquimia', 'sk_pocoes', 'sk_herbologia', 'sk_teoria',
    'sk_biblioteca', 'sk_curandeirismo', 'sk_conjuracao', 'sk_arqueologia'
  ],
  'Explorador de Ruínas': [
    'sk_arqueologia', 'sk_antiguidades', 'sk_sobrevivencia', 'sk_esconder',
    'sk_percepcao', 'sk_rastreamento', 'sk_historia', 'sk_furtividade'
  ],
};

function aplicarHighlightEspecializacao(id) {
  const c = document.getElementById('content-' + id);
  if (!c) return;
  const spec = c.querySelector('[data-field="especializacao"]')?.value || '';
  const pericias = SPEC_SKILLS[spec] || [];

  c.querySelectorAll('.skill-item').forEach(item => {
    const field = item.querySelector('[data-field]')?.dataset.field;
    if (pericias.includes(field)) {
      item.classList.add('ocupacao');
    } else {
      item.classList.remove('ocupacao');
    }
  });
}

/* ═══ EXPORTAR / IMPORTAR ═════════════════════════════════════ */
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
      // garante IDs únicos para não colidir com fichas existentes
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
  this.value = ''; // reset para permitir reimportar o mesmo arquivo
});

/* ═══ ITENS DE MISSÃO ════════════════════════════════════════ */

const ITEMS_DATA = [
  // ── Rank 1 — Cadete ──────────────────────────────────────────
  {
    id: 'pocao_cura_menor',
    nome: 'Poção de Cura Menor',
    rank: 1, rankNome: 'Cadete', tipo: 'Poção',
    peso: 1, usos: 2, categoria: 'Cura',
    descricao: 'Uma poção simples de cura rápida, padrão do kit de campo de todo Cadete.',
    efeito: 'Restaura 1d4 HP ao ser consumida. Pode ser usada na Ação de Combate.',
  },
  {
    id: 'pocao_wiggenweld',
    nome: 'Poção Wiggenweld',
    rank: 1, rankNome: 'Cadete', tipo: 'Poção',
    peso: 1, usos: 3, categoria: 'Cura',
    descricao: 'Preparado amarelo-esverdeado de uso rápido, distribuído a todos os Cadetes antes de operações de campo.',
    efeito: 'Restaura 1d4+2 HP imediatamente. Pode ser usada como Ação Livre (não consome a Ação de Combate).',
  },
  {
    id: 'tintura_revigorante',
    nome: 'Tintura Revigorante',
    rank: 1, rankNome: 'Cadete', tipo: 'Poção',
    peso: 1, usos: 2, categoria: 'Aprimoramento',
    descricao: 'Extrato concentrado de raiz de mandágora jovem misturado a cristal mágico dissolvido.',
    efeito: 'Concede +5% em Magia de Combate durante 2 rodadas após consumo.',
  },
  {
    id: 'faisca_explosiva',
    nome: 'Faísca Explosiva',
    rank: 1, rankNome: 'Cadete', tipo: 'Consumível',
    peso: 1, usos: 2, categoria: 'Ofensivo',
    descricao: 'Pequena esfera de vidro encantado carregada com energia cinética mágica. Padrão de treinamento do Ministério.',
    efeito: 'Ao arremessar (alcance 5m), causa 1d4 de dano a 1 alvo. Rola Arremessar para acertar (CD 30).',
  },
  // ── Rank 2 — Investigador ─────────────────────────────────────
  {
    id: 'pocao_vigor',
    nome: 'Poção de Vigor',
    rank: 2, rankNome: 'Investigador', tipo: 'Poção',
    peso: 1, usos: 2, categoria: 'Aprimoramento',
    descricao: 'Fórmula padrão de campo que acelera reflexos e resistência muscular.',
    efeito: 'Concede +10% em Atletismo/Pular e Esquiva por 2 rodadas.',
  },
  {
    id: 'antidoto_simples',
    nome: 'Antídoto Simples',
    rank: 2, rankNome: 'Investigador', tipo: 'Poção',
    peso: 1, usos: 1, categoria: 'Contra-efeito',
    descricao: 'Contraveneno básico aprovado pelo Departamento de Mágica para desfazer amarras e restrições menores.',
    efeito: 'Remove imediatamente 1 efeito de Restrição sofrido (efeito da Ação de Cenário inimiga).',
  },
  {
    id: 'pocao_cura_padrao',
    nome: 'Poção de Cura Padrão',
    rank: 2, rankNome: 'Investigador', tipo: 'Poção',
    peso: 1, usos: 2, categoria: 'Cura',
    descricao: 'Versão aprimorada da poção de cura básica, com ingredientes de maior concentração.',
    efeito: 'Restaura 1d6+1 HP ao ser consumida.',
  },
  {
    id: 'pocao_engrossante',
    nome: 'Poção Engrossante',
    rank: 2, rankNome: 'Investigador', tipo: 'Poção',
    peso: 1, usos: 1, categoria: 'Aprimoramento',
    descricao: 'Fórmula estudada nos livros de magia de Hogwarts que estimula o tecido muscular temporariamente.',
    efeito: 'Concede +10% em Luta Corporal e Atletismo/Pular por 2 rodadas.',
  },
  {
    id: 'pedra_bezoar',
    nome: 'Pedra Bezoar',
    rank: 2, rankNome: 'Investigador', tipo: 'Consumível',
    peso: 1, usos: 1, categoria: 'Contra-efeito',
    descricao: 'Pedra retirada do estômago de uma cabra, conhecida desde os primórdios da feitiçaria como antídoto universal para a maioria dos venenos.',
    efeito: 'Remove todos os efeitos de veneno e envenenamento ativos. Pode ser usada como Ação de Reação.',
  },
  {
    id: 'cristal_sinalizacao',
    nome: 'Cristal de Sinalização',
    rank: 2, rankNome: 'Investigador', tipo: 'Utilitário',
    peso: 1, usos: 3, categoria: 'Tático',
    descricao: 'Pequeno cristal encantado pelo Departamento de Mistérios. Invisível a não-bruxos.',
    efeito: 'Ao quebrar, emite um farol mágico visível apenas a Aurores com Rastreamento Mágico por 1 hora. Pode ser usado para marcar pontos de encontro ou posição de alvos.',
  },
  // ── Rank 3 — Auror ────────────────────────────────────────────
  {
    id: 'pocao_postura',
    nome: 'Poção de Postura',
    rank: 3, rankNome: 'Auror', tipo: 'Poção',
    peso: 1, usos: 2, categoria: 'Recuperação',
    descricao: 'Elixir que reforça o campo mágico pessoal, regenerando a guarda do bruxo instantaneamente.',
    efeito: 'Recupera 1d6 de Postura imediatamente ao ser consumida. Pode ser usada na Ação de Combate.',
  },
  {
    id: 'elixir_clareza',
    nome: 'Elixir de Clareza',
    rank: 3, rankNome: 'Auror', tipo: 'Poção',
    peso: 1, usos: 1, categoria: 'Recuperação',
    descricao: 'Fórmula destinada a reverter os efeitos do esgotamento mágico em campo.',
    efeito: 'Elimina imediatamente 1 efeito de Exaustão ativo (equivale a recuperar 1 PM para fins de remoção da condição de Exaustão).',
  },
  {
    id: 'filtro_nevoa',
    nome: 'Filtro de Névoa Mental',
    rank: 3, rankNome: 'Auror', tipo: 'Poção',
    peso: 2, usos: 2, categoria: 'Furtividade',
    descricao: 'Poção densa que turva a percepção alheia, tornando o bruxo difícil de rastrear ou identificar.',
    efeito: 'Concede Vantagem em Furtividade e Disfarce/Polissuco por 3 rodadas.',
  },
  {
    id: 'pocao_restaurativa',
    nome: 'Poção Restaurativa',
    rank: 3, rankNome: 'Auror', tipo: 'Poção',
    peso: 1, usos: 1, categoria: 'Recuperação',
    descricao: 'Elixir azul-cobalto de formulação complexa que revitaliza o reservatório de energia mágica do bruxo.',
    efeito: 'Restaura 1d6 PM imediatamente ao ser consumida.',
  },
  {
    id: 'granada_confusao',
    nome: 'Granada de Confusão',
    rank: 3, rankNome: 'Auror', tipo: 'Consumível',
    peso: 2, usos: 1, categoria: 'Tático',
    descricao: 'Frasco encantado que ao se romper libera névoa arcana desorientante. Desenvolvido pelo Departamento de Aplicação da Lei Mágica.',
    efeito: 'Ao arremessar (alcance 6m, rola Arremessar CD 25), todos os alvos em 2m sofrem Desvantagem em Magia de Combate por 2 rodadas.',
  },
  {
    id: 'amuleto_runico',
    nome: 'Amuleto Rúnico Descartável',
    rank: 3, rankNome: 'Auror', tipo: 'Utilitário',
    peso: 1, usos: 1, categoria: 'Proteção',
    descricao: 'Disco de madeira de árvore de cinzas gravado com runas protetoras de uso único. Ativa-se automaticamente ao detectar dano.',
    efeito: 'Absorve automaticamente o próximo dano de HP recebido (máximo 8 pontos). Quebra após uso.',
  },
  // ── Rank 4 — Inspetor ─────────────────────────────────────────
  {
    id: 'pocao_adrenalina',
    nome: 'Poção de Adrenalina Arcana',
    rank: 4, rankNome: 'Inspetor', tipo: 'Poção',
    peso: 2, usos: 1, categoria: 'Aprimoramento',
    descricao: 'Fórmula de uso restrito que sobrescreve temporariamente os limites fisiológicos e mágicos do bruxo.',
    efeito: '+15% em Magia de Combate e +1d4 de dano HP extra em todos os ataques por 2 rodadas.',
  },
  {
    id: 'elixir_espelho',
    nome: 'Elixir do Espelho',
    rank: 4, rankNome: 'Inspetor', tipo: 'Poção',
    peso: 1, usos: 2, categoria: 'Percepção',
    descricao: 'Preparado que amplia dramaticamente os sentidos arcanos do bruxo, revelando rastros ocultos.',
    efeito: 'Concede Vantagem em Percepção/Revelare e Rastreamento Mágico por 3 rodadas.',
  },
  {
    id: 'pocao_resiliencia',
    nome: 'Poção de Resiliência',
    rank: 4, rankNome: 'Inspetor', tipo: 'Poção',
    peso: 2, usos: 1, categoria: 'Proteção',
    descricao: 'Bebida de uso restrito que cria uma barreira mágica subcutânea para absorver o próximo impacto.',
    efeito: 'Reduz o próximo dano de HP recebido em 1d6 (mínimo 0). O efeito se encerra após absorver 1 ataque.',
  },
  {
    id: 'pocao_polissuco',
    nome: 'Poção Polissuco',
    rank: 4, rankNome: 'Inspetor', tipo: 'Poção',
    peso: 2, usos: 1, categoria: 'Furtividade',
    descricao: 'A poção de transformação mais controlada do arsenal do Ministério. Requer um mês de preparo e um fio de cabelo do alvo para funcionar.',
    efeito: 'Fora de combate: transforma o bruxo em outra pessoa por até 1 hora. Em combate: Vantagem em Disfarce/Polissuco e Intimidação por 3 rodadas.',
  },
  {
    id: 'veritaserum',
    nome: 'Veritaserum',
    rank: 4, rankNome: 'Inspetor', tipo: 'Poção',
    peso: 1, usos: 1, categoria: 'Investigação',
    descricao: 'Soro da Verdade de uso rigorosamente controlado pelo Ministério. Três gotas bastam para forçar a verdade mais profunda.',
    efeito: 'Administrado a um alvo imobilizado ou incapacitado, força respostas verdadeiras por 10 minutos (uso exclusivo fora de combate). Requer Ação de Cenário para aplicar.',
  },
  {
    id: 'bomba_confundus',
    nome: 'Bomba de Confundus',
    rank: 4, rankNome: 'Inspetor', tipo: 'Consumível',
    peso: 2, usos: 1, categoria: 'Ofensivo',
    descricao: 'Artefato proibido em competições mágicas, autorizado apenas para operações do Ministério. Infunde o feitiço Confundus em uma área ao detonar.',
    efeito: 'Ao detonar em área de 2m, aplica Confundus: alvos afetados sofrem Desvantagem em todas as rolagens por 2 rodadas, sem direito a resistência.',
  },
  // ── Rank 5 — Comandante ───────────────────────────────────────
  {
    id: 'pocao_fenix',
    nome: 'Poção Fênix',
    rank: 5, rankNome: 'Comandante', tipo: 'Poção',
    peso: 2, usos: 1, categoria: 'Cura',
    descricao: 'A mais rara e poderosa poção de campo existente no arsenal do Ministério. Reservada para situações de risco extremo.',
    efeito: 'Restaura imediatamente 2d6 HP e recupera 1d4 PM. Pode ser usada na Ação de Combate.',
  },
  {
    id: 'elixir_duelo',
    nome: 'Elixir do Duelo Perfeito',
    rank: 5, rankNome: 'Comandante', tipo: 'Poção',
    peso: 2, usos: 1, categoria: 'Aprimoramento',
    descricao: 'Fórmula lendária que sincroniza completamente mente, corpo e varinha para o confronto definitivo.',
    efeito: '+20% em Magia de Combate e Defesa/Protego por 3 rodadas.',
  },
  {
    id: 'pocao_reflexos',
    nome: 'Poção de Reflexos Supremos',
    rank: 5, rankNome: 'Comandante', tipo: 'Poção',
    peso: 2, usos: 1, categoria: 'Aprimoramento',
    descricao: 'Poção de acesso exclusivo a Comandantes que reduz o tempo de reação a níveis sobre-humanos.',
    efeito: 'Concede Vantagem em Esquiva e Defesa/Protego por 3 rodadas.',
  },
  {
    id: 'felix_felicis',
    nome: 'Felix Felicis',
    rank: 5, rankNome: 'Comandante', tipo: 'Poção',
    peso: 2, usos: 1, categoria: 'Aprimoramento',
    descricao: 'A lendária Poção da Sorte Líquida. Incrivelmente difícil de preparar e perigosa em excesso. Concedida apenas a Comandantes em missões de alto risco.',
    efeito: 'Por 3 rodadas, todas as rolagens de perícia têm Vantagem automática. Após o efeito, o bruxo fica Exausto por 1 rodada (não pode agir).',
  },
  {
    id: 'elixir_da_vida',
    nome: 'Elixir da Vida',
    rank: 5, rankNome: 'Comandante', tipo: 'Poção',
    peso: 2, usos: 1, categoria: 'Sobrevivência',
    descricao: 'Destilado da Pedra Filosofal, de existência lendária. A dose concedida pelo Ministério é suficiente para uma única intervenção crítica.',
    efeito: 'Ativa automaticamente ao chegar a 0 HP, restaurando 1d8+2 HP imediatamente. Passivo — não requer ação. Uso único por missão.',
  },
  {
    id: 'lagrimas_fenix',
    nome: 'Lágrimas de Fênix',
    rank: 5, rankNome: 'Comandante', tipo: 'Consumível',
    peso: 1, usos: 1, categoria: 'Cura',
    descricao: 'As lágrimas de uma fênix têm propriedades curativas incomparáveis. Este pequeno frasco representa anos de coleta cuidadosa.',
    efeito: 'Cura imediatamente 2d6+4 HP e remove todos os efeitos negativos ativos (veneno, Exaustão, Restrição). Pode ser usada como Ação Livre.',
  },
];

const RANK_NUMEROS = {
  'Cadete': 1,
  'Investigador': 2,
  'Auror': 3,
  'Inspetor': 4,
  'Comandante': 5,
};

function capacidadeCarga(id) {
  const sheet = document.getElementById(`sheet-${id}`);
  const c = document.getElementById(`content-${id}`);
  const container = sheet || c;
  if (!container) return 1;
  const forEl = container.querySelector('[data-field="for"]');
  const forVal = forEl ? parseInt(forEl.value) || 0 : 0;
  return Math.max(1, Math.floor(forVal / 20));
}

function calcularPesoAtual(id) {
  const ficha = fichas.find(f => f.id === id);
  if (!ficha || !ficha._itens_mochila) return 0;
  return ficha._itens_mochila.reduce((total, entry) => {
    const item = ITEMS_DATA.find(i => i.id === entry.id);
    return total + (item ? item.peso : 0);
  }, 0);
}

function atualizarCargaDisplay(id) {
  const el = document.getElementById(`carga-display-${id}`);
  if (!el) return;
  const max = capacidadeCarga(id);
  const atual = calcularPesoAtual(id);
  el.textContent = `${atual} / ${max}`;
  el.style.color = atual >= max ? 'var(--crimson)' : 'var(--gold)';
}

function abrirSeletorItens(id) {
  modalItensId = id;
  const ficha = fichas.find(f => f.id === id);
  // Try reading from DOM first (most current value), fallback to saved dados
  const c = document.getElementById(`content-${id}`);
  const patenteSelect = c ? c.querySelector('[data-field="patente"]') : null;
  const patente = patenteSelect ? patenteSelect.value : (ficha && ficha.dados ? (ficha.dados.patente || '') : '');
  const rankNum = RANK_NUMEROS[patente] || 1;

  const patenteLabel = document.getElementById('modal-itens-patente');
  if (patenteLabel) {
    patenteLabel.textContent = patente ? `Patente: ${patente} — Itens disponíveis até Rank ${rankNum}` : 'Itens disponíveis para sua patente (Rank 1)';
  }

  const catalogo = document.getElementById('itens-catalogo');
  if (!catalogo) return;

  const itensDisponiveis = ITEMS_DATA.filter(i => i.rank <= rankNum);

  if (itensDisponiveis.length === 0) {
    catalogo.innerHTML = '<p style="color:var(--gold);text-align:center;padding:20px">Nenhum item disponível para esta patente.</p>';
  } else {
    // Group by rank
    const grupos = {};
    itensDisponiveis.forEach(item => {
      if (!grupos[item.rank]) grupos[item.rank] = [];
      grupos[item.rank].push(item);
    });

    catalogo.innerHTML = Object.keys(grupos).sort().map(rank => {
      const items = grupos[rank];
      const rankNome = items[0].rankNome;
      return `<div class="catalogo-rank-group">
        <h4 class="catalogo-rank-title">Rank ${rank} — ${rankNome}</h4>
        ${items.map(item => `
          <div class="item-card item-card-catalogo">
            <div class="item-card-header">
              <span class="item-nome">${item.nome}</span>
              <div class="item-badges">
                <span class="item-badge-rank rank-${item.rank}">Rank ${item.rank}</span>
                <span class="item-badge-tipo tipo-${(item.tipo||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z]/g,'')}">${item.tipo||''}</span>
                <span class="item-badge-peso">⚖️ ${item.peso}</span>
                <span class="item-badge-usos">🔁 ${item.usos}x</span>
                <span class="item-badge-cat">${item.categoria}</span>
              </div>
            </div>
            <div class="item-card-body">
              <p class="item-descricao">${item.descricao}</p>
              <p class="item-efeito"><strong>Efeito:</strong> ${item.efeito}</p>
            </div>
            <button class="btn-adicionar-item" onclick="adicionarItemMochila('${id}', '${item.id}')">+ Adicionar</button>
          </div>
        `).join('')}
      </div>`;
    }).join('');
  }

  document.getElementById('modal-itens').classList.add('open');
}

function fecharSeletorItens() {
  document.getElementById('modal-itens').classList.remove('open');
  modalItensId = null;
}

function adicionarItemMochila(fichaId, itemId) {
  const item = ITEMS_DATA.find(i => i.id === itemId);
  if (!item) return;

  const ficha = fichas.find(f => f.id === fichaId);
  if (!ficha) return;

  if (!ficha._itens_mochila) ficha._itens_mochila = [];

  const pesoAtual = calcularPesoAtual(fichaId);
  const max = capacidadeCarga(fichaId);

  if (pesoAtual + item.peso > max) {
    mostrarToast('Carga máxima atingida!');
    return;
  }

  ficha._itens_mochila.push({ id: itemId, usosRestantes: item.usos });
  salvarFichas();
  renderizarItensMochila(fichaId);
  atualizarCargaDisplay(fichaId);
}

function removerItemMochila(fichaId, itemId, index) {
  const ficha = fichas.find(f => f.id === fichaId);
  if (!ficha || !ficha._itens_mochila) return;
  ficha._itens_mochila.splice(index, 1);
  salvarFichas();
  renderizarItensMochila(fichaId);
  atualizarCargaDisplay(fichaId);
}

function renderizarItensMochila(id) {
  const lista = document.getElementById(`itens-lista-${id}`);
  if (!lista) return;

  const ficha = fichas.find(f => f.id === id);
  const itens = ficha ? (ficha._itens_mochila || []) : [];

  if (itens.length === 0) {
    lista.innerHTML = '<p class="itens-vazio">Nenhum item na mochila. Clique em "Adicionar Item" para equipar itens disponíveis para sua patente.</p>';
    return;
  }

  lista.innerHTML = itens.map((entry, index) => {
    const item = ITEMS_DATA.find(i => i.id === entry.id);
    if (!item) return '';
    return `
      <div class="item-card item-card-mochila">
        <div class="item-card-header">
          <span class="item-nome">${item.nome}</span>
          <div class="item-badges">
            <span class="item-badge-rank rank-${item.rank}">Rank ${item.rank}</span>
            <span class="item-badge-tipo tipo-${(item.tipo||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z]/g,'')}">${item.tipo||''}</span>
            <span class="item-badge-peso">⚖️ ${item.peso}</span>
            <span class="item-badge-usos">🔁 ${entry.usosRestantes}x</span>
            <span class="item-badge-cat">${item.categoria}</span>
          </div>
          <button class="btn-remover-item" onclick="removerItemMochila('${id}', '${entry.id}', ${index})">✕ Remover</button>
        </div>
        <div class="item-card-body">
          <p class="item-descricao">${item.descricao}</p>
          <p class="item-efeito"><strong>Efeito:</strong> ${item.efeito}</p>
        </div>
      </div>
    `;
  }).join('');
}

/* ═══ INIT ════════════════════════════════════════════════════ */
document.getElementById('btn-nova-aba').addEventListener('click', novaAba);

async function initApp() {
  // Sem Firebase configurado → modo localStorage local
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
      // Primeiro acesso: migrar localStorage ou criar padrão
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

  // Ativa o listener de tempo real
  dbListenFichas(_aplicarMudancaRemota);
}

// Chamado pelo Firestore quando outra sessão altera uma ficha
function _aplicarMudancaRemota(fichaId, fichaRemota) {
  const idx = fichas.findIndex(f => f.id === fichaId);

  if (!fichaRemota) {
    // Ficha foi removida remotamente
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
    // Nova ficha de outro jogador (visível só para o Mestre)
    fichas.push(fichaRemota);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fichas));
    renderTabs();
    mostrarToast('↻ Nova ficha detectada: ' + fichaRemota.nome);
    return;
  }

  fichas[idx] = { ...fichas[idx], ...fichaRemota };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(fichas));

  // Atualiza o nome na aba imediatamente
  const tabText = document.querySelector(`.tab-btn[data-id="${fichaId}"] .tab-name-text`);
  if (tabText) tabText.textContent = fichaRemota.nome;

  const ehProprietario = fichaRemota.user_id === DB_USER?.uid;

  if (fichaId === abaAtiva && !ehProprietario) {
    // Mestre está vendo a ficha de outro jogador → atualiza o form em tempo real
    preencherFicha(fichaId, fichaRemota.dados);
    mostrarToast('↻ Ficha atualizada ao vivo');
  } else if (fichaId !== abaAtiva) {
    mostrarToast('↻ ' + fichaRemota.nome + ' atualizou sua ficha');
  }
  // Se o usuário é dono e está na aba → ignora (não sobrescreve o que está digitando)
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

/* ═══════════════════════════════════════════════════════════════
   SISTEMA DE ROLAGEM DE DADOS (d100)
═══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  // ─── Estado global de vantagem ────────────────────────────────
  let advQty = 1; // quantos dados extras (1 = rolagem dupla, 2 = tripla, etc.)

  // ─── Utilitários ─────────────────────────────────────────────
  const isMobile = () => window.matchMedia('(max-width: 600px)').matches;

  function rollD100() {
    return Math.floor(Math.random() * 100) + 1;
  }

  function classifyResult(roll, skillTotal) {
    const extremo = Math.floor(skillTotal / 5);
    const dificil = Math.floor(skillTotal / 2);
    if (roll === 1) return { label: 'Crítico!', cls: 'res-critico', success: true };
    if (roll <= extremo) return { label: 'Sucesso Extremo', cls: 'res-extremo', success: true };
    if (roll <= dificil) return { label: 'Sucesso Difícil', cls: 'res-dificil', success: true };
    if (roll <= skillTotal) return { label: 'Sucesso Regular', cls: 'res-regular', success: true };
    if (roll >= 96) return { label: 'Falha Crítica!', cls: 'res-falha-crit', success: false };
    return { label: 'Falha', cls: 'res-falha', success: false };
  }

  // ─── Popup ────────────────────────────────────────────────────
  let popupEl = null;
  let fadeTimer = null;
  let autoCloseTimer = null;

  function getOrCreatePopup() {
    if (!popupEl) {
      popupEl = document.createElement('div');
      popupEl.className = 'dice-popup';
      popupEl.style.display = 'none';
      document.body.appendChild(popupEl);
    }
    return popupEl;
  }

  function clearTimers() {
    if (fadeTimer) { clearTimeout(fadeTimer); fadeTimer = null; }
    if (autoCloseTimer) { clearTimeout(autoCloseTimer); autoCloseTimer = null; }
  }

  function closePopup() {
    clearTimers();
    if (!popupEl) return;
    popupEl.classList.add('fade-out');
    fadeTimer = setTimeout(() => {
      if (popupEl) popupEl.style.display = 'none';
    }, 420);
  }

  function showRolling(skillName) {
    const el = getOrCreatePopup();
    clearTimers();
    el.classList.remove('fade-out');
    el.style.display = 'block';
    el.innerHTML = `
      <div class="dice-popup-header">
        <span class="dice-popup-skill">${skillName}</span>
        <button class="dice-popup-close" title="Fechar">✕</button>
      </div>
      <div class="dice-popup-rolling">
        Jogando dados<span class="rolling-dots">...</span>
      </div>
    `;
    el.querySelector('.dice-popup-close').addEventListener('click', closePopup);
  }

  function showResult(skillName, skillTotal, rolls, mode) {
    // mode: 'normal' | 'advantage' | 'disadvantage' | 'multi'
    const el = getOrCreatePopup();
    clearTimers();
    el.classList.remove('fade-out');
    el.style.display = 'block';

    // ── Multi-roll: mostrar todos os resultados em ordem ──────────
    if (mode === 'multi') {
      let modeLabel = `<span class="dice-mode-tag">🔁 Múltiplas rolagens ×${rolls.length}</span>`;
      const extremo = Math.floor(skillTotal / 5);
      const dificil = Math.floor(skillTotal / 2);

      let rowsHtml = '';
      rolls.forEach((r, i) => {
        const res = classifyResult(r, skillTotal);
        rowsHtml += `
          <div class="multi-roll-row">
            <span class="multi-roll-num">#${i + 1}</span>
            <span class="multi-roll-val ${res.cls}">${r}</span>
            <span class="multi-roll-result ${res.cls}">${res.label}</span>
            <span class="multi-roll-thresholds">${skillTotal}|${dificil}|${extremo}</span>
          </div>`;
      });

      el.innerHTML = `
        <div class="dice-popup-header">
          <span class="dice-popup-skill">${skillName}</span>
          <button class="dice-popup-close" title="Fechar">✕</button>
        </div>
        ${modeLabel}
        <div class="dice-popup-multi-rolls">${rowsHtml}</div>
      `;
      el.querySelector('.dice-popup-close').addEventListener('click', closePopup);
      autoCloseTimer = setTimeout(closePopup, 8000);
      return;
    }

    // ── Advantage / Disadvantage / Normal ────────────────────────
    let selectedRoll, discardedRolls;
    if (mode === 'advantage') {
      selectedRoll = Math.min(...rolls);
      const idx = rolls.indexOf(selectedRoll);
      discardedRolls = rolls.filter((_, i) => i !== idx);
    } else if (mode === 'disadvantage') {
      selectedRoll = Math.max(...rolls);
      const idx = rolls.indexOf(selectedRoll);
      discardedRolls = rolls.filter((_, i) => i !== idx);
    } else {
      selectedRoll = rolls[0];
      discardedRolls = [];
    }

    const res = classifyResult(selectedRoll, skillTotal);

    // Etiqueta de modo
    let modeLabel = '';
    if (mode === 'advantage') modeLabel = `<span class="dice-mode-tag">⬆ Vantagem ×${rolls.length}</span>`;
    if (mode === 'disadvantage') modeLabel = `<span class="dice-mode-tag">⬇ Desvantagem ×${rolls.length}</span>`;

    // Dados exibidos
    let rollsHtml = '';
    if (rolls.length > 1) {
      rollsHtml = '<div class="dice-popup-rolls">';
      rolls.forEach((r, i) => {
        const isSelected = (r === selectedRoll && !rolls.slice(0, i).includes(selectedRoll));
        const cls = isSelected ? 'selected' : 'discarded';
        rollsHtml += `<div><div class="dice-single ${cls}">${r}</div>${isSelected ? '<div class="dice-selected-label">usado</div>' : ''}</div>`;
        if (i < rolls.length - 1) rollsHtml += `<span class="dice-arrow">${mode === 'advantage' ? '↓' : '↑'}</span>`;
      });
      rollsHtml += '</div>';
    }

    const extremo = Math.floor(skillTotal / 5);
    const dificil = Math.floor(skillTotal / 2);
    const againstText = `Perícia: ${skillTotal}% | ½=${dificil} | ⅕=${extremo}`;

    el.innerHTML = `
      <div class="dice-popup-header">
        <span class="dice-popup-skill">${skillName}</span>
        <button class="dice-popup-close" title="Fechar">✕</button>
      </div>
      ${modeLabel}
      ${rollsHtml}
      <div class="dice-result-main">
        <div class="dice-result-value ${res.cls}">${selectedRoll}</div>
        <div class="dice-result-info">
          <div class="dice-result-type ${res.cls}">${res.label}</div>
          <div class="dice-result-against">${againstText}</div>
        </div>
      </div>
    `;
    el.querySelector('.dice-popup-close').addEventListener('click', closePopup);
    autoCloseTimer = setTimeout(closePopup, 5000);
  }

  // ─── Execução da rolagem ──────────────────────────────────────
  function executeRoll(skillName, skillTotal, mode) {
    showRolling(skillName);

    let numDice;
    if (mode === 'normal') {
      numDice = 1;
    } else {
      numDice = 1 + advQty; // ex: advQty=1 → 2 dados
    }

    setTimeout(() => {
      const rolls = Array.from({ length: numDice }, rollD100);
      showResult(skillName, skillTotal, rolls, mode);
    }, 450);
  }

  // ─── Contexto: lê total de perícia do DOM ─────────────────────
  function getSkillInfo(totalEl) {
    const text = totalEl.textContent.trim().replace('%', '');
    const total = parseInt(text) || 0;
    // nome: pega do label irmão
    const item = totalEl.closest('.skill-item');
    const labelText = item?.querySelector('.skill-label-text')?.textContent?.trim() || 'Perícia';
    const name = labelText.replace(/\(.*?\)/g, '').trim();
    return { name, total };
  }

  function getSorteInfo(sorteBox) {
    const val = sorteBox.querySelector('[data-field="sorte_atual"]')?.value;
    const total = parseInt(val) || 0;
    return { name: 'Sorte', total };
  }

  // ─── Menu de contexto (clique direito / long press) ──────────
  let ctxMenuEl = null;
  let longPressTimer = null;
  let longPressFired = false;

  function removeCtxMenu() {
    if (ctxMenuEl) { ctxMenuEl.remove(); ctxMenuEl = null; }
  }

  function showCtxMenu(x, y, skillName, skillTotal) {
    removeCtxMenu();
    ctxMenuEl = document.createElement('div');
    ctxMenuEl.className = 'dice-ctx-menu';

    ctxMenuEl.innerHTML = `
      <div class="dice-ctx-title">Modo de Rolagem — ${skillName}</div>
      <div class="dice-ctx-item" data-mode="advantage">
        <span class="ctx-icon">⬆</span>
        <span>Vantagem <small style="color:#888">(menor resultado)</small></span>
      </div>
      <div class="dice-ctx-item" data-mode="disadvantage">
        <span class="ctx-icon">⬇</span>
        <span>Desvantagem <small style="color:#888">(maior resultado)</small></span>
      </div>
      <div class="dice-ctx-item" data-mode="multi">
        <span class="ctx-icon">🔁</span>
        <span>Múltiplas <small style="color:#888">(sem escolha, em ordem)</small></span>
      </div>
      <hr class="dice-ctx-sep">
      <div class="adv-controls-bar">
        <label>Qtd. de dados extras</label>
        <button class="adv-qty-btn" id="adv-qty-minus">−</button>
        <span class="adv-qty-val" id="adv-qty-display">${advQty}</span>
        <button class="adv-qty-btn" id="adv-qty-plus">+</button>
      </div>
    `;
    document.body.appendChild(ctxMenuEl);

    // Posicionar
    const menuW = 230, menuH = 200;
    const vw = window.innerWidth, vh = window.innerHeight;
    let left = x, top = y;
    if (left + menuW > vw - 8) left = vw - menuW - 8;
    if (top + menuH > vh - 8) top = vh - menuH - 8;
    if (left < 8) left = 8;
    if (top < 8) top = 8;
    ctxMenuEl.style.left = left + 'px';
    ctxMenuEl.style.top = top + 'px';

    // Qtd handlers
    ctxMenuEl.querySelector('#adv-qty-minus').addEventListener('click', e => {
      e.stopPropagation();
      if (advQty > 1) { advQty--; ctxMenuEl.querySelector('#adv-qty-display').textContent = advQty; }
    });
    ctxMenuEl.querySelector('#adv-qty-plus').addEventListener('click', e => {
      e.stopPropagation();
      if (advQty < 9) { advQty++; ctxMenuEl.querySelector('#adv-qty-display').textContent = advQty; }
    });

    // Cliques de modo
    ctxMenuEl.querySelectorAll('[data-mode]').forEach(item => {
      item.addEventListener('click', e => {
        e.stopPropagation();
        const mode = item.dataset.mode;
        removeCtxMenu();
        executeRoll(skillName, skillTotal, mode);
      });
    });

    // Fechar ao clicar fora
    setTimeout(() => {
      document.addEventListener('click', removeCtxMenu, { once: true });
    }, 10);
  }

  // ─── Bind em um skill-total ou sorte box ─────────────────────
  function bindDiceEvents(el, getInfo) {
    // Clique esquerdo normal → rolagem normal
    el.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      if (longPressFired) { longPressFired = false; return; }
      const { name, total } = getInfo(el);
      if (!total) return;
      executeRoll(name, total, 'normal');
    });

    // Clique direito → menu
    el.addEventListener('contextmenu', e => {
      e.preventDefault();
      const { name, total } = getInfo(el);
      if (!total) return;
      showCtxMenu(e.clientX, e.clientY, name, total);
    });

    // Long press para mobile
    el.addEventListener('touchstart', e => {
      longPressFired = false;
      const touch = e.touches[0];
      const { name, total } = getInfo(el);
      if (!total) return;
      longPressTimer = setTimeout(() => {
        longPressFired = true;
        // Vibrar levemente se disponível
        if (navigator.vibrate) navigator.vibrate(40);
        showCtxMenu(touch.clientX, touch.clientY, name, total);
      }, 550);
    }, { passive: true });

    el.addEventListener('touchend', () => {
      clearTimeout(longPressTimer);
    }, { passive: true });

    el.addEventListener('touchmove', () => {
      clearTimeout(longPressTimer);
    }, { passive: true });
  }

  // ─── Observar novos elementos no DOM ─────────────────────────
  // (fichas são geradas dinamicamente)
  function bindAllDiceTargets(root) {
    // skill-total elements
    root.querySelectorAll('.skill-total[data-total]').forEach(el => {
      if (el.dataset.diceBound) return;
      el.dataset.diceBound = '1';
      bindDiceEvents(el, getSkillInfo);
    });

    // sorte box
    root.querySelectorAll('.der-box.sorte').forEach(el => {
      if (el.dataset.diceBound) return;
      el.dataset.diceBound = '1';
      bindDiceEvents(el, getSorteInfo);
    });
  }

  // Observar mudanças no DOM para bind automático
  const observer = new MutationObserver(mutations => {
    mutations.forEach(m => {
      m.addedNodes.forEach(node => {
        if (node.nodeType === 1) {
          bindAllDiceTargets(node);
        }
      });
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // Bind inicial (caso já haja fichas)
  document.addEventListener('DOMContentLoaded', () => {
    bindAllDiceTargets(document.body);
  });
  // também agora, para fichas já renderizadas
  bindAllDiceTargets(document.body);

  // ─── Fechar menu ao pressionar Escape ─────────────────────────
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { removeCtxMenu(); closePopup(); }
  });

})();

/* ═══════════════════════════════════════════════════════════════
   PAINEL DE COMBATE — lógica global
═══════════════════════════════════════════════════════════════ */

// Estado por ficha
const combatState = {};

function getCombatState(id) {
  if (!combatState[id]) {
    combatState[id] = {
      attackType: 'normal',
      effectType: 'bloqueado',
      armQty: 2
    };
  }
  return combatState[id];
}

// ─── Abas do painel ───────────────────────────────────────────
function switchCombatTab(btn, tab, id) {
  const panel = document.getElementById('content-' + id);
  if (!panel) return;
  panel.querySelectorAll('.combat-tab-btn').forEach(b => b.classList.remove('active'));
  panel.querySelectorAll('.combat-tab-pane').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  const pane = document.getElementById(`ctab-${tab}-${id}`);
  if (pane) pane.classList.add('active');
}

// ─── Seleção de tipo de ataque ────────────────────────────────
function selectAttackType(btn, id) {
  const panel = document.getElementById('content-' + id);
  if (!panel) return;
  panel.querySelectorAll('[data-atype]').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  getCombatState(id).attackType = btn.dataset.atype;
  updateDamagePreview(id, 'ataque');
}

function selectEffectType(btn, id) {
  const panel = document.getElementById('content-' + id);
  if (!panel) return;
  panel.querySelectorAll('[data-etype]').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  getCombatState(id).effectType = btn.dataset.etype;
  updateDamagePreview(id, 'efeito');
}

// ─── Fórmulas de dano ─────────────────────────────────────────
function buildDamageFormula(id, tab) {
  const state = getCombatState(id);
  const panel = document.getElementById('content-' + id);

  if (tab === 'ataque') {
    // Base por tipo de ataque
    let parts = [];
    let descs = [];
    const t = state.attackType;
    parts.push('1d6'); descs.push('Dano base HP');
    if (t === 'vulneravel' || t === 'assinatura_vuln') {
      parts.push('1d6'); descs.push('Vulnerável +1d6');
    }
    if (t === 'assinatura' || t === 'assinatura_vuln') {
      parts.push('1d4'); descs.push('Assinatura +1d4');
    }
    // Rank A: extra para postura
    const rankA = panel?.querySelector('[data-dmg-mod="rank_a"]')?.checked;
    if (rankA) { parts.push('1d(extra Postura)'); descs.push('Rank A Postura'); }
    return { formula: parts.join(' + '), desc: 'Dano em HP' + (rankA ? ' + Postura extra' : '') };
  } else {
    // Efeito sobre Postura
    let parts = [];
    let descs = [];
    const t = state.effectType;
    if (t === 'bloqueado') {
      parts.push('1d6'); descs.push('Bloqueado 1d6 Postura');
    } else if (t === 'acertou') {
      parts.push('2d6'); descs.push('Acertou 2d6 Postura');
    } else if (t === 'assinatura_ef') {
      parts.push('1d6'); parts.push('1d4'); descs.push('Bloqueado 1d6 + Assinatura 1d4');
    } else if (t === 'assinatura_ef_acertou') {
      parts.push('2d6'); parts.push('1d4'); descs.push('Acertou 2d6 + Assinatura 1d4');
    } else if (t === 'ambiental') {
      parts.push('1d4'); descs.push('Impacto Ambiental 1d4 Postura');
    }
    const rankA = panel?.querySelector('[data-eff-mod="rank_a_ef"]')?.checked;
    if (rankA) parts.push('1d(Rank A)');
    return { formula: parts.join(' + '), desc: 'Dano de Postura' + (rankA ? ' + Rank A' : '') };
  }
}

function updateDamagePreview(id, tab) {
  const { formula, desc } = buildDamageFormula(id, tab);
  const fEl = document.getElementById(`dmg-formula-${tab}-${id}`);
  const dEl = document.getElementById(`dmg-desc-${tab}-${id}`);
  if (fEl) fEl.textContent = formula;
  if (dEl) dEl.textContent = desc;
}

// ─── Controle de quantidade ────────────────────────────────────
function armQtyChange(id, delta, isEffect) {
  const state = getCombatState(id);
  state.armQty = Math.max(2, Math.min(10, (state.armQty || 2) + delta));
  const suffixes = isEffect ? [`arm-qty-val-ef-${id}`] : [`arm-qty-val-${id}`, `arm-qty-val-ef-${id}`];
  suffixes.forEach(s => {
    const el = document.getElementById(s);
    if (el) el.textContent = state.armQty;
  });
}

// ─── Rolagem de dado simples ──────────────────────────────────
function rollDie(sides) { return Math.floor(Math.random() * sides) + 1; }

// ─── Rolagem do ataque ────────────────────────────────────────
function rollAttack(id, tab, mode) {
  const panel = document.getElementById('content-' + id);
  const state = getCombatState(id);
  const resultEl = document.getElementById(tab === 'ataque' ? `atk-result-${id}` : `eff-result-${id}`);
  if (!resultEl) return;

  // Animação
  resultEl.className = 'attack-result-area';
  resultEl.innerHTML = '<span style="color:#888;font-style:italic;animation:rolling-pulse .9s infinite">🎲 Rolando...</span>';

  setTimeout(() => {
    // ── Rolagem do d100 ────────────────────────────────────────
    const qty = (mode === 'normal') ? 1 : state.armQty;
    const d100s = Array.from({ length: qty }, () => rollDie(100));

    let d100Selected, d100Label, d100Discarded = [];
    if (mode === 'advantage') {
      d100Selected = Math.min(...d100s);
      const idx = d100s.indexOf(d100Selected);
      d100Discarded = d100s.filter((_, i) => i !== idx);
      d100Label = '⬆ Vantagem';
    } else if (mode === 'disadvantage') {
      d100Selected = Math.max(...d100s);
      const idx = d100s.indexOf(d100Selected);
      d100Discarded = d100s.filter((_, i) => i !== idx);
      d100Label = '⬇ Desvantagem';
    } else if (mode === 'multi') {
      d100Selected = null;
      d100Label = '🔁 Múltiplas';
    } else {
      d100Selected = d100s[0];
      d100Label = '';
    }

    // ── Perícia de Magia de Combate ─────────────────────────────
    const skillEl = panel?.querySelector('[data-total="sk_magia_combate"]');
    const skillTotal = parseInt(skillEl?.textContent) || 0;
    const extremo = Math.floor(skillTotal / 5);
    const dificil = Math.floor(skillTotal / 2);

    function classify(r) {
      if (r === 1) return { label: 'Crítico!', cls: 'res-critico' };
      if (r <= extremo) return { label: 'Extremo', cls: 'res-extremo' };
      if (r <= dificil) return { label: 'Difícil', cls: 'res-dificil' };
      if (r <= skillTotal) return { label: 'Regular', cls: 'res-regular' };
      if (r >= 96) return { label: 'Falha Crítica!', cls: 'res-falha-crit' };
      return { label: 'Falha', cls: 'res-falha' };
    }

    // ── Dados de dano ───────────────────────────────────────────
    let dmgParts = [];
    let dmgTotal = 0;
    let dmgDesc = '';
    let skipDmgRoll = false; // para falha

    if (tab === 'ataque') {
      const t = state.attackType;
      const rankA = panel?.querySelector('[data-dmg-mod="rank_a"]')?.checked;

      const base = rollDie(6); dmgParts.push({ die: 'd6', val: base }); dmgTotal += base;
      if (t === 'vulneravel' || t === 'assinatura_vuln') {
        const v = rollDie(6); dmgParts.push({ die: '+d6', val: v, tag: 'bonus' }); dmgTotal += v;
      }
      if (t === 'assinatura' || t === 'assinatura_vuln') {
        const a = rollDie(4); dmgParts.push({ die: '+d4', val: a, tag: 'bonus' }); dmgTotal += a;
      }
      dmgDesc = 'Dano em HP';
    } else {
      const t = state.effectType;
      const rankA = panel?.querySelector('[data-eff-mod="rank_a_ef"]')?.checked;

      if (t === 'ambiental') {
        const a = rollDie(4); dmgParts.push({ die: 'd4', val: a }); dmgTotal += a;
      } else {
        if (t === 'bloqueado' || t === 'assinatura_ef') {
          const d = rollDie(6); dmgParts.push({ die: 'd6', val: d }); dmgTotal += d;
        } else {
          const d1 = rollDie(6); dmgParts.push({ die: 'd6', val: d1 }); dmgTotal += d1;
          const d2 = rollDie(6); dmgParts.push({ die: '+d6', val: d2, tag: 'bonus' }); dmgTotal += d2;
        }
        if (t === 'assinatura_ef' || t === 'assinatura_ef_acertou') {
          const a = rollDie(4); dmgParts.push({ die: '+d4', val: a, tag: 'bonus' }); dmgTotal += a;
        }
        if (rankA) {
          const r = rollDie(6); dmgParts.push({ die: '+d6', val: r, tag: 'bonus' }); dmgTotal += r;
        }
      }
      dmgDesc = 'Dano de Postura';
    }

    // ── Render ──────────────────────────────────────────────────
    resultEl.className = 'attack-result-area has-result';

    // D100 rolls display
    let d100Html = '';
    if (mode === 'multi') {
      // Mostrar todas as rolagens em ordem
      d100Html = `<div class="attack-res-rolls-row" style="flex-direction:column;align-items:flex-start;gap:3px">`;
      d100s.forEach((r, i) => {
        const cl = classify(r);
        d100Html += `<div style="display:flex;align-items:center;gap:6px">
          <span style="font-size:9px;color:#666;min-width:18px;text-align:right">#${i + 1}</span>
          <span class="attack-res-die" style="font-size:14px">${r}</span>
          <span class="attack-res-outcome ${cl.cls}" style="font-size:11px">${cl.label}</span>
          <span class="attack-res-vs">${skillTotal}|${dificil}|${extremo}</span>
        </div>`;
      });
      d100Html += '</div>';
    } else {
      if (d100s.length > 1) {
        d100Html = '<div class="attack-res-rolls-row">';
        d100s.forEach((r, i) => {
          const isUsed = (r === d100Selected && !d100s.slice(0, i).includes(d100Selected));
          const cls = isUsed ? 'used' : 'discarded';
          d100Html += `<span class="attack-res-die ${cls}">${r}</span>`;
          if (i < d100s.length - 1) d100Html += '<span style="color:#555;font-size:10px">vs</span>';
        });
        d100Html += '</div>';
      }
      const outcome = classify(d100Selected);
      d100Html += `
        <div class="attack-res-header">
          <span class="attack-res-d100 ${outcome.cls}">${d100Selected}</span>
          <div>
            <div class="attack-res-outcome ${outcome.cls}">${outcome.label}</div>
            <div class="attack-res-vs">Magia de Combate: ${skillTotal}% | ½=${dificil} | ⅕=${extremo}</div>
          </div>
          ${d100Label ? `<span class="attack-res-mode-tag">${d100Label}</span>` : ''}
        </div>
      `;
    }

    // Dano
    const dmgDiceHtml = dmgParts.map((p, i) => `<span class="dmg-die ${p.tag || ''}" title="${p.die}">${p.val}</span>${i < dmgParts.length - 1 ? '<span class="dmg-plus">+</span>' : ''}`).join('');
    const dmgHtml = `
      <hr class="attack-res-divider">
      <div class="attack-res-damage-label">${dmgDesc}</div>
      <div class="attack-res-damage-line">
        <span class="attack-res-damage-total">${dmgTotal}</span>
        <span class="attack-res-damage-breakdown">${dmgParts.map(p => `${p.val}${p.die}`).join(' + ')}</span>
      </div>
      <div class="attack-res-damage-dice">${dmgDiceHtml}</div>
    `;

    resultEl.innerHTML = d100Html + dmgHtml +
      `<button class="result-clear-btn" title="Limpar resultado" onclick="clearResult(this)">✕</button>`;
  }, 400);
}

// ─── Limpar resultado ─────────────────────────────────────────
function clearResult(btn) {
  const area = btn.closest('.attack-result-area, .custom-dice-result');
  if (!area) return;
  const isCustom = area.classList.contains('custom-dice-result');
  area.className = isCustom ? 'custom-dice-result' : 'attack-result-area';
  area.innerHTML = `<span>${isCustom
    ? 'Digite uma expressão como <strong>2d6</strong> ou <strong>1d6+1d4</strong> e pressione Rolar.'
    : 'Selecione o tipo e clique em rolar.'}</span>`;
}

// ─── Rolador customizado ──────────────────────────────────────
function setCustomExpr(id, expr) {
  const inp = document.getElementById(`custom-dice-expr-${id}`);
  if (inp) { inp.value = expr; inp.focus(); }
}

function parseAndRollDice(expr) {
  // Aceita: NdX, NdX+M, NdX+MdY, etc.
  expr = expr.trim().toLowerCase().replace(/\s+/g, '');
  if (!expr) return null;

  // Tokenizar por + e -
  const tokens = expr.split(/(?=[+\-])/).filter(Boolean);
  let total = 0;
  const groups = [];

  for (let tok of tokens) {
    tok = tok.replace(/^[+]/, '');
    const isNeg = tok.startsWith('-');
    if (isNeg) tok = tok.slice(1);

    if (tok.includes('d')) {
      // NdX
      const [nStr, xStr] = tok.split('d');
      const n = parseInt(nStr) || 1;
      const x = parseInt(xStr) || 6;
      if (n < 1 || n > 100 || x < 2 || x > 1000) return null;
      const rolls = Array.from({ length: n }, () => Math.floor(Math.random() * x) + 1);
      const sum = rolls.reduce((a, b) => a + b, 0);
      groups.push({ label: `${n}d${x}`, rolls, sum, neg: isNeg });
      total += isNeg ? -sum : sum;
    } else {
      // Constante
      const v = parseInt(tok);
      if (isNaN(v)) return null;
      groups.push({ label: isNeg ? `-${v}` : `+${v}`, rolls: [v], sum: v, constant: true, neg: isNeg });
      total += isNeg ? -v : v;
    }
  }

  return { total, groups, expr };
}

function rollCustomDice(id) {
  const inp = document.getElementById(`custom-dice-expr-${id}`);
  const resultEl = document.getElementById(`custom-result-${id}`);
  if (!inp || !resultEl) return;

  const expr = inp.value.trim();
  if (!expr) return;

  resultEl.className = 'custom-dice-result';
  resultEl.innerHTML = '<span style="color:#888;font-style:italic">Rolando...</span>';

  setTimeout(() => {
    const result = parseAndRollDice(expr);
    if (!result) {
      resultEl.className = 'custom-dice-result has-result';
      resultEl.innerHTML = `<span class="custom-error">⚠ Expressão inválida. Use formato: <strong>2d6</strong>, <strong>1d4+3</strong>, <strong>3d8+1d4</strong></span>` +
        `<button class="result-clear-btn" title="Limpar resultado" onclick="clearResult(this)">✕</button>`;
      return;
    }

    resultEl.className = 'custom-dice-result has-result';

    let groupsHtml = result.groups.map((g, gi) => {
      const diceHtml = g.constant
        ? `<span class="custom-die-val">${g.rolls[0]}</span>`
        : g.rolls.map((r, ri) => `<span class="custom-die-val">${r}</span>${ri < g.rolls.length - 1 ? '<span class="custom-die-sep">·</span>' : ''}`).join('');
      const prefix = (gi > 0 && !g.label.startsWith('-')) ? '<span class="custom-die-sep">+</span>' : (g.neg ? '<span class="custom-die-sep">−</span>' : '');
      return `<span style="display:flex;align-items:center;gap:3px">
        <span style="font-size:9px;color:#777;margin-right:2px">${g.label}:</span>${diceHtml}
      </span>`;
    }).join('<span class="custom-die-sep" style="font-size:14px;margin:0 2px">+</span>');

    resultEl.innerHTML = `
      <div class="custom-res-formula">${result.expr.toUpperCase()}</div>
      <div class="custom-res-total">${result.total}</div>
      <div class="custom-res-dice-row">${groupsHtml}</div>
      <button class="result-clear-btn" title="Limpar resultado" onclick="clearResult(this)">✕</button>
    `;
  }, 350);
}
