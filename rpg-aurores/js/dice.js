/* ═══════════════════════════════════════════════════════════════
   SISTEMA DE ROLAGEM DE DADOS (d100)
═══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  let advQty = 1;

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
    if (roll === 100) return { label: 'Falha Crítica!', cls: 'res-falha-crit', success: false };
    return { label: 'Falha', cls: 'res-falha', success: false };
  }

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

  function showResult(skillName, skillTotal, rolls, mode, valueLabel, skillKey, fichaId) {
    const el = getOrCreatePopup();
    clearTimers();
    el.classList.remove('fade-out');
    el.style.display = 'block';

    const lbl = valueLabel || 'Perícia';

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

    if (res.success && skillKey && fichaId) {
      _marcarEvolucaoAposSucesso(skillKey, fichaId);
    }

    let modeLabel = '';
    if (mode === 'advantage') modeLabel = `<span class="dice-mode-tag">⬆ Vantagem ×${rolls.length}</span>`;
    if (mode === 'disadvantage') modeLabel = `<span class="dice-mode-tag">⬇ Desvantagem ×${rolls.length}</span>`;

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
    const againstText = `${lbl}: ${skillTotal}% | ½=${dificil} | ⅕=${extremo}`;

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

  function executeRoll(skillName, skillTotal, mode, valueLabel, skillKey, fichaId) {
    showRolling(skillName);

    let numDice;
    if (mode === 'normal') {
      numDice = 1;
    } else {
      numDice = 1 + advQty;
    }

    setTimeout(() => {
      const rolls = Array.from({ length: numDice }, rollD100);
      showResult(skillName, skillTotal, rolls, mode, valueLabel, skillKey, fichaId);
    }, 450);
  }

  function getSkillInfo(totalEl) {
    const text = totalEl.textContent.trim().replace('%', '');
    const total = parseInt(text) || 0;
    const item = totalEl.closest('.skill-item');
    const labelText = item?.querySelector('.skill-label-text')?.textContent?.trim() || 'Perícia';
    const name = labelText.replace(/\(.*?\)/g, '').trim();
    const skillKey = totalEl.dataset.total || null;
    const fichaId = totalEl.closest('[id^="content-"]')?.id?.replace('content-', '') || null;
    return { name, total, label: 'Perícia', skillKey, fichaId };
  }

  function getSorteInfo(sorteBox) {
    const val = sorteBox.querySelector('[data-field="sorte_atual"]')?.value;
    const total = parseInt(val) || 0;
    return { name: 'Sorte', total, label: 'Sorte' };
  }

  function getAttrInfo(attrBox) {
    const name = attrBox.dataset.attrLabel || attrBox.querySelector('span')?.textContent?.trim() || 'Atributo';
    const input = attrBox.querySelector('input');
    const total = parseInt(input?.value) || 0;
    return { name, total, label: 'Atributo' };
  }

  let ctxMenuEl = null;
  let longPressTimer = null;
  let longPressFired = false;

  function removeCtxMenu() {
    if (ctxMenuEl) { ctxMenuEl.remove(); ctxMenuEl = null; }
  }

  function showCtxMenu(x, y, skillName, skillTotal, valueLabel, skillKey, fichaId) {
    removeCtxMenu();
    ctxMenuEl = document.createElement('div');
    ctxMenuEl.className = 'dice-ctx-menu';

    const evolveChecked = skillKey && fichaId
      ? (document.getElementById('content-' + fichaId)?.querySelector(`[data-field="${skillKey}_evolve"]`)?.value === '1')
      : false;

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
      ${skillKey && fichaId ? `
      <hr class="dice-ctx-sep">
      <div class="dice-ctx-item dice-ctx-evolve ${evolveChecked ? 'evolve-ativo' : ''}" id="ctx-evolve-toggle">
        <span class="ctx-icon">${evolveChecked ? '🟢' : '⬜'}</span>
        <span>Pode evoluir ao fim da missão</span>
      </div>` : ''}
    `;
    document.body.appendChild(ctxMenuEl);

    const menuW = 230, menuH = 200;
    const vw = window.innerWidth, vh = window.innerHeight;
    let left = x, top = y;
    if (left + menuW > vw - 8) left = vw - menuW - 8;
    if (top + menuH > vh - 8) top = vh - menuH - 8;
    if (left < 8) left = 8;
    if (top < 8) top = 8;
    ctxMenuEl.style.left = left + 'px';
    ctxMenuEl.style.top = top + 'px';

    ctxMenuEl.querySelector('#adv-qty-minus').addEventListener('click', e => {
      e.stopPropagation();
      if (advQty > 1) { advQty--; ctxMenuEl.querySelector('#adv-qty-display').textContent = advQty; }
    });
    ctxMenuEl.querySelector('#adv-qty-plus').addEventListener('click', e => {
      e.stopPropagation();
      if (advQty < 9) { advQty++; ctxMenuEl.querySelector('#adv-qty-display').textContent = advQty; }
    });

    ctxMenuEl.querySelectorAll('[data-mode]').forEach(item => {
      item.addEventListener('click', e => {
        e.stopPropagation();
        const mode = item.dataset.mode;
        removeCtxMenu();
        executeRoll(skillName, skillTotal, mode, valueLabel, skillKey, fichaId);
      });
    });

    const evolveToggleEl = ctxMenuEl.querySelector('#ctx-evolve-toggle');
    if (evolveToggleEl && skillKey && fichaId) {
      evolveToggleEl.addEventListener('click', e => {
        e.stopPropagation();
        if (typeof _toggleEvolucao === 'function') {
          const c = document.getElementById('content-' + fichaId);
          const skillItem = c?.querySelector(`[data-total="${skillKey}"]`)?.closest('.skill-item');
          if (skillItem) {
            _toggleEvolucao(skillItem, skillKey, fichaId);
            const ativo = skillItem.classList.contains('evolve-ativo');
            evolveToggleEl.querySelector('.ctx-icon').textContent = ativo ? '🟢' : '⬜';
            evolveToggleEl.classList.toggle('evolve-ativo', ativo);
          }
        }
      });
    }

    setTimeout(() => {
      document.addEventListener('click', removeCtxMenu, { once: true });
    }, 10);
  }

  function bindDiceEvents(el, getInfo) {
    el.addEventListener('click', e => {
      if (e.target.tagName === 'INPUT') return;
      e.preventDefault();
      e.stopPropagation();
      if (longPressFired) { longPressFired = false; return; }
      const { name, total, label, skillKey, fichaId } = getInfo(el);
      if (!total) return;
      executeRoll(name, total, 'normal', label, skillKey, fichaId);
    });

    el.addEventListener('contextmenu', e => {
      if (e.target.tagName === 'INPUT') return;
      e.preventDefault();
      const { name, total, label, skillKey, fichaId } = getInfo(el);
      if (!total) return;
      showCtxMenu(e.clientX, e.clientY, name, total, label, skillKey, fichaId);
    });

    el.addEventListener('touchstart', e => {
      if (e.target.tagName === 'INPUT') return;
      longPressFired = false;
      const touch = e.touches[0];
      const { name, total, label, skillKey, fichaId } = getInfo(el);
      if (!total) return;
      longPressTimer = setTimeout(() => {
        longPressFired = true;
        if (navigator.vibrate) navigator.vibrate(40);
        showCtxMenu(touch.clientX, touch.clientY, name, total, label, skillKey, fichaId);
      }, 550);
    }, { passive: true });

    el.addEventListener('touchend', () => {
      clearTimeout(longPressTimer);
    }, { passive: true });

    el.addEventListener('touchmove', () => {
      clearTimeout(longPressTimer);
    }, { passive: true });
  }

  function bindAllDiceTargets(root) {
    root.querySelectorAll('.skill-total[data-total]').forEach(el => {
      if (el.dataset.diceBound) return;
      el.dataset.diceBound = '1';
      bindDiceEvents(el, getSkillInfo);
    });

    root.querySelectorAll('.der-box.sorte').forEach(el => {
      if (el.dataset.diceBound) return;
      el.dataset.diceBound = '1';
      bindDiceEvents(el, getSorteInfo);
    });

    root.querySelectorAll('.attr-box[data-attr-label]').forEach(el => {
      if (el.dataset.diceBound) return;
      el.dataset.diceBound = '1';
      bindDiceEvents(el, getAttrInfo);
    });
  }

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

  document.addEventListener('DOMContentLoaded', () => {
    bindAllDiceTargets(document.body);
  });
  bindAllDiceTargets(document.body);

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { removeCtxMenu(); closePopup(); }
  });

})();
