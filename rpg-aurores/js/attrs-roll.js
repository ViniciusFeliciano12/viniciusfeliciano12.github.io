/* ═══════════════════════════════════════════════════════════════
   ROLAGEM E DISTRIBUIÇÃO DE ATRIBUTOS BASE (3d6 × 5)
   — valores e seleções persistidos no Firebase via ficha.dados
═══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  const ATTRS = [
    { key: 'for', name: 'FOR — Força' },
    { key: 'des', name: 'DES — Destreza' },
    { key: 'int_attr', name: 'INT — Inteligência' },
    { key: 'con', name: 'CON — Constituição' },
    { key: 'apa', name: 'APA — Aparência' },
    { key: 'pod', name: 'POD — Poder' },
    { key: 'tam', name: 'TAM — Tamanho' },
    { key: 'edu', name: 'EDU — Educação' },
  ];

  const RANKS_BELOW_20_THRESHOLD = 3;

  let currentCharId = null;
  let currentValues = [];
  let assignments = {};
  let forcedRerollUsed = false;

  // ─── Persistência ─────────────────────────────────────────────

  function saveRollData() {
    if (!currentCharId) return;
    const f = typeof getFicha === 'function' ? getFicha(currentCharId) : null;
    if (!f) return;
    if (!f.dados) f.dados = {};
    f.dados['_attrs_roll'] = {
      values: currentValues,
      assignments: assignments,
      forcedRerollUsed: forcedRerollUsed
    };
    if (typeof salvarFichas === 'function') salvarFichas(currentCharId);
  }

  function loadRollData() {
    if (!currentCharId) return false;
    const f = typeof getFicha === 'function' ? getFicha(currentCharId) : null;
    const saved = f?.dados?.['_attrs_roll'];
    if (saved?.values?.length === 8) {
      currentValues = saved.values;
      assignments = saved.assignments || {};
      forcedRerollUsed = saved.forcedRerollUsed || false;
      return true;
    }
    return false;
  }

  // ─── Regra dos 3 abaixo de 20 ─────────────────────────────────

  function countBelow20() {
    return currentValues.filter(v => v < 20).length;
  }

  function isForcedRerollEligible() {
    return !forcedRerollUsed && countBelow20() >= RANKS_BELOW_20_THRESHOLD;
  }

  function updateForcedRerollUI() {
    const noticeEl = document.getElementById('attrs-forced-notice');
    const rerollBtn = document.getElementById('attrs-roll-reroll');
    if (!noticeEl || !rerollBtn) return;

    if (forcedRerollUsed) {
      noticeEl.style.display = '';
      noticeEl.className = 'attrs-forced-notice attrs-forced-used';
      noticeEl.innerHTML = '⚠ Rolagem forçada já utilizada. Os valores atuais são obrigatórios.';
      rerollBtn.disabled = true;
      rerollBtn.style.opacity = '0.4';
      rerollBtn.title = 'Rolagem forçada já utilizada';
    } else if (isForcedRerollEligible()) {
      noticeEl.style.display = '';
      noticeEl.className = 'attrs-forced-notice attrs-forced-eligible';
      noticeEl.innerHTML = `⚠ <strong>${countBelow20()} atributos saíram abaixo de 20.</strong> Você pode rolar <strong>uma vez mais</strong> — os novos valores serão obrigatórios e o botão será desativado.`;
      rerollBtn.disabled = false;
      rerollBtn.style.opacity = '1';
      rerollBtn.title = 'Rolagem forçada — será a última';
    } else {
      noticeEl.style.display = 'none';
      rerollBtn.disabled = false;
      rerollBtn.style.opacity = '1';
      rerollBtn.title = '';
    }
  }

  // ─── Render ───────────────────────────────────────────────────

  function getOverlay() {
    return document.getElementById('attrs-roll-overlay');
  }

  function closeModal() {
    const overlay = getOverlay();
    if (overlay) overlay.style.display = 'none';
  }

  function updateConfirmBtn() {
    const btn = document.getElementById('attrs-roll-confirm');
    if (!btn) return;
    const allDone = Object.keys(assignments).length >= 8;
    btn.disabled = !allDone;
    btn.style.opacity = allDone ? '1' : '0.45';
  }

  function renderRows() {
    const list = document.getElementById('attrs-roll-list');
    if (!list) return;

    const usedAttrs = new Set(Object.values(assignments));

    list.innerHTML = '';
    currentValues.forEach((val, i) => {
      const selectedKey = assignments[i] || '';
      const isLow = val < 20;

      const opts = ATTRS.map(a => {
        const isUsedElsewhere = usedAttrs.has(a.key) && a.key !== selectedKey;
        const disabled = isUsedElsewhere ? 'disabled' : '';
        const sel = a.key === selectedKey ? 'selected' : '';
        return `<option value="${a.key}" ${disabled} ${sel}>${a.name}</option>`;
      }).join('');

      const row = document.createElement('div');
      row.className = 'attrs-roll-row' + (isLow ? ' attrs-roll-row-low' : '');
      row.innerHTML = `
        <span class="attrs-roll-value${isLow ? ' val-low' : ''}">${val}${isLow ? ' ⚠' : ''}</span>
        <span class="attrs-roll-arrow">→</span>
        <select class="attrs-roll-select" data-idx="${i}">
          <option value="">— Escolha o Atributo —</option>
          ${opts}
        </select>
      `;

      row.querySelector('select').addEventListener('change', e => {
        const idx = parseInt(e.target.dataset.idx);
        const newKey = e.target.value;

        if (newKey) {
          Object.keys(assignments).forEach(k => {
            if (assignments[k] === newKey && parseInt(k) !== idx) delete assignments[k];
          });
          assignments[idx] = newKey;
        } else {
          delete assignments[idx];
        }

        saveRollData();
        renderRows();
        updateConfirmBtn();
      });

      list.appendChild(row);
    });

    updateConfirmBtn();
    updateForcedRerollUI();
  }

  // ─── Rolagem ──────────────────────────────────────────────────

  function roll3d6x5() {
    let sum = 0;
    for (let i = 0; i < 3; i++) sum += Math.floor(Math.random() * 6) + 1;
    return sum * 5;
  }

  function performRoll() {
    if (isForcedRerollEligible()) {
      forcedRerollUsed = true;
    }

    currentValues = Array.from({ length: 8 }, roll3d6x5);
    assignments = {};
    saveRollData();
    renderRows();
  }

  // ─── Confirmar distribuição ────────────────────────────────────

  function confirmAssignment() {
    if (!currentCharId) return;
    const c = document.getElementById('content-' + currentCharId);
    if (!c) return;

    Object.entries(assignments).forEach(([idxStr, attrKey]) => {
      const val = currentValues[parseInt(idxStr)];
      const input = c.querySelector(`[data-field="${attrKey}"]`);
      if (input) {
        input.value = val;
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });

    closeModal();
  }

  // ─── API pública ──────────────────────────────────────────────

  window.abrirRolarAtributos = function (id) {
    currentCharId = id;
    const overlay = getOverlay();
    if (!overlay) return;

    const loaded = loadRollData();
    if (!loaded) {
      currentValues = Array.from({ length: 8 }, roll3d6x5);
      assignments = {};
      forcedRerollUsed = false;
      saveRollData();
    }

    renderRows();
    overlay.style.display = 'flex';
  };

  document.addEventListener('DOMContentLoaded', () => {
    const overlay = getOverlay();
    if (!overlay) return;

    overlay.addEventListener('click', e => {
      if (e.target === overlay) closeModal();
    });

    document.getElementById('attrs-roll-close')?.addEventListener('click', closeModal);
    document.getElementById('attrs-roll-reroll')?.addEventListener('click', performRoll);
    document.getElementById('attrs-roll-confirm')?.addEventListener('click', confirmAssignment);
  });

})();
