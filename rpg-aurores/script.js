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

function carregarFichas() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) fichas = JSON.parse(raw);
  } catch(e) { fichas = []; }
  if (!fichas.length) fichas = [{ id: gerarId(), nome: 'Personagem 1', dados: {} }];
}
function salvarFichas() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(fichas)); }
  catch(e) { console.warn('Erro ao salvar:', e); }
}
function gerarId() { return 'f' + Date.now() + Math.random().toString(36).slice(2,6); }
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
  if (btn) btn.scrollIntoView({ behavior:'smooth', block:'nearest', inline:'nearest' });
}

function novaAba() {
  if (abaAtiva) coletarDados(abaAtiva);
  const id = gerarId();
  fichas.push({ id, nome: 'Personagem ' + (fichas.length + 1), dados: {} });
  salvarFichas();
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
  const max   = parseInt(c.querySelector('[data-field="postura_max"]')?.value)   || 1;
  const lbl   = c.querySelector('[data-calc="postura_status"]');
  if (!lbl) return;
  const pct = atual / max;
  if (atual <= 0)      { lbl.textContent = 'QUEBRADA';  lbl.style.color = 'var(--rank-sss)'; }
  else if (pct <= .25) { lbl.textContent = 'DESGASTADA';lbl.style.color = 'var(--rank-ss)'; }
  else if (pct <= .50) { lbl.textContent = 'CANSADA';   lbl.style.color = '#b8860b'; }
  else                 { lbl.textContent = 'SAUDÁVEL';  lbl.style.color = 'var(--forest)'; }
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
    objs.push({ item: ins[0]?.value||'', descricao: ins[1]?.value||'' });
  });
  dados['_objetos'] = objs;
  const f = getFicha(id);
  if (f) {
    f.dados = dados;
    const nome = dados['nome_completo']?.trim();
    if (nome) f.nome = nome.split(' ')[0];
  }
  salvarFichas();
}

function preencherFicha(id, dados) {
  const c = document.getElementById('content-' + id);
  if (!c || !dados) return;
  c.querySelectorAll('[data-field]').forEach(el => {
    if (dados[el.dataset.field] !== undefined) el.value = dados[el.dataset.field];
  });
  if (dados['_foto']) {
    const img = c.querySelector('.foto-preview-img');
    const ph  = c.querySelector('.foto-placeholder-div');
    if (img) { img.src = dados['_foto']; img.style.display = 'block'; }
    if (ph)  ph.style.display = 'none';
  }
  if (dados['_objetos']?.length) {
    const lista = c.querySelector('.objetos-lista');
    lista.innerHTML = '';
    dados['_objetos'].forEach(o => {
      const div = criarObjetoItem();
      lista.appendChild(div);
      const ins = div.querySelectorAll('input');
      ins[0].value = o.item;
      ins[1].value = o.descricao;
    });
  }
  atualizarLabelPostura(id);
  // Restore escola bonus display
  setTimeout(() => onEscolaChange(id), 0);
  // Atualiza totais e limiares das perícias
  setTimeout(() => atualizarTodasPericias(id), 0);
}

function bindFichaEvents(id) {
  const c = document.getElementById('content-' + id);
  if (!c) return;

  // ── Cálculo automático de derivados ──────────────────────────
  const BASE_FIELDS = ['for','int_attr','des','con','apa','pod','tam','edu'];
  function recalcDerived() {
    const v = {};
    BASE_FIELDS.forEach(f => {
      v[f] = parseInt(c.querySelector(`[data-field="${f}"]`)?.value) || 0;
    });
    const hpMax      = Math.floor((v.con + v.tam) / 5);
    const posturaMax = Math.floor((v.con + v.pod) / 5);
    const pmMax      = Math.floor(v.pod / 5);

    const setIfUnchanged = (field, newMax) => {
      const maxEl   = c.querySelector(`[data-field="${field}_max"]`);
      const atualEl = c.querySelector(`[data-field="${field}_atual"]`);
      if (!maxEl) return;
      const oldMax   = parseInt(maxEl.value) || 0;
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
    setIfUnchanged('hp',      hpMax);
    setIfUnchanged('postura', posturaMax);
    setIfUnchanged('pm',      pmMax);
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
  c.querySelector('.foto-file-input')?.addEventListener('change', function(e) {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const img = c.querySelector('.foto-preview-img');
      const ph  = c.querySelector('.foto-placeholder-div');
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
  if (f) { f.nome = v.split(' ')[0]; salvarFichas(); }
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
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => { fn.apply(this, args); mostrarToast('✓ Ficha salva'); }, ms);
  };
}

document.getElementById('modal-del').addEventListener('click', function(e) {
  if (e.target === this) fecharModal();
});

/* ═══ TEMPLATE DA FICHA ═══════════════════════════════════════ */
function criarFichaHTML(id) { return `
<div class="sheet-wrap">
  <div class="sheet-header">
    <h1>Departamento de Execução das Leis da Magia</h1>
    <p>Ficha Operacional de Auror — Adaptação d100</p>
  </div>
  <div class="sheet-body">

    <!-- PERFIL -->
    <h2 class="sec-title"><span class="sec-icon">✦</span> Perfil do Personagem</h2>
    <div class="perfil-layout">
      <div class="foto-box">
        <div class="foto-area" onclick="this.closest('.foto-box').querySelector('.foto-file-input').click()">
          <img class="foto-preview-img" src="" alt="Foto" style="display:none">
          <div class="foto-placeholder-div foto-placeholder">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#888" stroke-width="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
            Clique para<br>adicionar foto
          </div>
        </div>
        <input type="file" class="foto-file-input" accept="image/*" style="display:none">
        <button class="foto-btn" onclick="this.closest('.foto-box').querySelector('.foto-file-input').click()">Alterar Foto</button>
      </div>
      <div>
        <div class="info-grid" style="margin-bottom:14px">
          <div class="field">
            <label>Nome Completo</label>
            <input type="text" data-field="nome_completo" placeholder="Nome do personagem">
          </div>
          <div class="field">
            <label>Idade</label>
            <input type="number" data-field="idade" placeholder="Ex: 24" min="1" max="200">
          </div>
          <div class="field">
            <label>Especialização</label>
            <select data-field="especializacao">
              <option value="">— Selecione —</option>
              <optgroup label="⚔ Linha de Combate">
                <option>Duelista de Linha</option>
                <option>Artilheiro de Cerco</option>
                <option>Caçador das Trevas</option>
                <option>Combatente Corpo-a-Corpo</option>
                <option>Cavaleiro de Vassoura (Aéreo)</option>
              </optgroup>
              <optgroup label="🔍 Linha de Investigação">
                <option>Investigador Forense</option>
                <option>Especialista em Necro-investigação</option>
                <option>Rastreador Mágico</option>
                <option>Analista Arcano</option>
                <option>Agente de Inteligência</option>
              </optgroup>
              <optgroup label="🗣 Linha Social">
                <option>Diplomata do Ministério</option>
                <option>Infiltrador Social</option>
                <option>Negociador de Crise</option>
                <option>Especialista em Trouxas</option>
                <option>Mediador Mágico-Criatura</option>
              </optgroup>
              <optgroup label="🌲 Linha de Campo">
                <option>Batedor de Fronteira</option>
                <option>Magizoologista</option>
                <option>Curandeiro de Campo</option>
                <option>Alquimista de Campo</option>
                <option>Explorador de Ruínas</option>
              </optgroup>
            </select>
          </div>
          <div class="field">
            <label>Naturalidade</label>
            <input type="text" data-field="naturalidade" placeholder="Ex: Liverpool, Salvador...">
          </div>
          <div class="field">
            <label>Criação</label>
            <select data-field="criacao">
              <option value="">— Selecione —</option>
              <option>Sangue-Puro</option>
              <option>Mestiço</option>
              <option>Nascido Trouxa</option>
              <option>Não-Humano Mágico</option>
            </select>
          </div>
          <div class="field">
            <label>Patrono</label>
            <input type="text" data-field="patrono" placeholder="Ex: Cervo, Lontra...">
          </div>
          <div class="field" id="field-escola-wrap-${id}">
            <label>Método de Ensino (Nacionalidade)</label>
            <select data-field="escola" id="select-escola-${id}" onchange="onEscolaChange('${id}')">
              <option value="">— Selecione —</option>
              <option value="hogwarts">Hogwarts (Reino Unido)</option>
              <option value="ilvermorny">Ilvermorny (Estados Unidos)</option>
              <option value="beauxbatons">Beauxbatons (França)</option>
              <option value="mahoutokoro">Mahoutokoro (Japão)</option>
              <option value="uagadou">Uagadou (África)</option>
              <option value="castelobruxo">Castelobruxo (Brasil)</option>
              <option value="koldovstoretz">Koldovstoretz (Europa Oriental)</option>
              <option value="durmstrang">Durmstrang (Norte da Europa)</option>
              <option value="domiciliar">Ensino Domiciliar (Sem escola fixa)</option>
            </select>
          </div>
          <div class="field" id="hogwarts-choose-field-${id}" style="display:none">
            <label>Bônus (+10%)</label>
            <select data-field="hogwarts_escolha" id="hogwarts-escolha-${id}" onchange="onHogwartsChoiceChange('${id}')">
              <option value="">— Escolha —</option>
              <option value="sk_encantamento">Encantamento</option>
              <option value="sk_defesa">Defesa / Protego</option>
            </select>
          </div>
          <div class="field" id="dom-sk1-field-${id}" style="display:none">
            <label>Perícia (+12% ou +5%)</label>
            <select data-field="domiciliar_sk1" id="dom-sk1-${id}" onchange="onDomiciliarChange('${id}')">
                <option value="">— Selecione —</option>
                <option value="sk_arremessar">Arremessar</option>
                <option value="sk_atletismo">Atletismo/Pular</option>
                <option value="sk_conjuracao">Conjuração</option>
                <option value="sk_defesa">Defesa / Protego</option>
                <option value="sk_encantamento">Encantamento</option>
                <option value="sk_esquiva">Esquiva</option>
                <option value="sk_furtividade">Furtividade</option>
                <option value="sk_luta">Luta Corporal</option>
                <option value="sk_trevas">Magia das Trevas</option>
                <option value="sk_magia_combate">Magia de Combate</option>
                <option value="sk_natacao">Natação</option>
                <option value="sk_transfiguracao">Transfiguração</option>
                <option value="sk_voo">Voo com Vassoura</option>
                <option value="sk_alquimia">Alquimia</option>
                <option value="sk_antiguidades">Antiguidades Mágicas</option>
                <option value="sk_aritmancia">Aritmancia</option>
                <option value="sk_arqueologia">Arqueologia/Geologia</option>
                <option value="sk_curandeirismo">Curandeirismo</option>
                <option value="sk_trouxas">Estudo dos Trouxas</option>
                <option value="sk_herbologia">Herbologia</option>
                <option value="sk_historia">História da Magia</option>
                <option value="sk_leis">Leis do Ministério</option>
                <option value="sk_pocoes">Poções</option>
                <option value="sk_teoria">Teoria da Magia/Runas</option>
                <option value="sk_criaturas">Trato de Criaturas</option>
                <option value="sk_biblioteca">Usar Biblioteca</option>
                <option value="sk_arte">Arte/Criação</option>
                <option value="sk_charme">Charme</option>
                <option value="sk_disfarce">Disfarce / Polissuco</option>
                <option value="sk_esconder">Esconder</option>
                <option value="sk_escutar">Escutar</option>
                <option value="sk_intimidacao">Intimidação</option>
                <option value="sk_labia">Lábia</option>
                <option value="sk_linguas">Línguas Mágicas</option>
                <option value="sk_percepcao">Percepção / Revelare</option>
                <option value="sk_prestidigi">Prestidigitação</option>
                <option value="sk_psicologia">Psicologia</option>
                <option value="sk_rastreamento">Rastreamento Mágico</option>
                <option value="sk_sobrevivencia">Sobrevivência</option>
            </select>
          </div>
          <div class="field" id="dom-sk2-field-${id}" style="display:none">
            <label>2ª Perícia (opcional · +5% cada)</label>
            <select data-field="domiciliar_sk2" id="dom-sk2-${id}" onchange="onDomiciliarChange('${id}')">
                <option value="">— Selecione —</option>
                <option value="sk_arremessar">Arremessar</option>
                <option value="sk_atletismo">Atletismo/Pular</option>
                <option value="sk_conjuracao">Conjuração</option>
                <option value="sk_defesa">Defesa / Protego</option>
                <option value="sk_encantamento">Encantamento</option>
                <option value="sk_esquiva">Esquiva</option>
                <option value="sk_furtividade">Furtividade</option>
                <option value="sk_luta">Luta Corporal</option>
                <option value="sk_trevas">Magia das Trevas</option>
                <option value="sk_magia_combate">Magia de Combate</option>
                <option value="sk_natacao">Natação</option>
                <option value="sk_transfiguracao">Transfiguração</option>
                <option value="sk_voo">Voo com Vassoura</option>
                <option value="sk_alquimia">Alquimia</option>
                <option value="sk_antiguidades">Antiguidades Mágicas</option>
                <option value="sk_aritmancia">Aritmancia</option>
                <option value="sk_arqueologia">Arqueologia/Geologia</option>
                <option value="sk_curandeirismo">Curandeirismo</option>
                <option value="sk_trouxas">Estudo dos Trouxas</option>
                <option value="sk_herbologia">Herbologia</option>
                <option value="sk_historia">História da Magia</option>
                <option value="sk_leis">Leis do Ministério</option>
                <option value="sk_pocoes">Poções</option>
                <option value="sk_teoria">Teoria da Magia/Runas</option>
                <option value="sk_criaturas">Trato de Criaturas</option>
                <option value="sk_biblioteca">Usar Biblioteca</option>
                <option value="sk_arte">Arte/Criação</option>
                <option value="sk_charme">Charme</option>
                <option value="sk_disfarce">Disfarce / Polissuco</option>
                <option value="sk_esconder">Esconder</option>
                <option value="sk_escutar">Escutar</option>
                <option value="sk_intimidacao">Intimidação</option>
                <option value="sk_labia">Lábia</option>
                <option value="sk_linguas">Línguas Mágicas</option>
                <option value="sk_percepcao">Percepção / Revelare</option>
                <option value="sk_prestidigi">Prestidigitação</option>
                <option value="sk_psicologia">Psicologia</option>
                <option value="sk_rastreamento">Rastreamento Mágico</option>
                <option value="sk_sobrevivencia">Sobrevivência</option>
            </select>
          </div>
        </div>
        <p class="sub-label">Aparência Física</p>
        <div class="info-grid">
          <div class="field">
            <label>Cor de Pele</label>
            <input type="text" data-field="cor_pele" placeholder="Ex: Morena, Clara...">
          </div>
          <div class="field">
            <label>Cor de Cabelo</label>
            <input type="text" data-field="cor_cabelo" placeholder="Ex: Preto, Ruivo...">
          </div>
          <div class="field">
            <label>Tipo de Corpo</label>
            <select data-field="tipo_corpo">
              <option value="">— Selecione —</option>
              <option>Esguio</option>
              <option>Atlético</option>
              <option>Médio</option>
              <option>Musculoso</option>
              <option>Encorpado</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <!-- VARINHA & OBJETOS -->
    <h2 class="sec-title"><span class="sec-icon">🪄</span> Varinha &amp; Objetos Mágicos</h2>
    <div class="varinha-grid">
      <div class="field"><label>Madeira</label><input type="text" data-field="varinha_madeira" placeholder="Ex: Azevinho..."></div>
      <div class="field"><label>Núcleo</label><input type="text" data-field="varinha_nucleo" placeholder="Ex: Pena de Fênix..."></div>
      <div class="field"><label>Comprimento</label><input type="text" data-field="varinha_comprimento" placeholder="Ex: 28 cm"></div>
      <div class="field">
        <label>Flexibilidade</label>
        <select data-field="varinha_flexibilidade">
          <option value="">— Selecione —</option>
          <option>Muito Flexível</option><option>Flexível</option>
          <option>Levemente Flexível</option><option>Rígida</option>
          <option>Muito Rígida</option><option>Dura como Pedra</option>
        </select>
      </div>
    </div>
    <p style="font-size:12px;font-style:italic;color:var(--ink-soft);margin-bottom:10px">Itens, artefatos e relíquias que o personagem carrega ou possui.</p>
    <div class="obj-header">
      <span>Item (Artefato/Relíquia)</span>
      <span>Descrição / Efeito</span>
      <span></span>
    </div>
    <div class="obj-header-mobile">Item e Descrição</div>
    <div class="objetos-lista">
      <div class="objeto-item">
        <input type="text" placeholder="Nome do item">
        <input type="text" placeholder="Descrição ou efeito mágico">
        <button class="btn-del-obj" onclick="removerObjeto(this)" title="Remover">✕</button>
      </div>
      <div class="objeto-item">
        <input type="text" placeholder="Nome do item">
        <input type="text" placeholder="Descrição ou efeito mágico">
        <button class="btn-del-obj" onclick="removerObjeto(this)" title="Remover">✕</button>
      </div>
      <div class="objeto-item">
        <input type="text" placeholder="Nome do item">
        <input type="text" placeholder="Descrição ou efeito mágico">
        <button class="btn-del-obj" onclick="removerObjeto(this)" title="Remover">✕</button>
      </div>
    </div>
    <div class="obj-footer">
      <button class="btn-add-obj" onclick="adicionarObjeto(this)" style="width:auto;padding:0 14px;font-size:12px;height:28px">+ Adicionar Item</button>
    </div>

    <!-- ATRIBUTOS BASE -->
    <h2 class="sec-title"><span class="sec-icon">⚗</span> Atributos Base</h2>
    <div class="attrs-grid">
      <div class="attr-box"><span>FOR — Força</span><input type="text" data-field="for" value="50"></div>
      <div class="attr-box"><span>DES — Destreza</span><input type="text" data-field="des" value="60"></div>
      <div class="attr-box"><span>INT — Inteligência</span><input type="text" data-field="int_attr" value="65"></div>
      <div class="attr-box"><span>CON — Constituição</span><input type="text" data-field="con" value="55"></div>
      <div class="attr-box"><span>APA — Aparência</span><input type="text" data-field="apa" value="50"></div>
      <div class="attr-box"><span>POD — Poder</span><input type="text" data-field="pod" value="70"></div>
      <div class="attr-box"><span>TAM — Tamanho</span><input type="text" data-field="tam" value="65"></div>
      <div class="attr-box"><span>EDU — Educação</span><input type="text" data-field="edu" value="70"></div>
    </div>

    <!-- RECURSOS DERIVADOS -->
    <h2 class="sec-title"><span class="sec-icon">🛡</span> Recursos e Atributos Derivados</h2>
    <div class="derived-grid">
      <div class="der-box">
        <h4>Pontos de Vida (HP)</h4>
        <small>(CON + TAM) / 5</small>
        <div class="der-values">
          <input type="text" data-field="hp_atual" value="24">
          <span>/</span>
          <input type="text" data-field="hp_max" value="24">
        </div>
      </div>
      <div class="der-box">
        <h4>Postura (Guarda)</h4>
        <small>(CON + POD) / 5</small>
        <div class="der-values">
          <input type="text" data-field="postura_atual" value="25">
          <span>/</span>
          <input type="text" data-field="postura_max" value="25">
        </div>
        <div data-calc="postura_status" class="postura-status" style="color:var(--forest)">SAUDÁVEL</div>
      </div>
      <div class="der-box">
        <h4>Pontos de Magia (PM)</h4>
        <small>(POD / 5)</small>
        <div class="der-values">
          <input type="text" data-field="pm_atual" value="14">
          <span>/</span>
          <input type="text" data-field="pm_max" value="14">
        </div>
      </div>
      <div class="der-box sorte">
        <h4>Sorte</h4>
        <small>Gaste para ajustar dados</small>
        <div class="der-values">
          <input type="text" data-field="sorte_atual" value="55">
          <span>/ 99</span>
        </div>
      </div>
    </div>

    <!-- FEITIÇOS PROFICIENTES -->
    <h2 class="sec-title"><span class="sec-icon">✨</span> Feitiços Proficientes (Assinatura)</h2>
    <div class="feiticos-intro">
      Escolha <strong>APENAS 2 feitiços</strong> na criação. São lançados com Vantagem. Defina a melhoria de cada um:
      <ul>
        <li><strong>Aumentar Efeito/Dano:</strong> +1d4 de Dano (HP) para magias ofensivas, ou +1d4 de redução de Postura para magias de controle.</li>
        <li><strong>Dobrar Alcance Base:</strong> Anula 1 nível de penalidade de distância passivamente.</li>
      </ul>
    </div>
    <div class="feiticos-grid">
      <div class="feitico-card">
        <input type="text" data-field="feitico1" placeholder="Feitiço 1 (Ex: Expelliarmus — Efeito)">
        <select data-field="feitico1_upg">
          <option value="">— Escolha a Melhoria —</option>
          <option value="dano">Aumentar Efeito/Dano</option>
          <option value="alcance">Dobrar Alcance Base</option>
        </select>
      </div>
      <div class="feitico-card">
        <input type="text" data-field="feitico2" placeholder="Feitiço 2 (Ex: Estupefaça — Dano)">
        <select data-field="feitico2_upg">
          <option value="">— Escolha a Melhoria —</option>
          <option value="dano">Aumentar Efeito/Dano</option>
          <option value="alcance">Dobrar Alcance Base</option>
        </select>
      </div>
    </div>

    <!-- PERÍCIAS -->
    <h2 class="sec-title"><span class="sec-icon">📋</span> Perícias do Auror</h2>
    <div class="skills-grid">
      <div class="skill-col">
        <h3>Combate e Físico</h3>
        <div class="skill-item"><span class="skill-total" data-total="sk_arremessar">—</span><label data-skill-label="sk_arremessar"><span class="skill-label-text">Arremessar (20%)<span class="escola-bonus" data-skill="sk_arremessar" style="color:var(--gold);font-size:10px;font-weight:700"></span></span></label><span class="skill-thresholds" data-thresh="sk_arremessar"></span><input type="text" data-field="sk_arremessar"></div>
        <div class="skill-item"><span class="skill-total" data-total="sk_atletismo">—</span><label data-skill-label="sk_atletismo"><span class="skill-label-text">Atletismo/Pular (20%)<span class="escola-bonus" data-skill="sk_atletismo" style="color:var(--gold);font-size:10px;font-weight:700"></span></span></label><span class="skill-thresholds" data-thresh="sk_atletismo"></span><input type="text" data-field="sk_atletismo"></div>
        <div class="skill-item"><span class="skill-total" data-total="sk_conjuracao">—</span><label data-skill-label="sk_conjuracao"><span class="skill-label-text">Conjuração (05%)<span class="escola-bonus" data-skill="sk_conjuracao" style="color:var(--gold);font-size:10px;font-weight:700"></span></span></label><span class="skill-thresholds" data-thresh="sk_conjuracao"></span><input type="text" data-field="sk_conjuracao"></div>
        <div class="skill-item"><span class="skill-total" data-total="sk_defesa">—</span><label data-skill-label="sk_defesa"><span class="skill-label-text">Defesa / Protego (20%)<span class="escola-bonus" data-skill="sk_defesa" style="color:var(--gold);font-size:10px;font-weight:700"></span></span></label><span class="skill-thresholds" data-thresh="sk_defesa"></span><input type="text" data-field="sk_defesa"></div>
        <div class="skill-item"><span class="skill-total" data-total="sk_encantamento">—</span><label data-skill-label="sk_encantamento"><span class="skill-label-text">Encantamento (20%)<span class="escola-bonus" data-skill="sk_encantamento" style="color:var(--gold);font-size:10px;font-weight:700"></span></span></label><span class="skill-thresholds" data-thresh="sk_encantamento"></span><input type="text" data-field="sk_encantamento"></div>
        <div class="skill-item"><span class="skill-total" data-total="sk_esquiva">—</span><label data-skill-label="sk_esquiva"><span class="skill-label-text">Esquiva (Metade DES)<span class="escola-bonus" data-skill="sk_esquiva" style="color:var(--gold);font-size:10px;font-weight:700"></span></span></label><span class="skill-thresholds" data-thresh="sk_esquiva"></span><input type="text" data-field="sk_esquiva"></div>
        <div class="skill-item"><span class="skill-total" data-total="sk_furtividade">—</span><label data-skill-label="sk_furtividade"><span class="skill-label-text">Furtividade (20%)<span class="escola-bonus" data-skill="sk_furtividade" style="color:var(--gold);font-size:10px;font-weight:700"></span></span></label><span class="skill-thresholds" data-thresh="sk_furtividade"></span><input type="text" data-field="sk_furtividade"></div>
        <div class="skill-item"><span class="skill-total" data-total="sk_luta">—</span><label data-skill-label="sk_luta"><span class="skill-label-text">Luta Corporal (15%)<span class="escola-bonus" data-skill="sk_luta" style="color:var(--gold);font-size:10px;font-weight:700"></span></span></label><span class="skill-thresholds" data-thresh="sk_luta"></span><input type="text" data-field="sk_luta"></div>
        <div class="skill-item"><span class="skill-total" data-total="sk_trevas">—</span><label data-skill-label="sk_trevas"><span class="skill-label-text">Magia das Trevas (01%)<span class="escola-bonus" data-skill="sk_trevas" style="color:var(--gold);font-size:10px;font-weight:700"></span></span></label><span class="skill-thresholds" data-thresh="sk_trevas"></span><input type="text" data-field="sk_trevas"></div>
        <div class="skill-item"><span class="skill-total" data-total="sk_magia_combate">—</span><label data-skill-label="sk_magia_combate"><span class="skill-label-text">Magia de Combate (20%)<span class="escola-bonus" data-skill="sk_magia_combate" style="color:var(--gold);font-size:10px;font-weight:700"></span></span></label><span class="skill-thresholds" data-thresh="sk_magia_combate"></span><input type="text" data-field="sk_magia_combate"></div>
        <div class="skill-item"><span class="skill-total" data-total="sk_natacao">—</span><label data-skill-label="sk_natacao"><span class="skill-label-text">Natação (20%)<span class="escola-bonus" data-skill="sk_natacao" style="color:var(--gold);font-size:10px;font-weight:700"></span></span></label><span class="skill-thresholds" data-thresh="sk_natacao"></span><input type="text" data-field="sk_natacao"></div>
        <div class="skill-item"><span class="skill-total" data-total="sk_transfiguracao">—</span><label data-skill-label="sk_transfiguracao"><span class="skill-label-text">Transfiguração (05%)<span class="escola-bonus" data-skill="sk_transfiguracao" style="color:var(--gold);font-size:10px;font-weight:700"></span></span></label><span class="skill-thresholds" data-thresh="sk_transfiguracao"></span><input type="text" data-field="sk_transfiguracao"></div>
        <div class="skill-item"><span class="skill-total" data-total="sk_voo">—</span><label data-skill-label="sk_voo"><span class="skill-label-text">Voo com Vassoura (10%)<span class="escola-bonus" data-skill="sk_voo" style="color:var(--gold);font-size:10px;font-weight:700"></span></span></label><span class="skill-thresholds" data-thresh="sk_voo"></span><input type="text" data-field="sk_voo"></div>
      </div>
      <div class="skill-col">
        <h3>Conhecimento e Magia</h3>
        <div class="skill-item"><span class="skill-total" data-total="sk_alquimia">—</span><label data-skill-label="sk_alquimia"><span class="skill-label-text">Alquimia (01%)<span class="escola-bonus" data-skill="sk_alquimia" style="color:var(--gold);font-size:10px;font-weight:700"></span></span></label><span class="skill-thresholds" data-thresh="sk_alquimia"></span><input type="text" data-field="sk_alquimia"></div>
        <div class="skill-item"><span class="skill-total" data-total="sk_antiguidades">—</span><label data-skill-label="sk_antiguidades"><span class="skill-label-text">Antiguidades Mágicas (05%)<span class="escola-bonus" data-skill="sk_antiguidades" style="color:var(--gold);font-size:10px;font-weight:700"></span></span></label><span class="skill-thresholds" data-thresh="sk_antiguidades"></span><input type="text" data-field="sk_antiguidades"></div>
        <div class="skill-item"><span class="skill-total" data-total="sk_aritmancia">—</span><label data-skill-label="sk_aritmancia"><span class="skill-label-text">Aritmancia (01%)<span class="escola-bonus" data-skill="sk_aritmancia" style="color:var(--gold);font-size:10px;font-weight:700"></span></span></label><span class="skill-thresholds" data-thresh="sk_aritmancia"></span><input type="text" data-field="sk_aritmancia"></div>
        <div class="skill-item"><span class="skill-total" data-total="sk_arqueologia">—</span><label data-skill-label="sk_arqueologia"><span class="skill-label-text">Arqueologia/Geologia (01%)<span class="escola-bonus" data-skill="sk_arqueologia" style="color:var(--gold);font-size:10px;font-weight:700"></span></span></label><span class="skill-thresholds" data-thresh="sk_arqueologia"></span><input type="text" data-field="sk_arqueologia"></div>
        <div class="skill-item"><span class="skill-total" data-total="sk_curandeirismo">—</span><label data-skill-label="sk_curandeirismo"><span class="skill-label-text">Curandeirismo (10%)<span class="escola-bonus" data-skill="sk_curandeirismo" style="color:var(--gold);font-size:10px;font-weight:700"></span></span></label><span class="skill-thresholds" data-thresh="sk_curandeirismo"></span><input type="text" data-field="sk_curandeirismo"></div>
        <div class="skill-item"><span class="skill-total" data-total="sk_trouxas">—</span><label data-skill-label="sk_trouxas"><span class="skill-label-text">Estudo dos Trouxas (10%)<span class="escola-bonus" data-skill="sk_trouxas" style="color:var(--gold);font-size:10px;font-weight:700"></span></span></label><span class="skill-thresholds" data-thresh="sk_trouxas"></span><input type="text" data-field="sk_trouxas"></div>
        <div class="skill-item"><span class="skill-total" data-total="sk_herbologia">—</span><label data-skill-label="sk_herbologia"><span class="skill-label-text">Herbologia (10%)<span class="escola-bonus" data-skill="sk_herbologia" style="color:var(--gold);font-size:10px;font-weight:700"></span></span></label><span class="skill-thresholds" data-thresh="sk_herbologia"></span><input type="text" data-field="sk_herbologia"></div>
        <div class="skill-item"><span class="skill-total" data-total="sk_historia">—</span><label data-skill-label="sk_historia"><span class="skill-label-text">História da Magia (05%)<span class="escola-bonus" data-skill="sk_historia" style="color:var(--gold);font-size:10px;font-weight:700"></span></span></label><span class="skill-thresholds" data-thresh="sk_historia"></span><input type="text" data-field="sk_historia"></div>
        <div class="skill-item"><span class="skill-total" data-total="sk_leis">—</span><label data-skill-label="sk_leis"><span class="skill-label-text">Leis do Ministério (05%)<span class="escola-bonus" data-skill="sk_leis" style="color:var(--gold);font-size:10px;font-weight:700"></span></span></label><span class="skill-thresholds" data-thresh="sk_leis"></span><input type="text" data-field="sk_leis"></div>
        <div class="skill-item"><span class="skill-total" data-total="sk_pocoes">—</span><label data-skill-label="sk_pocoes"><span class="skill-label-text">Poções (10%)<span class="escola-bonus" data-skill="sk_pocoes" style="color:var(--gold);font-size:10px;font-weight:700"></span></span></label><span class="skill-thresholds" data-thresh="sk_pocoes"></span><input type="text" data-field="sk_pocoes"></div>
        <div class="skill-item"><span class="skill-total" data-total="sk_teoria">—</span><label data-skill-label="sk_teoria"><span class="skill-label-text">Teoria da Magia/Runas (01%)<span class="escola-bonus" data-skill="sk_teoria" style="color:var(--gold);font-size:10px;font-weight:700"></span></span></label><span class="skill-thresholds" data-thresh="sk_teoria"></span><input type="text" data-field="sk_teoria"></div>
        <div class="skill-item"><span class="skill-total" data-total="sk_criaturas">—</span><label data-skill-label="sk_criaturas"><span class="skill-label-text">Trato de Criaturas (10%)<span class="escola-bonus" data-skill="sk_criaturas" style="color:var(--gold);font-size:10px;font-weight:700"></span></span></label><span class="skill-thresholds" data-thresh="sk_criaturas"></span><input type="text" data-field="sk_criaturas"></div>
        <div class="skill-item"><span class="skill-total" data-total="sk_biblioteca">—</span><label data-skill-label="sk_biblioteca"><span class="skill-label-text">Usar Biblioteca (20%)<span class="escola-bonus" data-skill="sk_biblioteca" style="color:var(--gold);font-size:10px;font-weight:700"></span></span></label><span class="skill-thresholds" data-thresh="sk_biblioteca"></span><input type="text" data-field="sk_biblioteca"></div>
      </div>
      <div class="skill-col">
        <h3>Sociais e Práticas</h3>
        <div class="skill-item"><span class="skill-total" data-total="sk_arte">—</span><label data-skill-label="sk_arte"><span class="skill-label-text">Arte/Criação (05%)<span class="escola-bonus" data-skill="sk_arte" style="color:var(--gold);font-size:10px;font-weight:700"></span></span></label><span class="skill-thresholds" data-thresh="sk_arte"></span><input type="text" data-field="sk_arte"></div>
        <div class="skill-item"><span class="skill-total" data-total="sk_charme">—</span><label data-skill-label="sk_charme"><span class="skill-label-text">Charme (15%)<span class="escola-bonus" data-skill="sk_charme" style="color:var(--gold);font-size:10px;font-weight:700"></span></span></label><span class="skill-thresholds" data-thresh="sk_charme"></span><input type="text" data-field="sk_charme"></div>
        <div class="skill-item"><span class="skill-total" data-total="sk_disfarce">—</span><label data-skill-label="sk_disfarce"><span class="skill-label-text">Disfarce / Polissuco (05%)<span class="escola-bonus" data-skill="sk_disfarce" style="color:var(--gold);font-size:10px;font-weight:700"></span></span></label><span class="skill-thresholds" data-thresh="sk_disfarce"></span><input type="text" data-field="sk_disfarce"></div>
        <div class="skill-item"><span class="skill-total" data-total="sk_esconder">—</span><label data-skill-label="sk_esconder"><span class="skill-label-text">Esconder (10%)<span class="escola-bonus" data-skill="sk_esconder" style="color:var(--gold);font-size:10px;font-weight:700"></span></span></label><span class="skill-thresholds" data-thresh="sk_esconder"></span><input type="text" data-field="sk_esconder"></div>
        <div class="skill-item"><span class="skill-total" data-total="sk_escutar">—</span><label data-skill-label="sk_escutar"><span class="skill-label-text">Escutar (20%)<span class="escola-bonus" data-skill="sk_escutar" style="color:var(--gold);font-size:10px;font-weight:700"></span></span></label><span class="skill-thresholds" data-thresh="sk_escutar"></span><input type="text" data-field="sk_escutar"></div>
        <div class="skill-item"><span class="skill-total" data-total="sk_intimidacao">—</span><label data-skill-label="sk_intimidacao"><span class="skill-label-text">Intimidação (15%)<span class="escola-bonus" data-skill="sk_intimidacao" style="color:var(--gold);font-size:10px;font-weight:700"></span></span></label><span class="skill-thresholds" data-thresh="sk_intimidacao"></span><input type="text" data-field="sk_intimidacao"></div>
        <div class="skill-item"><span class="skill-total" data-total="sk_labia">—</span><label data-skill-label="sk_labia"><span class="skill-label-text">Lábia (05%)<span class="escola-bonus" data-skill="sk_labia" style="color:var(--gold);font-size:10px;font-weight:700"></span></span></label><span class="skill-thresholds" data-thresh="sk_labia"></span><input type="text" data-field="sk_labia"></div>
        <div class="skill-item"><span class="skill-total" data-total="sk_linguas">—</span><label data-skill-label="sk_linguas"><span class="skill-label-text">Línguas Mágicas (01%)<span class="escola-bonus" data-skill="sk_linguas" style="color:var(--gold);font-size:10px;font-weight:700"></span></span></label><span class="skill-thresholds" data-thresh="sk_linguas"></span><input type="text" data-field="sk_linguas"></div>
        <div class="skill-item"><span class="skill-total" data-total="sk_percepcao">—</span><label data-skill-label="sk_percepcao"><span class="skill-label-text">Percepção / Revelare (25%)<span class="escola-bonus" data-skill="sk_percepcao" style="color:var(--gold);font-size:10px;font-weight:700"></span></span></label><span class="skill-thresholds" data-thresh="sk_percepcao"></span><input type="text" data-field="sk_percepcao"></div>
        <div class="skill-item"><span class="skill-total" data-total="sk_prestidigi">—</span><label data-skill-label="sk_prestidigi"><span class="skill-label-text">Prestidigitação (10%)<span class="escola-bonus" data-skill="sk_prestidigi" style="color:var(--gold);font-size:10px;font-weight:700"></span></span></label><span class="skill-thresholds" data-thresh="sk_prestidigi"></span><input type="text" data-field="sk_prestidigi"></div>
        <div class="skill-item"><span class="skill-total" data-total="sk_psicologia">—</span><label data-skill-label="sk_psicologia"><span class="skill-label-text">Psicologia (10%)<span class="escola-bonus" data-skill="sk_psicologia" style="color:var(--gold);font-size:10px;font-weight:700"></span></span></label><span class="skill-thresholds" data-thresh="sk_psicologia"></span><input type="text" data-field="sk_psicologia"></div>
        <div class="skill-item"><span class="skill-total" data-total="sk_rastreamento">—</span><label data-skill-label="sk_rastreamento"><span class="skill-label-text">Rastreamento Mágico (10%)<span class="escola-bonus" data-skill="sk_rastreamento" style="color:var(--gold);font-size:10px;font-weight:700"></span></span></label><span class="skill-thresholds" data-thresh="sk_rastreamento"></span><input type="text" data-field="sk_rastreamento"></div>
        <div class="skill-item"><span class="skill-total" data-total="sk_sobrevivencia">—</span><label data-skill-label="sk_sobrevivencia"><span class="skill-label-text">Sobrevivência (10%)<span class="escola-bonus" data-skill="sk_sobrevivencia" style="color:var(--gold);font-size:10px;font-weight:700"></span></span></label><span class="skill-thresholds" data-thresh="sk_sobrevivencia"></span><input type="text" data-field="sk_sobrevivencia"></div>
      </div>
    </div>
    <p class="skills-footnote">⚠ O campo numérico à direita de cada perícia é a quantidade de pontos que você deseja <strong>distribuir</strong> nela — não o total final. O valor total (base + bônus de ensino + pontos distribuídos) é exibido automaticamente à esquerda.</p>

    <!-- PAINEL DE COMBATE & ROLADOR -->
    <h2 class="sec-title"><span class="sec-icon">🎲</span> Painel de Combate &amp; Dados</h2>
    <div class="combat-panel">

      <!-- Abas internas -->
      <div class="combat-tabs">
        <button class="combat-tab-btn active" data-ctab="ataque" onclick="switchCombatTab(this,'ataque','${id}')">⚔ Ataque</button>
        <button class="combat-tab-btn" data-ctab="efeito" onclick="switchCombatTab(this,'efeito','${id}')">🌀 Efeito / Guarda</button>
        <button class="combat-tab-btn" data-ctab="custom" onclick="switchCombatTab(this,'custom','${id}')">🎲 Dados Livres</button>
      </div>

      <!-- ═══ ABA: ATAQUE DE DANO ═══ -->
      <div class="combat-tab-pane active" id="ctab-ataque-${id}">
        <div class="damage-options-title">Tipo de ataque</div>
        <div class="attack-type-row">
          <button class="attack-type-btn selected" data-atype="normal" onclick="selectAttackType(this,'${id}')">
            <span class="atk-icon">🗲</span>
            <span class="atk-label">Normal</span>
            <span class="atk-sub">1d6 HP</span>
          </button>
          <button class="attack-type-btn" data-atype="vulneravel" onclick="selectAttackType(this,'${id}')">
            <span class="atk-icon">💀</span>
            <span class="atk-label">Vulnerável</span>
            <span class="atk-sub">1d6 + 1d6 HP</span>
          </button>
          <button class="attack-type-btn" data-atype="assinatura" onclick="selectAttackType(this,'${id}')">
            <span class="atk-icon">✨</span>
            <span class="atk-label">Assinatura</span>
            <span class="atk-sub">1d6 + 1d4 HP</span>
          </button>
          <button class="attack-type-btn" data-atype="assinatura_vuln" onclick="selectAttackType(this,'${id}')">
            <span class="atk-icon">⚡</span>
            <span class="atk-label">Assinatura + Vuln.</span>
            <span class="atk-sub">1d6 + 1d4 + 1d6 HP</span>
          </button>
        </div>

        <div class="damage-options">
          <div class="damage-options-title">Modificadores adicionais</div>
          <div class="damage-checkboxes">
            <label class="damage-check-item">
              <input type="checkbox" data-dmg-mod="rank_b" onchange="updateDamagePreview('${id}','ataque')">
              <label>Rank <strong>B</strong> (Medidor de Estilo) <small>— +5% em Magia de Combate</small></label>
            </label>
            <label class="damage-check-item">
              <input type="checkbox" data-dmg-mod="rank_a" onchange="updateDamagePreview('${id}','ataque')">
              <label>Rank <strong>A</strong> (Medidor de Estilo) <small>— +1d dado de Postura extra</small></label>
            </label>
          </div>
        </div>

        <div class="damage-preview" id="dmg-preview-ataque-${id}">
          <span class="damage-preview-formula" id="dmg-formula-ataque-${id}">1d6</span>
          <span class="damage-preview-desc" id="dmg-desc-ataque-${id}">Dano em HP</span>
        </div>

        <div class="arm-qty-row">
          <span class="arm-qty-label">Qtd. de dados para rolagens múltiplas</span>
          <button class="arm-qty-btn" onclick="armQtyChange('${id}',-1)">−</button>
          <span class="arm-qty-val" id="arm-qty-val-${id}">2</span>
          <button class="arm-qty-btn" onclick="armQtyChange('${id}',1)">+</button>
        </div>

        <div class="attack-roll-modes">
          <button class="arm-btn" onclick="rollAttack('${id}','ataque','normal')">
            <span class="arm-icon">🎲</span>Normal
          </button>
          <button class="arm-btn adv" onclick="rollAttack('${id}','ataque','advantage')">
            <span class="arm-icon">⬆</span>Vantagem
          </button>
          <button class="arm-btn disadv" onclick="rollAttack('${id}','ataque','disadvantage')">
            <span class="arm-icon">⬇</span>Desvantagem
          </button>
          <button class="arm-btn multi" onclick="rollAttack('${id}','ataque','multi')" style="grid-column:1/-1">
            <span class="arm-icon">🔁</span>Múltiplas rolagens (sem escolha)
          </button>
        </div>

        <div class="attack-result-area" id="atk-result-${id}">
          <span>Selecione o tipo de ataque e clique em rolar.</span>
        </div>
      </div>

      <!-- ═══ ABA: EFEITO / GUARDA ═══ -->
      <div class="combat-tab-pane" id="ctab-efeito-${id}">
        <div class="damage-options-title">Tipo de efeito sobre Postura</div>
        <div class="attack-type-row">
          <button class="attack-type-btn selected" data-etype="bloqueado" onclick="selectEffectType(this,'${id}')">
            <span class="atk-icon">🛡</span>
            <span class="atk-label">Bloqueado</span>
            <span class="atk-sub">1d6 Postura</span>
          </button>
          <button class="attack-type-btn" data-etype="acertou" onclick="selectEffectType(this,'${id}')">
            <span class="atk-icon">💥</span>
            <span class="atk-label">Acertou direto</span>
            <span class="atk-sub">2d6 Postura</span>
          </button>
          <button class="attack-type-btn" data-etype="assinatura_ef" onclick="selectEffectType(this,'${id}')">
            <span class="atk-icon">✨</span>
            <span class="atk-label">Assinatura</span>
            <span class="atk-sub">+1d4 Postura extra</span>
          </button>
          <button class="attack-type-btn" data-etype="assinatura_ef_acertou" onclick="selectEffectType(this,'${id}')">
            <span class="atk-icon">⚡</span>
            <span class="atk-label">Assinatura + Acertou</span>
            <span class="atk-sub">2d6 + 1d4 Postura</span>
          </button>
          <button class="attack-type-btn" data-etype="ambiental" onclick="selectEffectType(this,'${id}')">
            <span class="atk-icon">🪨</span>
            <span class="atk-label">Impacto Ambiental</span>
            <span class="atk-sub">1d4 Postura direto</span>
          </button>
        </div>

        <div class="damage-options">
          <div class="damage-options-title">Modificadores</div>
          <div class="damage-checkboxes">
            <label class="damage-check-item">
              <input type="checkbox" data-eff-mod="rank_a_ef" onchange="updateDamagePreview('${id}','efeito')">
              <label>Rank <strong>A</strong> (Medidor de Estilo) <small>— +1d dado de Postura extra</small></label>
            </label>
          </div>
        </div>

        <div class="damage-preview" id="dmg-preview-efeito-${id}">
          <span class="damage-preview-formula" id="dmg-formula-efeito-${id}">1d6</span>
          <span class="damage-preview-desc" id="dmg-desc-efeito-${id}">Dano de Postura</span>
        </div>

        <div class="arm-qty-row">
          <span class="arm-qty-label">Qtd. de dados para rolagens múltiplas</span>
          <button class="arm-qty-btn" onclick="armQtyChange('${id}',-1)">−</button>
          <span class="arm-qty-val" id="arm-qty-val-ef-${id}">2</span>
          <button class="arm-qty-btn" onclick="armQtyChange('${id}',1,true)">+</button>
        </div>

        <div class="attack-roll-modes">
          <button class="arm-btn" onclick="rollAttack('${id}','efeito','normal')">
            <span class="arm-icon">🎲</span>Normal
          </button>
          <button class="arm-btn adv" onclick="rollAttack('${id}','efeito','advantage')">
            <span class="arm-icon">⬆</span>Vantagem
          </button>
          <button class="arm-btn disadv" onclick="rollAttack('${id}','efeito','disadvantage')">
            <span class="arm-icon">⬇</span>Desvantagem
          </button>
          <button class="arm-btn multi" onclick="rollAttack('${id}','efeito','multi')" style="grid-column:1/-1">
            <span class="arm-icon">🔁</span>Múltiplas rolagens (sem escolha)
          </button>
        </div>

        <div class="attack-result-area" id="eff-result-${id}">
          <span>Selecione o tipo de efeito e clique em rolar.</span>
        </div>
      </div>

      <!-- ═══ ABA: DADOS LIVRES ═══ -->
      <div class="combat-tab-pane" id="ctab-custom-${id}">
        <div class="custom-dice-panel">
          <div class="custom-dice-input-row">
            <input class="custom-dice-input" type="text" id="custom-dice-expr-${id}"
              placeholder="Ex: 2d6, 1d4+3, 3d8+1d4..."
              onkeydown="if(event.key==='Enter')rollCustomDice('${id}')">
            <button class="custom-dice-roll-btn" onclick="rollCustomDice('${id}')">🎲 Rolar</button>
          </div>
          <div class="custom-dice-shortcuts">
            <button class="shortcut-btn" onclick="setCustomExpr('${id}','1d4')">d4</button>
            <button class="shortcut-btn" onclick="setCustomExpr('${id}','1d6')">d6</button>
            <button class="shortcut-btn" onclick="setCustomExpr('${id}','1d8')">d8</button>
            <button class="shortcut-btn" onclick="setCustomExpr('${id}','1d10')">d10</button>
            <button class="shortcut-btn" onclick="setCustomExpr('${id}','1d12')">d12</button>
            <button class="shortcut-btn" onclick="setCustomExpr('${id}','1d20')">d20</button>
            <button class="shortcut-btn" onclick="setCustomExpr('${id}','1d100')">d100</button>
            <button class="shortcut-btn" onclick="setCustomExpr('${id}','2d6')">2d6</button>
            <button class="shortcut-btn" onclick="setCustomExpr('${id}','3d6')">3d6</button>
            <button class="shortcut-btn" onclick="setCustomExpr('${id}','1d6+1d4')">1d6+1d4</button>
            <button class="shortcut-btn" onclick="setCustomExpr('${id}','2d6+1d4')">2d6+1d4</button>
            <button class="shortcut-btn" onclick="setCustomExpr('${id}','2d6+1d6')">2d6+1d6</button>
          </div>
          <div class="custom-dice-result" id="custom-result-${id}">
            <span>Digite uma expressão como <strong>2d6</strong> ou <strong>1d6+1d4</strong> e pressione Rolar.</span>
          </div>
        </div>
      </div>

    </div><!-- /combat-panel -->

  </div><!-- /sheet-body -->
</div><!-- /sheet-wrap -->
`; }



/* ═══ TOTAIS E LIMIARES DE PERÍCIA ════════════════════════════ */

// Valores base de cada perícia extraídos dos labels do HTML
const SKILL_BASE = {
  sk_arremessar: 20, sk_atletismo: 20, sk_conjuracao: 5,  sk_defesa: 20,
  sk_encantamento: 20, sk_esquiva: 0,  sk_furtividade: 20, sk_luta: 15,
  sk_trevas: 1,  sk_magia_combate: 20, sk_natacao: 20, sk_transfiguracao: 5,
  sk_voo: 10,    sk_alquimia: 1,       sk_antiguidades: 5, sk_aritmancia: 1,
  sk_arqueologia: 1, sk_curandeirismo: 10, sk_trouxas: 10, sk_herbologia: 10,
  sk_historia: 5,    sk_leis: 5,           sk_pocoes: 10,  sk_teoria: 1,
  sk_criaturas: 10,  sk_biblioteca: 20,    sk_arte: 5,     sk_charme: 15,
  sk_disfarce: 5,    sk_esconder: 10,      sk_escutar: 20, sk_intimidacao: 15,
  sk_labia: 5,       sk_linguas: 1,        sk_percepcao: 25, sk_prestidigi: 10,
  sk_psicologia: 10, sk_rastreamento: 10,  sk_sobrevivencia: 10
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
  const base      = lerBasePericia(c, skillKey);
  const bonusEsc  = lerBonusEscola(c, skillKey);
  const distribEl = c.querySelector(`[data-field="${skillKey}"]`);
  const distrib   = parseInt(distribEl?.value) || 0;

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
  'hogwarts':      { choose: true, choices: [['sk_encantamento',10],['sk_defesa',10]], fixed: [['sk_magia_combate',5]] },
  'ilvermorny':    { choose: false, fixed: [['sk_magia_combate',10],['sk_conjuracao',5]] },
  'beauxbatons':   { choose: false, fixed: [['sk_charme',10],['sk_prestidigi',10]] },
  'mahoutokoro':   { choose: false, fixed: [['sk_voo',15],['sk_esquiva',5]] },
  'uagadou':       { choose: false, fixed: [['sk_conjuracao',10]] },
  'castelobruxo':  { choose: false, fixed: [['sk_herbologia',10],['sk_criaturas',10]] },
  'koldovstoretz': { choose: false, fixed: [['sk_sobrevivencia',10],['sk_magia_combate',5]] },
  'durmstrang':    { choose: false, fixed: [['sk_trevas',10],['sk_intimidacao',5]] },
  'domiciliar':    null  // handled separately via onDomiciliarChange
};

// Hogwarts tem escolha entre Encantamento ou Defesa — para simplificar, aplicamos ambas como lista
// e o jogador escolhe via nota; aqui mostramos +10% nos dois para destaque visual
// mas na prática o bônus real vem de UMA delas. Ajustar conforme preferência do mestre.
// Na implementação abaixo, mostramos os dois com "(escolha)" discriminado.
const ESCOLA_BONUSES_HOGWARTS_EITHER = ['sk_encantamento','sk_defesa'];

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
  const isDom    = escola === 'domiciliar';
  const isHog    = escola === 'hogwarts';

  // Campos condicionais
  const fHog = document.getElementById(`hogwarts-choose-field-${id}`);
  const f1   = document.getElementById(`dom-sk1-field-${id}`);
  const f2   = document.getElementById(`dom-sk2-field-${id}`);
  if (fHog) fHog.style.display = isHog  ? '' : 'none';
  if (f1)   f1.style.display   = isDom  ? '' : 'none';
  if (f2)   f2.style.display   = isDom  ? '' : 'none';

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
    'sk_magia_combate','sk_defesa','sk_esquiva','sk_conjuracao',
    'sk_luta','sk_atletismo','sk_percepcao','sk_transfiguracao'
  ],
  'Artilheiro de Cerco': [
    'sk_magia_combate','sk_arremessar','sk_encantamento','sk_conjuracao',
    'sk_percepcao','sk_atletismo','sk_teoria','sk_esquiva'
  ],
  'Caçador das Trevas': [
    'sk_trevas','sk_magia_combate','sk_intimidacao','sk_furtividade',
    'sk_rastreamento','sk_historia','sk_defesa','sk_esquiva'
  ],
  'Combatente Corpo-a-Corpo': [
    'sk_luta','sk_atletismo','sk_esquiva','sk_natacao',
    'sk_defesa','sk_percepcao','sk_arremessar','sk_sobrevivencia'
  ],
  'Cavaleiro de Vassoura (Aéreo)': [
    'sk_voo','sk_magia_combate','sk_percepcao','sk_arremessar',
    'sk_esquiva','sk_atletismo','sk_encantamento','sk_conjuracao'
  ],
  // ── Linha de Investigação ────────────────────────────────────
  'Investigador Forense': [
    'sk_percepcao','sk_biblioteca','sk_psicologia','sk_disfarce',
    'sk_rastreamento','sk_leis','sk_escutar','sk_arqueologia'
  ],
  'Especialista em Necro-investigação': [
    'sk_trevas','sk_historia','sk_percepcao','sk_psicologia',
    'sk_rastreamento','sk_biblioteca','sk_antiguidades','sk_intimidacao'
  ],
  'Rastreador Mágico': [
    'sk_rastreamento','sk_sobrevivencia','sk_percepcao','sk_furtividade',
    'sk_criaturas','sk_atletismo','sk_escutar','sk_esconder'
  ],
  'Analista Arcano': [
    'sk_teoria','sk_aritmancia','sk_historia','sk_antiguidades',
    'sk_biblioteca','sk_percepcao','sk_linguas','sk_leis'
  ],
  'Agente de Inteligência': [
    'sk_furtividade','sk_disfarce','sk_escutar','sk_psicologia',
    'sk_linguas','sk_biblioteca','sk_leis','sk_percepcao'
  ],
  // ── Linha Social ─────────────────────────────────────────────
  'Diplomata do Ministério': [
    'sk_charme','sk_labia','sk_leis','sk_psicologia',
    'sk_linguas','sk_trouxas','sk_arte','sk_intimidacao'
  ],
  'Infiltrador Social': [
    'sk_disfarce','sk_esconder','sk_furtividade','sk_prestidigi',
    'sk_psicologia','sk_percepcao','sk_atletismo','sk_luta'
  ],
  'Negociador de Crise': [
    'sk_labia','sk_psicologia','sk_intimidacao','sk_charme',
    'sk_percepcao','sk_leis','sk_escutar','sk_defesa'
  ],
  'Especialista em Trouxas': [
    'sk_trouxas','sk_disfarce','sk_charme','sk_labia',
    'sk_prestidigi','sk_arte','sk_linguas','sk_percepcao'
  ],
  'Mediador Mágico-Criatura': [
    'sk_criaturas','sk_linguas','sk_charme','sk_psicologia',
    'sk_herbologia','sk_sobrevivencia','sk_percepcao','sk_labia'
  ],
  // ── Linha de Campo ───────────────────────────────────────────
  'Batedor de Fronteira': [
    'sk_sobrevivencia','sk_furtividade','sk_esconder','sk_rastreamento',
    'sk_atletismo','sk_natacao','sk_percepcao','sk_arremessar'
  ],
  'Magizoologista': [
    'sk_criaturas','sk_herbologia','sk_sobrevivencia','sk_rastreamento',
    'sk_percepcao','sk_arremessar','sk_natacao','sk_voo'
  ],
  'Curandeiro de Campo': [
    'sk_curandeirismo','sk_herbologia','sk_pocoes','sk_psicologia',
    'sk_percepcao','sk_biblioteca','sk_alquimia','sk_sobrevivencia'
  ],
  'Alquimista de Campo': [
    'sk_alquimia','sk_pocoes','sk_herbologia','sk_teoria',
    'sk_biblioteca','sk_curandeirismo','sk_conjuracao','sk_arqueologia'
  ],
  'Explorador de Ruínas': [
    'sk_arqueologia','sk_antiguidades','sk_sobrevivencia','sk_esconder',
    'sk_percepcao','sk_rastreamento','sk_historia','sk_furtividade'
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
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  const date = new Date().toISOString().slice(0,10);
  a.href     = url;
  a.download = `fichas_auror_${date}.json`;
  a.click();
  URL.revokeObjectURL(url);
  mostrarToast('✓ Fichas exportadas');
}

document.getElementById('import-file-input').addEventListener('change', function(e) {
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
    } catch(err) {
      mostrarToast('✗ Arquivo inválido');
    }
  };
  reader.readAsText(file);
  this.value = ''; // reset para permitir reimportar o mesmo arquivo
});

/* ═══ INIT ════════════════════════════════════════════════════ */
document.getElementById('btn-nova-aba').addEventListener('click', novaAba);
carregarFichas();
abaAtiva = fichas[0].id;
renderTabs();
renderConteudo();

/* ═══════════════════════════════════════════════════════════════
   SISTEMA DE ROLAGEM DE DADOS (d100)
═══════════════════════════════════════════════════════════════ */

(function() {
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
    if (roll === 1)           return { label: 'Crítico!',        cls: 'res-critico',    success: true };
    if (roll <= extremo)      return { label: 'Sucesso Extremo', cls: 'res-extremo',    success: true };
    if (roll <= dificil)      return { label: 'Sucesso Difícil', cls: 'res-dificil',    success: true };
    if (roll <= skillTotal)   return { label: 'Sucesso Regular', cls: 'res-regular',    success: true };
    if (roll >= 96)           return { label: 'Falha Crítica!',  cls: 'res-falha-crit', success: false };
    return                         { label: 'Falha',             cls: 'res-falha',      success: false };
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
    if (fadeTimer)     { clearTimeout(fadeTimer);     fadeTimer = null; }
    if (autoCloseTimer){ clearTimeout(autoCloseTimer); autoCloseTimer = null; }
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
            <span class="multi-roll-num">#${i+1}</span>
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
      selectedRoll    = Math.min(...rolls);
      const idx       = rolls.indexOf(selectedRoll);
      discardedRolls  = rolls.filter((_, i) => i !== idx);
    } else if (mode === 'disadvantage') {
      selectedRoll    = Math.max(...rolls);
      const idx       = rolls.indexOf(selectedRoll);
      discardedRolls  = rolls.filter((_, i) => i !== idx);
    } else {
      selectedRoll   = rolls[0];
      discardedRolls = [];
    }

    const res = classifyResult(selectedRoll, skillTotal);

    // Etiqueta de modo
    let modeLabel = '';
    if (mode === 'advantage')    modeLabel = `<span class="dice-mode-tag">⬆ Vantagem ×${rolls.length}</span>`;
    if (mode === 'disadvantage') modeLabel = `<span class="dice-mode-tag">⬇ Desvantagem ×${rolls.length}</span>`;

    // Dados exibidos
    let rollsHtml = '';
    if (rolls.length > 1) {
      rollsHtml = '<div class="dice-popup-rolls">';
      rolls.forEach((r, i) => {
        const isSelected = (r === selectedRoll && !rolls.slice(0, i).includes(selectedRoll));
        const cls = isSelected ? 'selected' : 'discarded';
        rollsHtml += `<div><div class="dice-single ${cls}">${r}</div>${isSelected ? '<div class="dice-selected-label">usado</div>' : ''}</div>`;
        if (i < rolls.length - 1) rollsHtml += `<span class="dice-arrow">${mode==='advantage'?'↓':'↑'}</span>`;
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
    const text = totalEl.textContent.trim().replace('%','');
    const total = parseInt(text) || 0;
    // nome: pega do label irmão
    const item = totalEl.closest('.skill-item');
    const labelText = item?.querySelector('.skill-label-text')?.textContent?.trim() || 'Perícia';
    const name = labelText.replace(/\(.*?\)/g,'').trim();
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
    if (top  + menuH > vh - 8) top  = vh - menuH - 8;
    if (left < 8) left = 8;
    if (top  < 8) top  = 8;
    ctxMenuEl.style.left = left + 'px';
    ctxMenuEl.style.top  = top  + 'px';

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
    parts.push('1d6');  descs.push('Dano base HP');
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
  const state  = getCombatState(id);
  const resultEl = document.getElementById(tab === 'ataque' ? `atk-result-${id}` : `eff-result-${id}`);
  if (!resultEl) return;

  // Animação
  resultEl.className = 'attack-result-area';
  resultEl.innerHTML = '<span style="color:#888;font-style:italic;animation:rolling-pulse .9s infinite">🎲 Rolando...</span>';

  setTimeout(() => {
    // ── Rolagem do d100 ────────────────────────────────────────
    const qty    = (mode === 'normal') ? 1 : state.armQty;
    const d100s  = Array.from({ length: qty }, () => rollDie(100));

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
      if (r === 1)          return { label: 'Crítico!',        cls: 'res-critico'    };
      if (r <= extremo)     return { label: 'Extremo',         cls: 'res-extremo'    };
      if (r <= dificil)     return { label: 'Difícil',         cls: 'res-dificil'    };
      if (r <= skillTotal)  return { label: 'Regular',         cls: 'res-regular'    };
      if (r >= 96)          return { label: 'Falha Crítica!',  cls: 'res-falha-crit' };
      return                       { label: 'Falha',           cls: 'res-falha'      };
    }

    // ── Dados de dano ───────────────────────────────────────────
    let dmgParts = [];
    let dmgTotal = 0;
    let dmgDesc  = '';
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
          <span style="font-size:9px;color:#666;min-width:18px;text-align:right">#${i+1}</span>
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
          const isUsed = (r === d100Selected && !d100s.slice(0,i).includes(d100Selected));
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
    const dmgDiceHtml = dmgParts.map((p, i) => `<span class="dmg-die ${p.tag||''}" title="${p.die}">${p.val}</span>${i < dmgParts.length - 1 ? '<span class="dmg-plus">+</span>' : ''}`).join('');
    const dmgHtml = `
      <hr class="attack-res-divider">
      <div class="attack-res-damage-label">${dmgDesc}</div>
      <div class="attack-res-damage-line">
        <span class="attack-res-damage-total">${dmgTotal}</span>
        <span class="attack-res-damage-breakdown">${dmgParts.map(p=>`${p.val}${p.die}`).join(' + ')}</span>
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