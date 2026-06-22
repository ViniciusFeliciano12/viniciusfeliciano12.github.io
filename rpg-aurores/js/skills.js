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
  const distribEl = c.querySelector(`[data-field="${skillKey}"]`);
  const distrib = parseInt(distribEl?.value) || 0;

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
    `<span class="thr-sep">/</span>` +
    `<span class="thr-line thr-dificil">${dificil}</span>` +
    `<span class="thr-sep">/</span>` +
    `<span class="thr-line thr-extremo">${extremo}</span>`;
}

function atualizarTodasPericias(id) {
  const c = document.getElementById('content-' + id);
  if (!c) return;
  Object.keys(SKILL_BASE).forEach(sk => atualizarPericia(c, sk));
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
  const ipEl = document.getElementById('pts-ip-' + id);
  const ocEl = document.getElementById('pts-oc-' + id);
  if (ipEl) ipEl.textContent = int * 2;
  if (ocEl) ocEl.textContent = edu * 4;
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

function selecionarEstiloRank(btn, id) {
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
  if (typeof debounce === 'function' && typeof coletarDados === 'function') {
    debounce(() => coletarDados(id), 300)();
  }
}

function restaurarEstiloRank(id, rank) {
  if (!rank) rank = 'D';
  const panel = document.getElementById('estilo-panel-' + id);
  if (!panel) return;
  const btn = panel.querySelector(`.estilo-rank-btn[data-rank="${rank}"]`);
  if (btn) selecionarEstiloRank(btn, id);
}

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
