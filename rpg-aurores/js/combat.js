/* ═══════════════════════════════════════════════════════════════
   PAINEL DE COMBATE — lógica global
═══════════════════════════════════════════════════════════════ */

const combatState = {};

function getCombatState(id) {
  if (!combatState[id]) {
    combatState[id] = {
      attackType: 'normal',
      effectType: 'bloqueado',
      armQty: 2,
      combatMode: 'feitico'
    };
  }
  return combatState[id];
}

function selectCombatMode(btn, id) {
  const panel = document.getElementById('content-' + id);
  if (!panel) return;
  panel.querySelectorAll('[data-cmode]').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const mode = btn.dataset.cmode;
  getCombatState(id).combatMode = mode;
  const skillEl = panel.querySelector('.combat-mode-skill-hint');
  if (skillEl) {
    skillEl.textContent = mode === 'corporal'
      ? 'Rola com Luta Corporal'
      : 'Rola com Magia de Combate';
  }
  const noteEl = document.getElementById(`corporal-note-${id}`);
  if (noteEl) noteEl.classList.toggle('visible', mode === 'corporal');
}

function switchCombatTab(btn, tab, id) {
  const panel = document.getElementById('content-' + id);
  if (!panel) return;
  panel.querySelectorAll('.combat-tab-btn').forEach(b => b.classList.remove('active'));
  panel.querySelectorAll('.combat-tab-pane').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  const pane = document.getElementById(`ctab-${tab}-${id}`);
  if (pane) pane.classList.add('active');
}

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

function buildDamageFormula(id, tab) {
  const state = getCombatState(id);
  const panel = document.getElementById('content-' + id);

  if (tab === 'ataque') {
    let parts = [];
    const t = state.attackType;
    parts.push('1d6');
    if (t === 'vulneravel' || t === 'assinatura_vuln') {
      parts.push('1d6');
    }
    if (t === 'assinatura' || t === 'assinatura_vuln') {
      parts.push('1d4');
    }
    const rankA = panel?.querySelector('[data-dmg-mod="rank_a"]')?.checked;
    if (rankA) { parts.push('1d(extra Postura)'); }
    return { formula: parts.join(' + '), desc: 'Dano em HP' + (rankA ? ' + Postura extra' : '') };
  } else {
    let parts = [];
    const t = state.effectType;
    if (t === 'bloqueado') {
      parts.push('1d6');
    } else if (t === 'acertou') {
      parts.push('2d6');
    } else if (t === 'assinatura_ef') {
      parts.push('1d6'); parts.push('1d4');
    } else if (t === 'assinatura_ef_acertou') {
      parts.push('2d6'); parts.push('1d4');
    } else if (t === 'ambiental') {
      parts.push('1d4');
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

function armQtyChange(id, delta, isEffect) {
  const state = getCombatState(id);
  state.armQty = Math.max(2, Math.min(10, (state.armQty || 2) + delta));
  const suffixes = isEffect ? [`arm-qty-val-ef-${id}`] : [`arm-qty-val-${id}`, `arm-qty-val-ef-${id}`];
  suffixes.forEach(s => {
    const el = document.getElementById(s);
    if (el) el.textContent = state.armQty;
  });
}

function rollDie(sides) { return Math.floor(Math.random() * sides) + 1; }

function rollAttack(id, tab, mode) {
  const panel = document.getElementById('content-' + id);
  const state = getCombatState(id);
  const resultEl = document.getElementById(tab === 'ataque' ? `atk-result-${id}` : `eff-result-${id}`);
  if (!resultEl) return;

  resultEl.className = 'attack-result-area';
  resultEl.innerHTML = '<span style="color:#888;font-style:italic;animation:rolling-pulse .9s infinite">🎲 Rolando...</span>';

  setTimeout(() => {
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

    const isCorporal = state.combatMode === 'corporal';
    const skillKey = isCorporal ? 'sk_luta' : 'sk_magia_combate';
    const skillLabel = isCorporal ? 'Luta Corporal' : 'Magia de Combate';
    const skillEl = panel?.querySelector(`[data-total="${skillKey}"]`);
    const skillTotal = parseInt(skillEl?.textContent) || 0;
    const extremo = Math.floor(skillTotal / 5);
    const dificil = Math.floor(skillTotal / 2);

    function classify(r) {
      if (r === 1) return { label: 'Crítico!', cls: 'res-critico' };
      if (r <= extremo) return { label: 'Extremo', cls: 'res-extremo' };
      if (r <= dificil) return { label: 'Difícil', cls: 'res-dificil' };
      if (r <= skillTotal) return { label: 'Regular', cls: 'res-regular' };
      if (r === 100) return { label: 'Falha Crítica!', cls: 'res-falha-crit' };
      return { label: 'Falha', cls: 'res-falha' };
    }

    let dmgParts = [];
    let dmgTotal = 0;
    let dmgDesc = '';

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

    resultEl.className = 'attack-result-area has-result';

    let d100Html = '';
    if (mode === 'multi') {
      d100Html = `<div class="attack-res-rolls-row" style="flex-direction:column;align-items:flex-start;gap:3px">`;
      d100s.forEach((r, i) => {
        const cl = classify(r);
        d100Html += `<div style="display:flex;align-items:center;gap:6px">
          <span style="font-size:9px;color:#666;min-width:18px;text-align:right">#${i + 1}</span>
          <span class="attack-res-die" style="font-size:14px">${r}</span>
          <span class="attack-res-outcome ${cl.cls}" style="font-size:11px">${cl.label}</span>
          <span class="attack-res-vs">${skillLabel}: ${skillTotal}|${dificil}|${extremo}</span>
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
            <div class="attack-res-vs">${skillLabel}: ${skillTotal}% | ½=${dificil} | ⅕=${extremo}</div>
          </div>
          ${d100Label ? `<span class="attack-res-mode-tag">${d100Label}</span>` : ''}
        </div>
      `;
    }

    const dieLabel = p => p.die.startsWith('+') ? '1' + p.die.slice(1) : '1' + p.die;
    const dmgDiceHtml = dmgParts.map((p, i) => `<span class="dmg-die ${p.tag || ''}" title="${dieLabel(p)}">${p.val}</span>${i < dmgParts.length - 1 ? '<span class="dmg-plus">+</span>' : ''}`).join('');
    const dmgHtml = `
      <hr class="attack-res-divider">
      <div class="attack-res-damage-label">${dmgDesc}</div>
      <div class="attack-res-damage-line">
        <span class="attack-res-damage-total">${dmgTotal}</span>
        <span class="attack-res-damage-breakdown">${dmgParts.map(p => p.die.startsWith('+') ? ' + 1' + p.die.slice(1) : '1' + p.die).join('')}</span>
      </div>
      <div class="attack-res-damage-dice">${dmgDiceHtml}</div>
    `;

    resultEl.innerHTML = d100Html + dmgHtml +
      `<button class="result-clear-btn" title="Limpar resultado" onclick="clearResult(this)">✕</button>`;
  }, 400);
}

function clearResult(btn) {
  const area = btn.closest('.attack-result-area, .custom-dice-result');
  if (!area) return;
  const isCustom = area.classList.contains('custom-dice-result');
  area.className = isCustom ? 'custom-dice-result' : 'attack-result-area';
  area.innerHTML = `<span>${isCustom
    ? 'Digite uma expressão como <strong>2d6</strong> ou <strong>1d6+1d4</strong> e pressione Rolar.'
    : 'Selecione o tipo e clique em rolar.'}</span>`;
}

function setCustomExpr(id, expr) {
  const inp = document.getElementById(`custom-dice-expr-${id}`);
  if (inp) { inp.value = expr; inp.focus(); }
}

function parseAndRollDice(expr) {
  expr = expr.trim().toLowerCase().replace(/\s+/g, '');
  if (!expr) return null;

  const tokens = expr.split(/(?=[+\-])/).filter(Boolean);
  let total = 0;
  const groups = [];

  for (let tok of tokens) {
    tok = tok.replace(/^[+]/, '');
    const isNeg = tok.startsWith('-');
    if (isNeg) tok = tok.slice(1);

    if (tok.includes('d')) {
      const [nStr, xStr] = tok.split('d');
      const n = parseInt(nStr) || 1;
      const x = parseInt(xStr) || 6;
      if (n < 1 || n > 100 || x < 2 || x > 1000) return null;
      const rolls = Array.from({ length: n }, () => Math.floor(Math.random() * x) + 1);
      const sum = rolls.reduce((a, b) => a + b, 0);
      groups.push({ label: `${n}d${x}`, rolls, sum, neg: isNeg });
      total += isNeg ? -sum : sum;
    } else {
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
