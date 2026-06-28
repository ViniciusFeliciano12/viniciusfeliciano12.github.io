/* ═══════════════════════════════════════════════════════════════
   SKILLS — perícias, escolas e especializações
═══════════════════════════════════════════════════════════════ */

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

function lerBonusEscola(c, skillKey) {
  const span = c.querySelector(`.escola-bonus[data-skill="${skillKey}"]`);
  if (!span || !span.textContent) return 0;
  const m = span.textContent.match(/\+(\d+)/);
  return m ? parseInt(m[1]) : 0;
}

function lerBasePericia(c, skillKey) {
  if (skillKey === 'sk_esquiva') {
    const des = parseInt(c.querySelector('[data-field="des"]')?.value) || 0;
    return Math.floor(des / 2);
  }
  return SKILL_BASE[skillKey] || 0;
}

const RANK_B_PLUS = ['B', 'A', 'S', 'SS', 'SSS'];

function lerBonusEstilo(c, skillKey) {
  if (skillKey !== 'sk_magia_combate') return 0;
  const rank = c.querySelector('[data-field="estilo_rank"]')?.value || '';
  return RANK_B_PLUS.includes(rank) ? 5 : 0;
}

function atualizarPericia(c, skillKey) {
  const base = lerBasePericia(c, skillKey);
  const bonusEsc = lerBonusEscola(c, skillKey);
  const bonusEstilo = lerBonusEstilo(c, skillKey);
  const ip = parseInt(c.querySelector(`[data-field="${skillKey}_ip"]`)?.value) || 0;
  const oc = parseInt(c.querySelector(`[data-field="${skillKey}_oc"]`)?.value) || 0;
  const livre = parseInt(c.querySelector(`[data-field="${skillKey}_livre"]`)?.value) || 0;
  const distrib = ip + oc + livre;

  if (skillKey === 'sk_magia_combate') {
    const estiloSpan = c.querySelector('.estilo-bonus[data-estilo-skill="sk_magia_combate"]');
    if (estiloSpan) {
      estiloSpan.textContent = bonusEstilo > 0 ? ` +${bonusEstilo}% 🌟` : '';
      estiloSpan.title = bonusEstilo > 0 ? 'Bônus do Medidor de Estilo (Rank B+)' : '';
    }
  }

  const total = Math.min(99, Math.max(0, base + bonusEsc + bonusEstilo + distrib));

  const totalEl = c.querySelector(`[data-total="${skillKey}"]`);
  if (totalEl) totalEl.textContent = total + '%';


  const thrEl = c.querySelector(`[data-thresh="${skillKey}"]`);
  if (!thrEl) return;

  const regular = total;
  const dificil = Math.floor(total / 2);
  const extremo = Math.floor(total / 5);

  thrEl.innerHTML =
    `<span class="thr-line thr-regular">${regular}</span>` +
    `<span class="thr-sep thr-sep-span">/</span>` +
    `<span class="thr-line thr-dificil">${dificil}</span>` +
    `<span class="thr-sep thr-sep-span">/</span>` +
    `<span class="thr-line thr-extremo">${extremo}</span>` +
    `<span class="sdbadge sdbadge-ip"><span class="sdbadge-num">${ip}</span>🧠</span>` +
    `<span class="sdbadge sdbadge-oc"><span class="sdbadge-num">${oc}</span>📚</span>` +
    `<span class="sdbadge sdbadge-livre"><span class="sdbadge-num">${livre}</span>⭐</span>`;
}

function atualizarTodasPericias(id) {
  const c = document.getElementById('content-' + id);
  if (!c) return;
  Object.keys(SKILL_BASE).forEach(sk => atualizarPericia(c, sk));
  atualizarPericia(c, 'sk_esquiva');
  atualizarPontosDistrib(id);
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
  'domiciliar': null
};

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

  if (escola === 'hogwarts') {
    const escolha = c.querySelector('[data-field="hogwarts_escolha"]')?.value || '';
    if (escolha) {
      const span = c.querySelector(`.escola-bonus[data-skill="${escolha}"]`);
      if (span) {
        span.textContent = ` (+10%)`;
        span.title = 'Hogwarts: bônus de Método de Ensino';
        span.style.fontStyle = '';
      }
    } else {
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
    [sk1, sk2].forEach(skill => {
      const span = c.querySelector(`.escola-bonus[data-skill="${skill}"]`);
      if (span) {
        span.textContent = ` (+5%)`;
        span.title = 'Ensino Domiciliar: +5% (duas perícias escolhidas)';
      }
    });
  } else {
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

  const fHog = document.getElementById(`hogwarts-choose-field-${id}`);
  const f1 = document.getElementById(`dom-sk1-field-${id}`);
  const f2 = document.getElementById(`dom-sk2-field-${id}`);
  if (fHog) fHog.style.display = isHog ? '' : 'none';
  if (f1) f1.style.display = isDom ? '' : 'none';
  if (f2) f2.style.display = isDom ? '' : 'none';

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
  'Duelista de Linha': [
    'sk_magia_combate', 'sk_defesa', 'sk_esquiva', 'sk_conjuracao',
    'sk_luta', 'sk_encantamento', 'sk_percepcao', 'sk_transfiguracao'
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

/* ═══ PONTOS DE DISTRIBUIÇÃO ══════════════════════════════════ */
function atualizarPontosDistrib(id) {
  const c = document.getElementById('content-' + id);
  if (!c) return;
  const int = parseInt(c.querySelector('[data-field="int_attr"]')?.value) || 0;
  const edu = parseInt(c.querySelector('[data-field="edu"]')?.value) || 0;
  const maxIp = int * 2;
  const maxOc = edu * 4;

  let spentIp = 0, spentOc = 0;
  Object.keys(SKILL_BASE).forEach(sk => {
    spentIp += parseInt(c.querySelector(`[data-field="${sk}_ip"]`)?.value) || 0;
    spentOc += parseInt(c.querySelector(`[data-field="${sk}_oc"]`)?.value) || 0;
  });

  const ipEl = document.getElementById('pts-ip-' + id);
  const ocEl = document.getElementById('pts-oc-' + id);
  if (ipEl) {
    const over = spentIp > maxIp;
    ipEl.innerHTML = `<span style="color:${over ? 'var(--crimson)' : 'inherit'};font-weight:700">${spentIp}</span><span style="opacity:.6">/${maxIp}</span>`;
    const badge = ipEl.closest('.pts-badge-ip');
    if (badge) badge.style.borderColor = over ? 'var(--crimson)' : '';
  }
  if (ocEl) {
    const over = spentOc > maxOc;
    ocEl.innerHTML = `<span style="color:${over ? 'var(--crimson)' : 'inherit'};font-weight:700">${spentOc}</span><span style="opacity:.6">/${maxOc}</span>`;
    const badge = ocEl.closest('.pts-badge-oc');
    if (badge) badge.style.borderColor = over ? 'var(--crimson)' : '';
  }
}

/* ═══ INPUTS OCULTOS POR PERÍCIA ═══════════════════════════════ */
function inicializarInputsPericia(id) {
  const c = document.getElementById('content-' + id);
  if (!c) return;
  const allSkills = Object.keys(SKILL_BASE).concat(['sk_esquiva']);
  allSkills.forEach(sk => {
    const item = c.querySelector(`[data-total="${sk}"]`)?.closest('.skill-item');
    if (!item) return;
    ['_ip', '_oc', '_livre'].forEach(suffix => {
      const key = sk + suffix;
      if (item.querySelector(`[data-field="${key}"]`)) return;
      const inp = document.createElement('input');
      inp.type = 'hidden';
      inp.dataset.field = key;
      inp.value = '0';
      item.appendChild(inp);
    });
  });
}

/* ═══ TOGGLES DE EVOLUÇÃO POR PERÍCIA ═════════════════════════ */
function inicializarTogglesEvolucao(id) {
  const c = document.getElementById('content-' + id);
  if (!c) return;
  const allSkills = Object.keys(SKILL_BASE).concat(['sk_esquiva']);
  allSkills.forEach(sk => {
    const item = c.querySelector(`[data-total="${sk}"]`)?.closest('.skill-item');
    if (!item) return;
    if (item.dataset.evolveInit) return;
    item.dataset.evolveInit = '1';

    const key = sk + '_evolve';
    if (!item.querySelector(`[data-field="${key}"]`)) {
      const inp = document.createElement('input');
      inp.type = 'hidden';
      inp.dataset.field = key;
      inp.value = '0';
      item.appendChild(inp);
    }

    // cursor já é dado pelo dice.js; só garantimos o hidden input acima
  });
  _sincronizarVisuaisEvolucao(c);
}

function _marcarEvolucaoAposSucesso(sk, id) {
  const c = document.getElementById('content-' + id);
  if (!c) return;
  const item = c.querySelector(`[data-total="${sk}"]`)?.closest('.skill-item');
  if (!item) return;
  const inp = item.querySelector(`[data-field="${sk}_evolve"]`);
  if (!inp || inp.value === '1') return; // já marcado, não faz nada
  inp.value = '1';
  item.classList.add('evolve-ativo');
  if (typeof coletarDados === 'function') coletarDados(id);
}

function _toggleEvolucao(item, sk, id) {
  const c = document.getElementById('content-' + id);
  if (!c) return;
  const inp = item.querySelector(`[data-field="${sk}_evolve"]`);
  if (!inp) return;
  const ativo = inp.value === '1';
  inp.value = ativo ? '0' : '1';
  item.classList.toggle('evolve-ativo', !ativo);
  if (typeof coletarDados === 'function') coletarDados(id);
}

function _sincronizarVisuaisEvolucao(c) {
  c.querySelectorAll('[data-evolve-init]').forEach(item => {
    const sk = item.querySelector('[data-total]')?.dataset.total;
    if (!sk) return;
    const inp = item.querySelector(`[data-field="${sk}_evolve"]`);
    item.classList.toggle('evolve-ativo', inp?.value === '1');
  });
}

/* ═══ POPUP DE PERÍCIA ═════════════════════════════════════════ */
let _popupCurrentId = null;
let _popupCurrentSkill = null;

const SKILL_NAMES = {
  sk_arremessar: 'Arremessar', sk_atletismo: 'Atletismo/Pular', sk_conjuracao: 'Conjuração',
  sk_defesa: 'Defesa / Protego', sk_encantamento: 'Encantamento', sk_esquiva: 'Esquiva',
  sk_furtividade: 'Furtividade', sk_luta: 'Luta Corporal', sk_trevas: 'Magia das Trevas',
  sk_magia_combate: 'Magia de Combate', sk_natacao: 'Natação', sk_transfiguracao: 'Transfiguração',
  sk_voo: 'Voo com Vassoura', sk_alquimia: 'Alquimia', sk_antiguidades: 'Antiguidades Mágicas',
  sk_aritmancia: 'Aritmancia', sk_arqueologia: 'Arqueologia/Geologia', sk_curandeirismo: 'Curandeirismo',
  sk_trouxas: 'Estudo dos Trouxas', sk_herbologia: 'Herbologia', sk_historia: 'História da Magia',
  sk_leis: 'Leis do Ministério', sk_pocoes: 'Poções', sk_teoria: 'Teoria da Magia/Runas',
  sk_criaturas: 'Trato de Criaturas', sk_biblioteca: 'Usar Biblioteca', sk_arte: 'Arte/Criação',
  sk_charme: 'Charme', sk_disfarce: 'Disfarce / Polissuco', sk_esconder: 'Esconder',
  sk_escutar: 'Escutar', sk_intimidacao: 'Intimidação', sk_labia: 'Lábia',
  sk_linguas: 'Línguas Mágicas', sk_percepcao: 'Percepção / Revelare', sk_prestidigi: 'Prestidigitação',
  sk_psicologia: 'Psicologia', sk_rastreamento: 'Rastreamento Mágico', sk_sobrevivencia: 'Sobrevivência'
};

function abrirPopupPericia(id, skillKey) {
  _popupCurrentId = id;
  _popupCurrentSkill = skillKey;
  const c = document.getElementById('content-' + id);
  if (!c) return;

  const base = lerBasePericia(c, skillKey);
  const bonusEsc = lerBonusEscola(c, skillKey);
  const bonusEstilo = lerBonusEstilo(c, skillKey);
  const ip = parseInt(c.querySelector(`[data-field="${skillKey}_ip"]`)?.value) || 0;
  const oc = parseInt(c.querySelector(`[data-field="${skillKey}_oc"]`)?.value) || 0;
  const livre = parseInt(c.querySelector(`[data-field="${skillKey}_livre"]`)?.value) || 0;

  const title = document.getElementById('skill-popup-title');
  const baseInfo = document.getElementById('skill-popup-base-info');
  if (title) title.textContent = SKILL_NAMES[skillKey] || skillKey;

  let infoText = `Base: ${base}%`;
  if (bonusEsc) infoText += `  |  Escola: +${bonusEsc}%`;
  if (bonusEstilo) infoText += `  |  Estilo: +${bonusEstilo}%`;
  if (baseInfo) baseInfo.textContent = infoText;

  const ipInp = document.getElementById('skill-popup-ip');
  const ocInp = document.getElementById('skill-popup-oc');
  const livreInp = document.getElementById('skill-popup-livre');
  if (ipInp) ipInp.value = ip;
  if (ocInp) ocInp.value = oc;
  if (livreInp) livreInp.value = livre;

  _atualizarPopupTotal();

  const readonly = typeof _modoLeitura !== 'undefined' && _modoLeitura;
  [ipInp, ocInp, livreInp].forEach(inp => { if (inp) inp.disabled = readonly; });

  const modal = document.getElementById('modal-skill-popup');
  if (modal) modal.classList.add('open');
  setTimeout(() => { if (ipInp && !readonly) ipInp.focus(); }, 50);
}

function _atualizarPopupTotal() {
  const id = _popupCurrentId;
  const skillKey = _popupCurrentSkill;
  if (!id || !skillKey) return;
  const c = document.getElementById('content-' + id);
  if (!c) return;

  const base = lerBasePericia(c, skillKey);
  const bonusEsc = lerBonusEscola(c, skillKey);
  const bonusEstilo = lerBonusEstilo(c, skillKey);
  const ip = parseInt(document.getElementById('skill-popup-ip')?.value) || 0;
  const oc = parseInt(document.getElementById('skill-popup-oc')?.value) || 0;
  const livre = parseInt(document.getElementById('skill-popup-livre')?.value) || 0;

  const total = Math.min(99, Math.max(0, base + bonusEsc + bonusEstilo + ip + oc + livre));
  const dificil = Math.floor(total / 2);
  const extremo = Math.floor(total / 5);

  const row = document.getElementById('skill-popup-total-row');
  if (row) {
    row.innerHTML =
      `<span class="skill-popup-total-label">Total:</span>` +
      `<span class="skill-popup-total-val">${total}%</span>` +
      `<span class="skill-popup-thresh">` +
      `<span class="thr-line thr-regular">${total}</span>` +
      `<span class="thr-sep"> / </span>` +
      `<span class="thr-line thr-dificil">${dificil}</span>` +
      `<span class="thr-sep"> / </span>` +
      `<span class="thr-line thr-extremo">${extremo}</span>` +
      `</span>`;
  }
}

function onPopupSkillInput() {
  const id = _popupCurrentId;
  const skillKey = _popupCurrentSkill;
  if (!id || !skillKey) return;
  const c = document.getElementById('content-' + id);
  if (!c) return;

  const clamp99 = v => Math.min(99, Math.max(0, parseInt(v) || 0));
  const ipEl2 = document.getElementById('skill-popup-ip');
  const ocEl2 = document.getElementById('skill-popup-oc');
  const livreEl2 = document.getElementById('skill-popup-livre');
  if (ipEl2 && parseInt(ipEl2.value) > 99) ipEl2.value = 99;
  if (ocEl2 && parseInt(ocEl2.value) > 99) ocEl2.value = 99;
  if (livreEl2 && parseInt(livreEl2.value) > 99) livreEl2.value = 99;
  const ip = clamp99(ipEl2?.value);
  const oc = clamp99(ocEl2?.value);
  const livre = clamp99(livreEl2?.value);

  const ipInp = c.querySelector(`[data-field="${skillKey}_ip"]`);
  const ocInp = c.querySelector(`[data-field="${skillKey}_oc"]`);
  const livreInp = c.querySelector(`[data-field="${skillKey}_livre"]`);
  if (ipInp) ipInp.value = ip;
  if (ocInp) ocInp.value = oc;
  if (livreInp) livreInp.value = livre;

  _atualizarPopupTotal();
  atualizarPericia(c, skillKey);
  atualizarPontosDistrib(id);
  if (typeof coletarDados === 'function') {
    clearTimeout(onPopupSkillInput._t);
    onPopupSkillInput._t = setTimeout(() => coletarDados(id), 600);
  }
}

function fecharPopupPericia() {
  const modal = document.getElementById('modal-skill-popup');
  if (modal) modal.classList.remove('open');
  if (_popupCurrentId && typeof coletarDados === 'function') {
    coletarDados(_popupCurrentId);
    if (typeof mostrarToast === 'function') mostrarToast('✓ Ficha salva');
  }
  _popupCurrentId = null;
  _popupCurrentSkill = null;
}

/* ═══ MEDIDOR DE ESTILO ════════════════════════════════════════ */
const ESTILO_BENEFICIOS = {
  'D': { label: 'Rank D — Sem benefícios ativos.', cls: '' },
  'C': { label: 'Rank C — Sem benefícios ativos.', cls: '' },
  'B': { label: 'Rank B — +5% em Magia de Combate ativo.', cls: 'rank-b' },
  'A': { label: 'Rank A — +5% em Magia de Combate + +1 dado de Postura em feitiços de Efeito.', cls: 'rank-a' },
  'S': { label: 'Rank S — Recupera 1 PM a cada feitiço acertado.', cls: 'rank-s' },
  'SS': { label: 'Rank SS — Críticos causam dano máximo (todos os dados no valor mais alto).', cls: 'rank-ss' },
  'SSS': { label: 'Rank SSS — Pode rolar um dado novamente, 1× por turno.', cls: 'rank-sss' },
};

function _aplicarVisualEstiloRank(btn, id) {
  const panel = document.getElementById('estilo-panel-' + id);
  if (!panel) return;
  panel.querySelectorAll('.estilo-rank-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const rank = btn.dataset.rank;
  const hiddenEl = panel.querySelector('[data-field="estilo_rank"]');
  if (hiddenEl) hiddenEl.value = rank;

  const beneficioEl = document.getElementById('estilo-beneficio-' + id);
  if (beneficioEl) {
    const info = ESTILO_BENEFICIOS[rank] || {};
    beneficioEl.innerHTML = `<span class="estilo-beneficio-text ${info.cls || ''}">${info.label || ''}</span>`;
  }

  setTimeout(() => atualizarTodasPericias(id), 0);
}

function selecionarEstiloRank(btn, id) {
  _aplicarVisualEstiloRank(btn, id);
  if (typeof coletarDados === 'function') {
    coletarDados(id);
    if (typeof mostrarToast === 'function') mostrarToast('✓ Ficha salva');
  }
}

function restaurarEstiloRank(id, rank) {
  if (!rank) rank = 'D';
  const panel = document.getElementById('estilo-panel-' + id);
  if (!panel) return;
  const btn = panel.querySelector(`.estilo-rank-btn[data-rank="${rank}"]`);
  if (btn) _aplicarVisualEstiloRank(btn, id);
}

function aplicarHighlightEspecializacao(id) {
  const c = document.getElementById('content-' + id);
  if (!c) return;
  const spec = c.querySelector('[data-field="especializacao"]')?.value || '';
  const pericias = SPEC_SKILLS[spec] || [];

  c.querySelectorAll('.skill-item').forEach(item => {
    const field = item.querySelector('[data-total]')?.dataset.total;
    if (pericias.includes(field)) {
      item.classList.add('ocupacao');
    } else {
      item.classList.remove('ocupacao');
    }
  });
}
