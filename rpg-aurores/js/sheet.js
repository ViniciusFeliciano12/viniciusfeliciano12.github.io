/* ═══════════════════════════════════════════════════════════════
   SHEET — fichas, abas, objetos e template
═══════════════════════════════════════════════════════════════ */

/* ═══ LORE — OBJETIVOS DINÂMICOS ═════════════════════════════ */
function loreAddGoal(id, texto = '', done = false, autofocus = true) {
  const lista = document.getElementById('lore-goals-' + id);
  if (!lista) return;
  const item = document.createElement('div');
  item.className = 'lore-goal-item' + (done ? ' goal-done' : '');
  item.innerHTML = `
    <input type="checkbox" ${done ? 'checked' : ''} onchange="loreToggleGoal(this)">
    <input type="text" placeholder="Descreva o objetivo…" value="${texto.replace(/"/g, '&quot;')}">
    <button class="lore-goal-del" onclick="loreDelGoal(this)" title="Remover">✕</button>`;
  lista.appendChild(item);
  if (autofocus) item.querySelector('input[type="text"]').focus();
  item.querySelector('input[type="text"]').addEventListener('input', debounce(() => coletarDados(id), 600));
  item.querySelector('input[type="checkbox"]').addEventListener('change', debounce(() => coletarDados(id), 200));
}

function loreToggleGoal(chk) {
  chk.closest('.lore-goal-item').classList.toggle('goal-done', chk.checked);
}

function loreDelGoal(btn) {
  const item = btn.closest('.lore-goal-item');
  const lista = item.closest('.lore-goals-list');
  item.remove();
  // encontra id da ficha
  const c = lista.closest('[id^="content-"]');
  if (c) coletarDados(c.id.replace('content-', ''));
}

function loreColetarObjetivos(id) {
  const lista = document.getElementById('lore-goals-' + id);
  if (!lista) return [];
  return Array.from(lista.querySelectorAll('.lore-goal-item')).map(el => ({
    texto: el.querySelector('input[type="text"]').value,
    done: el.querySelector('input[type="checkbox"]').checked
  }));
}

function lorePreencherObjetivos(id, objetivos) {
  const lista = document.getElementById('lore-goals-' + id);
  if (!lista) return;
  lista.innerHTML = '';
  (objetivos || []).forEach(o => loreAddGoal(id, o.texto, o.done, false));
}

/* ═══ COMPRESSÃO DE FOTO ══════════════════════════════════════ */
function comprimirFoto(dataUrl, maxPx, quality, cb) {
  const img = new Image();
  img.onload = () => {
    const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
    cb(canvas.toDataURL('image/jpeg', quality));
  };
  img.src = dataUrl;
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
  dados['_lore_objetivos'] = loreColetarObjetivos(id);
  dados['_itens_mochila'] = (fichas.find(f => f.id === id) || {})._itens_mochila || [];
  const f = getFicha(id);
  if (f) {
    if (f.dados?._attrs_roll) dados['_attrs_roll'] = f.dados._attrs_roll;
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
  // Migração: valores antigos (sk_X = número) → Livre/Melhoria
  if (typeof SKILL_BASE !== 'undefined') {
    const allSkills = Object.keys(SKILL_BASE).concat(['sk_esquiva']);
    allSkills.forEach(sk => {
      const oldVal = dados[sk];
      if (oldVal !== undefined && oldVal !== '' &&
        dados[sk + '_ip'] === undefined &&
        dados[sk + '_oc'] === undefined &&
        dados[sk + '_livre'] === undefined) {
        const inp = c.querySelector(`[data-field="${sk}_livre"]`);
        if (inp) inp.value = parseInt(oldVal) || 0;
      }
    });
  }

  atualizarLabelPostura(id);
  setTimeout(() => onEscolaChange(id), 0);
  setTimeout(() => atualizarTodasPericias(id), 0);
  setTimeout(() => atualizarPontosDistrib(id), 0);
  setTimeout(() => restaurarEstiloRank(id, dados['estilo_rank'] || 'D'), 50);
  setTimeout(() => { const c = document.getElementById('content-' + id); if (c) _sincronizarVisuaisEvolucao(c); }, 0);
  const ficha = fichas.find(f => f.id === id);
  if (ficha) ficha._itens_mochila = dados._itens_mochila || [];
  renderizarItensMochila(id);
  atualizarCargaDisplay(id);
  lorePreencherObjetivos(id, dados._lore_objetivos || []);
}

/* ═══ ATUALIZAÇÃO REMOTA CAMPO A CAMPO ════════════════════════ */
function aplicarCamposRemoto(fichaId, dadosRemoto, nomeRemoto) {
  const c = document.getElementById('content-' + fichaId);
  if (!c || !dadosRemoto) return;

  const prevDados = (_lastSaved[fichaId] || {}).dados || {};
  const activeEl = document.activeElement;
  const allKeys = new Set([...Object.keys(prevDados), ...Object.keys(dadosRemoto)]);

  for (const key of allKeys) {
    // Pula campos que não mudaram no Firebase
    if (JSON.stringify(prevDados[key] ?? null) === JSON.stringify(dadosRemoto[key] ?? null)) continue;

    // Tenta atualizar via data-field (campos simples: inputs, selects, textareas)
    const el = c.querySelector(`[data-field="${key}"]`);
    if (el) {
      if (el !== activeEl && dadosRemoto[key] !== undefined) el.value = dadosRemoto[key];
      continue;
    }

    // Campos especiais sem data-field
    switch (key) {
      case '_foto': {
        const img = c.querySelector('.foto-preview-img');
        const ph = c.querySelector('.foto-placeholder-div');
        if (dadosRemoto[key]) {
          if (img) { img.src = dadosRemoto[key]; img.style.display = 'block'; }
          if (ph) ph.style.display = 'none';
        } else {
          if (img) { img.src = ''; img.style.display = 'none'; }
          if (ph) ph.style.display = '';
        }
        break;
      }
      case '_lore_objetivos':
        lorePreencherObjetivos(fichaId, dadosRemoto[key] || []);
        break;
      case '_objetos': {
        const lista = c.querySelector('.objetos-lista');
        if (lista) {
          lista.innerHTML = '';
          (dadosRemoto[key] || []).forEach(o => {
            const div = criarObjetoItem();
            lista.appendChild(div);
            const ins = div.querySelectorAll('input');
            ins[0].value = o.item || '';
            ins[1].value = o.descricao || '';
          });
        }
        break;
      }
      case '_itens_mochila': {
        const ficha = fichas.find(f => f.id === fichaId);
        if (ficha) ficha._itens_mochila = dadosRemoto[key] || [];
        renderizarItensMochila(fichaId);
        atualizarCargaDisplay(fichaId);
        break;
      }
    }
  }

  // Atualiza cálculos derivados sempre que necessário
  atualizarLabelPostura(fichaId);
  setTimeout(() => onEscolaChange(fichaId), 0);
  setTimeout(() => atualizarTodasPericias(fichaId), 0);
  setTimeout(() => atualizarPontosDistrib(fichaId), 0);
  setTimeout(() => restaurarEstiloRank(fichaId, dadosRemoto['estilo_rank'] || 'D'), 50);

  // Atualiza o snapshot para que o próximo diff parta do estado atual do Firebase
  sincronizarLastSaved(fichaId, dadosRemoto, nomeRemoto);
  setTimeout(() => { const c2 = document.getElementById('content-' + fichaId); if (c2 && typeof _sincronizarVisuaisEvolucao === 'function') _sincronizarVisuaisEvolucao(c2); }, 0);
}

/* ═══ BIND DE EVENTOS ═════════════════════════════════════════ */
function bindFichaEvents(id) {
  const c = document.getElementById('content-' + id);
  if (!c) return;

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
    if (e.target.dataset?.field?.startsWith('sk_') || e.target.dataset?.field === 'des')
      atualizarTodasPericias(id);
    if (e.target.dataset?.field === 'int_attr' || e.target.dataset?.field === 'edu') {
      atualizarPontosDistrib(id);
    }
    if (e.target.dataset?.field?.match(/_ip$|_oc$/))
      atualizarPontosDistrib(id);
  });

  c.addEventListener('click', e => {
    const label = e.target.closest('[data-skill-label]');
    if (label) {
      e.preventDefault();
      abrirPopupPericia(id, label.dataset.skillLabel);
    }
  });
  c.addEventListener('input', debounce(() => { coletarDados(id); atualizarNomeAba(id); }, 600));
  c.addEventListener('change', debounce(() => { coletarDados(id); atualizarNomeAba(id); }, 600));
  c.querySelector('[data-field="especializacao"]')?.addEventListener('change', () => {
    aplicarHighlightEspecializacao(id);
  });
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
      comprimirFoto(ev.target.result, 800, 0.75, compressed => {
        const img = c.querySelector('.foto-preview-img');
        const ph = c.querySelector('.foto-placeholder-div');
        img.src = compressed; img.style.display = 'block';
        ph.style.display = 'none'; coletarDados(id);
      });
    };
    reader.readAsDataURL(file);
  });

}

function atualizarNomeAba(id) {
  const c = document.getElementById('content-' + id);
  const v = c?.querySelector('[data-field="nome_completo"]')?.value?.trim();
  if (!v) return;
  const f = getFicha(id);
  if (f) f.nome = v.split(' ')[0];
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

/* ═══ TEMPLATE DA FICHA ═══════════════════════════════════════ */
function criarFichaHTML(id) {
  const templateEl = document.getElementById('template-ficha');
  if (!templateEl) return '';
  let templateHTML = templateEl.innerHTML;
  templateHTML = templateHTML.replaceAll('${id}', id);
  return templateHTML;
}

/* ═══ ABAS ════════════════════════════════════════════════════ */
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
    inicializarInputsPericia(f.id);
    inicializarTogglesEvolucao(f.id);
    preencherFicha(f.id, f.dados);
    criaturaInicializar(f.id);
    criaturaPreencherDados(f.id, f.dados);
    if (!Object.keys(f.dados).length) coletarDados(f.id);
    bindFichaEvents(f.id);
    atualizarLabelPostura(f.id);
    aplicarHighlightEspecializacao(f.id);
    setTimeout(() => atualizarTodasPericias(f.id), 0);
    setTimeout(() => atualizarPontosDistrib(f.id), 0);
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
  if (typeof window._onAbaAtivada === 'function') window._onAbaAtivada(id);
}

function novaAba() {
  if (abaAtiva) coletarDados(abaAtiva);
  const nomeInicial = 'Personagem ' + (fichas.length + 1);
  const id = gerarFichaId(nomeInicial);
  const novaFicha = { id, user_id: (typeof _JOGADOR_UID !== 'undefined' && _JOGADOR_UID) || DB_USER?.uid, nome: nomeInicial, dados: {} };
  fichas.push(novaFicha);
  dbCreateFicha(novaFicha).catch(() => { });
  salvarFichas(id);
  abaAtiva = id;
  const area = document.getElementById('tabs-content-area');
  area.querySelectorAll('[id^="content-"]').forEach(el => el.style.display = 'none');
  const div = document.createElement('div');
  div.id = 'content-' + id;
  div.style.display = 'block';
  div.innerHTML = criarFichaHTML(id);
  area.appendChild(div);
  inicializarInputsPericia(id);
  inicializarTogglesEvolucao(id);
  preencherFicha(id, {});
  criaturaInicializar(id);
  coletarDados(id);
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
  dbDeleteFicha(tabParaDeletar).catch(() => { });
  salvarFichas();
  fecharModal();
  renderTabs();
  ativarAba(abaAtiva);
  mostrarToast('Ficha removida');
}

/* ═══ EVENT LISTENERS DE MODAIS ═══════════════════════════════ */
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
  const modalSkill = document.getElementById('modal-skill-popup');
  if (modalSkill) {
    modalSkill.addEventListener('click', function (e) {
      if (e.target === this) fecharPopupPericia();
    });
  }
});
/* ═══ SECTION TABS (Perfil / História) ═══════════════════════ */
function switchSectionTab(btn, fichaId) {
  const stab = btn.dataset.stab;
  const c = document.getElementById('content-' + fichaId);
  if (!c) return;
  c.querySelectorAll('.section-nav-tab').forEach(b => b.classList.toggle('active', b.dataset.stab === stab));
  c.querySelectorAll('.section-nav-pane').forEach(p => {
    p.style.display = p.id === ('stab-' + stab + '-' + fichaId) ? '' : 'none';
  });
}

/* ═══ CRIATURAS MÁGICAS ═══════════════════════════════════════ */
const CRIATURA_MAX_JOGADOR = 3;
const _CRIATURA_NUMERAIS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

function _criaturaFichaId(lista) {
  return lista.closest('[id^="content-"]').id.replace('content-', '');
}

function _criaturaRenumerar(lista) {
  Array.from(lista.children).forEach((div, i) => {
    div.dataset.criaturaIndex = i;
    const label = div.querySelector('.criatura-slot-label');
    if (label) label.firstChild.textContent = 'Criatura ' + (_CRIATURA_NUMERAIS[i] || i + 1);
    // reatribui data-field com novo índice
    div.querySelectorAll('[data-field]').forEach(el => {
      el.dataset.field = el.dataset.field.replace(/criatura_\d+_/, `criatura_${i + 1}_`);
    });
  });
}

function criaturaRenderSlot(lista, index, dados, disabled) {
  const div = document.createElement('div');
  div.className = 'criatura-item';
  div.dataset.criaturaIndex = index;
  const numeral = _CRIATURA_NUMERAIS[index] || String(index + 1);
  div.innerHTML = `
    <div class="criatura-slot-header">
      <span class="criatura-slot-label">Criatura ${numeral}</span>
      ${disabled ? '' : '<button class="btn-del-criatura" title="Remover criatura">✕</button>'}
    </div>
    <div class="criatura-fields">
      <div class="field"><label>Nome</label><input type="text" data-field="criatura_${index + 1}_nome" placeholder="Ex: Picles…" ${disabled ? 'disabled' : ''}></div>
      <div class="field"><label>Espécie</label><input type="text" data-field="criatura_${index + 1}_especie" placeholder="Ex: Bowtruckle…" ${disabled ? 'disabled' : ''}></div>
      <div class="field criatura-field-desc"><label>Descrição</label><textarea data-field="criatura_${index + 1}_desc" placeholder="Aparência, comportamento, habilidades…" rows="2" ${disabled ? 'disabled' : ''}></textarea></div>
    </div>`;
  if (dados) {
    div.querySelector(`[data-field="criatura_${index + 1}_nome"]`).value = dados.nome || '';
    div.querySelector(`[data-field="criatura_${index + 1}_especie"]`).value = dados.especie || '';
    div.querySelector(`[data-field="criatura_${index + 1}_desc"]`).value = dados.desc || '';
  }
  div.querySelectorAll('[data-field]').forEach(el => {
    el.addEventListener('input', debounce(() => coletarDados(_criaturaFichaId(lista)), 600));
  });
  const delBtn = div.querySelector('.btn-del-criatura');
  if (delBtn) {
    delBtn.addEventListener('click', () => {
      const fichaId = _criaturaFichaId(lista);
      div.remove();
      _criaturaRenumerar(lista);
      if (lista.children.length === 0) criaturaRenderSlot(lista, 0, null, false);
      _criaturaAtualizarBotao(fichaId);
      coletarDados(fichaId);
    });
  }
  lista.appendChild(div);
}

function criaturaInicializar(fichaId) {
  const lista = document.getElementById('criaturas-lista-' + fichaId);
  if (!lista || lista.children.length > 0) return;
  criaturaRenderSlot(lista, 0, null, false);
  _criaturaAtualizarBotao(fichaId);
}

function criaturaAdicionar(fichaId, isGM = false) {
  const lista = document.getElementById('criaturas-lista-' + fichaId);
  if (!lista) return;
  const count = lista.children.length;
  if (!isGM && count >= CRIATURA_MAX_JOGADOR) return;
  criaturaRenderSlot(lista, count, null, false);
  _criaturaAtualizarBotao(fichaId);
  coletarDados(fichaId);
}

function _criaturaAtualizarBotao(fichaId) {
  const lista = document.getElementById('criaturas-lista-' + fichaId);
  const btn = document.getElementById('btn-add-criatura-' + fichaId);
  if (!lista || !btn) return;
  btn.style.display = lista.children.length >= CRIATURA_MAX_JOGADOR ? 'none' : '';
}

function criaturaPreencherDados(fichaId, fichaData) {
  const lista = document.getElementById('criaturas-lista-' + fichaId);
  if (!lista) return;
  lista.innerHTML = '';
  let i = 0;
  while (fichaData['criatura_' + (i + 1) + '_nome'] !== undefined ||
    fichaData['criatura_' + (i + 1) + '_especie'] !== undefined ||
    fichaData['criatura_' + (i + 1) + '_desc'] !== undefined) {
    criaturaRenderSlot(lista, i, {
      nome: fichaData['criatura_' + (i + 1) + '_nome'] || '',
      especie: fichaData['criatura_' + (i + 1) + '_especie'] || '',
      desc: fichaData['criatura_' + (i + 1) + '_desc'] || '',
    }, false);
    i++;
  }
  if (lista.children.length === 0) criaturaRenderSlot(lista, 0, null, false);
  _criaturaAtualizarBotao(fichaId);
}

function switchItensTab(btn, fichaId) {
  const itab = btn.dataset.itab;
  const c = document.getElementById('content-' + fichaId);
  if (!c) return;
  c.querySelectorAll('.itens-toggle-tab').forEach(b => b.classList.toggle('active', b.dataset.itab === itab));
  c.querySelectorAll('.itens-toggle-pane').forEach(p => {
    p.style.display = p.id === ('itab-' + itab + '-' + fichaId) ? '' : 'none';
  });
}

