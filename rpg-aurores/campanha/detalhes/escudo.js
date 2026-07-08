/* ═══════════════════════════════════════════════════════════════
   ESCUDO DO MESTRE — painel de combate (aba exclusiva do GM)
   Depende de: db.js (dbListenCampanhaFichas, dbSaveCampos, dbLoadFichas)
   e detalhes.js (_campanhaId, DB_USER, mostrarToast, abrirConfirm, _esc).

   Estado de combate (iniciativa/turno/rodada) e NPCs/monstros transitórios
   NÃO usam Firestore: ficam inteiramente em localStorage, namespaced por
   campanha (chave inclui _campanhaId) — trocar de campanha nunca mistura
   o combate de uma com o de outra, e nada disso vaza para os jogadores.
═══════════════════════════════════════════════════════════════ */

let _escudoBooted = false;
let _escudoFichas = {};       // fichaId -> ficha (PCs vinculados à campanha)
let _escudoNpcs = {};         // npcId -> npc transitório (localStorage)
let _escudoEstado = { rodada: 1, turnoAtual: null, iniciativas: {} }; // localStorage
let _escudoNotas = {};              // entityId -> texto da anotação (localStorage)
let _escudoNotasAbertas = new Set(); // ids com a caixa de anotação expandida (só na sessão, não persiste)
let _escudoFichasMoldes = []; // cache das fichas do GM ao abrir o modal de NPC

const ESCUDO_RANKS = ['D', 'C', 'B', 'A', 'S', 'SS', 'SSS'];

// Mesmo agrupamento em 3 colunas usado na ficha (ver ficha/index.html,
// seção "Perícias do Auror").
const ESCUDO_SKILL_GROUPS = [
  {
    titulo: 'Combate e Físico',
    skills: ['sk_arremessar', 'sk_atletismo', 'sk_conjuracao', 'sk_defesa', 'sk_encantamento',
      'sk_esquiva', 'sk_furtividade', 'sk_luta', 'sk_trevas', 'sk_magia_combate', 'sk_natacao',
      'sk_transfiguracao', 'sk_voo'],
  },
  {
    titulo: 'Conhecimento e Magia',
    skills: ['sk_alquimia', 'sk_antiguidades', 'sk_aritmancia', 'sk_arqueologia', 'sk_curandeirismo',
      'sk_trouxas', 'sk_herbologia', 'sk_historia', 'sk_leis', 'sk_pocoes', 'sk_teoria',
      'sk_criaturas', 'sk_biblioteca'],
  },
  {
    titulo: 'Sociais e Práticas',
    skills: ['sk_arte', 'sk_charme', 'sk_disfarce', 'sk_esconder', 'sk_escutar', 'sk_intimidacao',
      'sk_labia', 'sk_linguas', 'sk_percepcao', 'sk_prestidigi', 'sk_psicologia',
      'sk_rastreamento', 'sk_sobrevivencia'],
  },
];

// ─── NPCs — persistência local por campanha ─────────────────────

function _escudoNpcsKey() {
  return `hp_escudo_npcs_${_campanhaId}`;
}

function _escudoCarregarNpcsLocal() {
  _escudoNpcs = {};
  try {
    const raw = localStorage.getItem(_escudoNpcsKey());
    const arr = raw ? JSON.parse(raw) : [];
    arr.forEach(n => { if (n && n.id) _escudoNpcs[n.id] = n; });
  } catch { _escudoNpcs = {}; }
}

function _escudoSalvarNpcsLocal() {
  try {
    localStorage.setItem(_escudoNpcsKey(), JSON.stringify(Object.values(_escudoNpcs)));
  } catch { /* localStorage indisponível (modo privado etc.) — ignora */ }
}

function _escudoGerarNpcId() {
  return 'npc_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

// ─── Estado de combate (iniciativa/turno/rodada) — persistência local ──

function _escudoEstadoKey() {
  return `hp_escudo_estado_${_campanhaId}`;
}

function _escudoCarregarEstadoLocal() {
  try {
    const raw = localStorage.getItem(_escudoEstadoKey());
    const parsed = raw ? JSON.parse(raw) : null;
    _escudoEstado = {
      rodada: parsed?.rodada || 1,
      turnoAtual: parsed?.turnoAtual || null,
      iniciativas: parsed?.iniciativas || {},
    };
  } catch {
    _escudoEstado = { rodada: 1, turnoAtual: null, iniciativas: {} };
  }
}

function _escudoSalvarEstadoLocal() {
  try {
    localStorage.setItem(_escudoEstadoKey(), JSON.stringify(_escudoEstado));
  } catch { /* localStorage indisponível (modo privado etc.) — ignora */ }
}

// ─── Anotações do Mestre — persistência local por campanha ─────

function _escudoNotasKey() {
  return `hp_escudo_notas_${_campanhaId}`;
}

function _escudoCarregarNotasLocal() {
  try {
    const raw = localStorage.getItem(_escudoNotasKey());
    _escudoNotas = raw ? JSON.parse(raw) : {};
  } catch {
    _escudoNotas = {};
  }
}

function _escudoSalvarNotasLocal() {
  try {
    localStorage.setItem(_escudoNotasKey(), JSON.stringify(_escudoNotas));
  } catch { /* localStorage indisponível (modo privado etc.) — ignora */ }
}

// Chamado a cada tecla digitada — só persiste, NÃO re-renderiza. Re-renderizar
// recriaria o <textarea> do zero e o Mestre perderia o foco/cursor no meio da
// digitação (ver também o guard em _renderEscudo()).
function _escudoNotaInput(id, valor) {
  _escudoNotas[id] = valor;
  _escudoSalvarNotasLocal();
}

// Chamado ao sair do campo (blur) — aqui já é seguro re-renderizar, por
// exemplo para atualizar o indicador de "tem anotação" no botão de alternar.
function _escudoNotaBlur() {
  _renderEscudo();
}

function _escudoToggleNota(id) {
  if (_escudoNotasAbertas.has(id)) _escudoNotasAbertas.delete(id);
  else _escudoNotasAbertas.add(id);
  _renderEscudo();
}

// ─── Boot / listeners ───────────────────────────────────────────

function carregarEscudoMestre() {
  if (!_escudoBooted) {
    _escudoBooted = true;
    _escudoCarregarNpcsLocal();
    _escudoCarregarEstadoLocal();
    _escudoCarregarNotasLocal();
    dbListenCampanhaFichas(_campanhaId, (fichaId, ficha) => {
      if (ficha) _escudoFichas[fichaId] = ficha;
      else delete _escudoFichas[fichaId];
      _renderEscudo();
    });
  }
  _renderEscudo();
}

// ─── Combinação de entidades (PCs + NPCs) ──────────────────────

function _escudoGetEntities() {
  const pcs = Object.values(_escudoFichas).map(f => ({
    id: f.id,
    tipo: 'pc',
    nome: f.nome || '(sem nome)',
    foto: (f.dados && f.dados._foto) || null,
    hp_atual: f.dados?.hp_atual, hp_max: f.dados?.hp_max,
    postura_atual: f.dados?.postura_atual, postura_max: f.dados?.postura_max,
    pm_atual: f.dados?.pm_atual, pm_max: f.dados?.pm_max,
    sorte_atual: f.dados?.sorte_atual,
    estilo_rank: f.dados?.estilo_rank || 'D',
  }));
  const npcs = Object.values(_escudoNpcs).map(n => ({
    id: n.id,
    tipo: 'npc',
    nome: n.nome || 'NPC',
    foto: n.foto || null,
    hp_atual: n.hp_atual, hp_max: n.hp_max,
    postura_atual: n.postura_atual, postura_max: n.postura_max,
    pm_atual: n.pm_atual, pm_max: n.pm_max,
    sorte_atual: n.sorte_atual,
    estilo_rank: n.estilo_rank || 'D',
  }));
  return [...pcs, ...npcs].map(e => ({
    ...e,
    iniciativa: _escudoEstado.iniciativas[e.id],
  }));
}

function _escudoTemIniciativa(e) {
  return e.iniciativa !== undefined && e.iniciativa !== null && e.iniciativa !== '';
}

// Lista ordenada (desc) apenas dos combatentes "em combate" — usada pelo
// gerenciador de turnos.
function _escudoOrdemAtual() {
  return _escudoGetEntities()
    .filter(_escudoTemIniciativa)
    .sort((a, b) => (b.iniciativa - a.iniciativa) || a.nome.localeCompare(b.nome));
}

// ─── Render ─────────────────────────────────────────────────────

function _renderEscudo() {
  const content = document.getElementById('escudo-content');
  if (!content) return;
  // Evita recriar o DOM (e derrubar o foco) enquanto o Mestre está digitando
  // uma anotação — qualquer outro evento (ex: um jogador mudando o HP) pode
  // disparar um render nesse meio-tempo.
  if (document.activeElement?.classList?.contains('escudo-nota-textarea')) return;

  const entities = _escudoGetEntities();
  const emCombate = entities.filter(_escudoTemIniciativa)
    .sort((a, b) => (b.iniciativa - a.iniciativa) || a.nome.localeCompare(b.nome));
  const foraDeCombate = entities.filter(e => !_escudoTemIniciativa(e))
    .sort((a, b) => a.nome.localeCompare(b.nome));

  const rodadaEl = document.getElementById('escudo-rodada-valor');
  if (rodadaEl) rodadaEl.textContent = _escudoEstado.rodada;

  const turnoEntity = entities.find(e => e.id === _escudoEstado.turnoAtual);
  const turnoEl = document.getElementById('escudo-turno-atual');
  if (turnoEl) turnoEl.textContent = turnoEntity ? turnoEntity.nome : '—';

  if (!entities.length) {
    content.innerHTML = `
      <div class="camp-empty" style="padding:32px 0">
        <div class="camp-empty-icon">🛡️</div>
        <p>Nenhum personagem vinculado a esta campanha ainda.</p>
      </div>`;
    return;
  }

  content.innerHTML = `
    <div class="escudo-section">
      <h4 class="escudo-section-title">⚔️ Em Combate <span class="escudo-section-count">${emCombate.length}</span></h4>
      <div class="escudo-lista">
        ${emCombate.length ? emCombate.map((e, i) => _renderCombatRow(e, i + 1)).join('') : '<p class="escudo-empty-msg">Nenhum combatente com iniciativa definida.</p>'}
      </div>
    </div>
    <div class="escudo-section escudo-section--fora">
      <h4 class="escudo-section-title">💤 Fora de Combate <span class="escudo-section-count">${foraDeCombate.length}</span></h4>
      <div class="escudo-chips">
        ${foraDeCombate.length ? foraDeCombate.map(_renderForaChip).join('') : '<p class="escudo-empty-msg">Todos os combatentes estão em combate.</p>'}
      </div>
    </div>`;
}

function _escudoPct(atual, max) {
  const a = parseInt(atual) || 0;
  const m = parseInt(max) || 0;
  if (m <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((a / m) * 100)));
}

function _renderBarra(e, campo, label, tipoClasse) {
  const atual = parseInt(e[campo + '_atual']) || 0;
  const max = parseInt(e[campo + '_max']) || 0;
  const pct = _escudoPct(atual, max);
  return `
    <div class="escudo-res escudo-res--${tipoClasse}">
      <div class="escudo-res-head"><span>${label}</span><span class="escudo-res-nums">${atual}/${max}</span></div>
      <div class="escudo-barra"><div class="escudo-barra-fill" style="width:${pct}%"></div></div>
      <div class="escudo-res-ctrl">
        <button type="button" onclick="_escudoAjustarRecurso('${e.tipo}','${_esc(e.id)}','${campo}_atual',-1)">−</button>
        <input type="number" value="${atual}" onchange="_escudoSetRecurso('${e.tipo}','${_esc(e.id)}','${campo}_atual', this.value)">
        <button type="button" onclick="_escudoAjustarRecurso('${e.tipo}','${_esc(e.id)}','${campo}_atual',1)">+</button>
      </div>
    </div>`;
}

function _renderSorte(e) {
  const atual = parseInt(e.sorte_atual) || 0;
  const pct = _escudoPct(atual, 99);
  return `
    <div class="escudo-res escudo-res--sorte">
      <div class="escudo-res-head"><span>Sorte</span><span class="escudo-res-nums">${atual}/99</span></div>
      <div class="escudo-barra"><div class="escudo-barra-fill" style="width:${pct}%"></div></div>
      <div class="escudo-res-ctrl">
        <button type="button" onclick="_escudoAjustarRecurso('${e.tipo}','${_esc(e.id)}','sorte_atual',-1)">−</button>
        <input type="number" value="${atual}" onchange="_escudoSetRecurso('${e.tipo}','${_esc(e.id)}','sorte_atual', this.value)">
        <button type="button" onclick="_escudoAjustarRecurso('${e.tipo}','${_esc(e.id)}','sorte_atual',1)">+</button>
      </div>
    </div>`;
}

function _renderEstilo(e) {
  return `
    <div class="escudo-res escudo-res--estilo">
      <div class="escudo-res-head"><span>Estilo</span></div>
      <select class="escudo-estilo-select" data-rank="${e.estilo_rank}"
              onchange="this.dataset.rank=this.value; _escudoSetRecurso('${e.tipo}','${_esc(e.id)}','estilo_rank', this.value)">
        ${ESCUDO_RANKS.map(r => `<option value="${r}"${r === e.estilo_rank ? ' selected' : ''}>${r}</option>`).join('')}
      </select>
    </div>`;
}

function _escudoAvatar(e) {
  return e.foto
    ? `<img src="${e.foto}" alt="">`
    : `<span>${_esc((e.nome || '?')[0]).toUpperCase()}</span>`;
}

// Caixa de anotações do Mestre — expansível/retrátil, específica de cada
// participante. Compartilhada entre a linha "em combate" e o chip "fora de
// combate" para não duplicar o comportamento de abrir/fechar e salvar.
function _renderNotaBox(e) {
  const aberto = _escudoNotasAbertas.has(e.id);
  const texto = _escudoNotas[e.id] || '';
  const temNota = texto.trim().length > 0;

  return `
    <div class="escudo-nota${aberto ? ' escudo-nota--aberta' : ''}">
      <button type="button" class="escudo-nota-toggle" onclick="_escudoToggleNota('${_esc(e.id)}')">
        📝 Anotações${temNota ? '<span class="escudo-nota-dot"></span>' : ''}
        <span class="escudo-nota-seta">${aberto ? '▲' : '▼'}</span>
      </button>
      ${aberto ? `
        <textarea class="escudo-nota-textarea" placeholder="Anotações sobre ${_esc(e.nome)}…"
                  oninput="_escudoNotaInput('${_esc(e.id)}', this.value)"
                  onblur="_escudoNotaBlur()">${_esc(texto)}</textarea>
      ` : ''}
    </div>`;
}

function _renderCombatRow(e, posicao) {
  const ativo = e.id === _escudoEstado.turnoAtual;
  const removerBtn = e.tipo === 'npc'
    ? `<button type="button" class="escudo-btn-remover" title="Remover NPC" onclick="_escudoRemoverNpc('${_esc(e.id)}')">🗑</button>`
    : '';

  return `
    <div class="escudo-row${ativo ? ' escudo-row--ativo' : ''}${e.tipo === 'npc' ? ' escudo-row--npc' : ''}"
         onclick="_escudoSelecionarTurno('${_esc(e.id)}', event)" title="Clique para definir como turno atual">
      <div class="escudo-row-rank">${posicao}º</div>
      <div class="escudo-row-main">
        <div class="escudo-row-top">
          <div class="escudo-row-avatar">${_escudoAvatar(e)}</div>
          <div class="escudo-row-head">
            <span class="escudo-row-name">${_esc(e.nome)}</span>
            ${e.tipo === 'npc' ? '<span class="escudo-npc-tag">NPC</span>' : ''}
            ${ativo ? '<span class="escudo-row-ativo-tag">▶ turno atual</span>' : ''}
            <span class="escudo-row-iniciativa">
              <label>Iniciativa</label>
              <input type="number" min="1" max="100" value="${e.iniciativa}"
                     onchange="_escudoSetIniciativa('${_esc(e.id)}', this.value)">
            </span>
            <button type="button" class="escudo-btn-fichabtn" title="Perícias e painel de combate" onclick="abrirMiniFicha('${_esc(e.id)}')">📖 Perícias</button>
            ${removerBtn}
          </div>
        </div>
        <div class="escudo-res-group">
          ${_renderBarra(e, 'hp', 'HP', 'hp')}
          ${_renderBarra(e, 'postura', 'Postura', 'postura')}
          ${_renderBarra(e, 'pm', 'PM', 'pm')}
          ${_renderSorte(e)}
          ${_renderEstilo(e)}
        </div>
        ${_renderNotaBox(e)}
      </div>
    </div>`;
}

function _renderForaChip(e) {
  const removerBtn = e.tipo === 'npc'
    ? `<button type="button" class="escudo-btn-remover" title="Remover NPC" onclick="_escudoRemoverNpc('${_esc(e.id)}')">🗑</button>`
    : '';
  const aberto = _escudoNotasAbertas.has(e.id);
  return `
    <div class="escudo-chip-wrap${aberto ? ' escudo-chip-wrap--aberto' : ''}">
      <div class="escudo-chip${e.tipo === 'npc' ? ' escudo-chip--npc' : ''}">
        <div class="escudo-chip-avatar">${_escudoAvatar(e)}</div>
        <span class="escudo-chip-name">${_esc(e.nome)}</span>
        ${e.tipo === 'npc' ? '<span class="escudo-npc-tag">NPC</span>' : ''}
        <input type="number" min="1" max="100" class="escudo-chip-iniciativa" placeholder="Iniciativa"
               onchange="_escudoSetIniciativa('${_esc(e.id)}', this.value)">
        <button type="button" class="escudo-btn-fichabtn escudo-btn-fichabtn--chip" title="Perícias e painel de combate" onclick="abrirMiniFicha('${_esc(e.id)}')">📖</button>
        ${removerBtn}
      </div>
      ${_renderNotaBox(e)}
    </div>`;
}

// ─── Edição de recursos ─────────────────────────────────────────

function _escudoValorAtual(tipo, id, campo) {
  const fonte = tipo === 'pc' ? _escudoFichas[id]?.dados : _escudoNpcs[id];
  return parseInt(fonte?.[campo], 10) || 0;
}

// Atualiza o cache local + re-renderiza na hora (otimista), e só então persiste.
// Necessário porque _renderEscudo() substitui todo o HTML a cada evento de
// listener — sem isso, um valor digitado mas ainda não confirmado pelo
// Firestore "voltaria" visualmente caso outro card mudasse nesse intervalo.
async function _escudoSetRecurso(tipo, id, campo, valor) {
  const v = String(valor);
  if (tipo === 'pc') {
    if (_escudoFichas[id]) _escudoFichas[id].dados = { ..._escudoFichas[id].dados, [campo]: v };
    _renderEscudo();
    await dbSaveCampos(id, null, { [campo]: v });
  } else if (_escudoNpcs[id]) {
    _escudoNpcs[id] = { ..._escudoNpcs[id], [campo]: v };
    _escudoSalvarNpcsLocal();
    _renderEscudo();
  }
}

async function _escudoAjustarRecurso(tipo, id, campo, delta) {
  const novo = Math.max(0, _escudoValorAtual(tipo, id, campo) + delta);
  await _escudoSetRecurso(tipo, id, campo, novo);
}

function _escudoSetIniciativa(id, valorStr) {
  const n = parseInt(valorStr, 10);
  const valido = !isNaN(n) && n >= 1 && n <= 100;

  if (valido) _escudoEstado.iniciativas[id] = n;
  else delete _escudoEstado.iniciativas[id];
  _escudoSalvarEstadoLocal();
  _renderEscudo();
}

async function _escudoRemoverNpc(npcId) {
  delete _escudoNpcs[npcId];
  _escudoSalvarNpcsLocal();

  if (_escudoEstado.iniciativas[npcId] !== undefined) {
    delete _escudoEstado.iniciativas[npcId];
    _escudoSalvarEstadoLocal();
  }
  _renderEscudo();
}

// ─── Gerenciador de turnos/rodadas ──────────────────────────────

// Clicar no card de um combatente "em combate" o torna o turno atual direto
// (sem avançar rodada). Ignora cliques em controles internos do card (inputs,
// botões, select, textarea) para não roubar o turno enquanto o Mestre ajusta
// HP/iniciativa/anotações etc.
function _escudoSelecionarTurno(id, ev) {
  if (ev?.target?.closest('input, button, select, textarea, a')) return;
  if (_escudoEstado.turnoAtual === id) return;
  _escudoEstado = { ..._escudoEstado, turnoAtual: id };
  _escudoSalvarEstadoLocal();
  _renderEscudo();
}

function escudoProximoTurno() {
  const ordem = _escudoOrdemAtual();
  if (!ordem.length) return;
  let idx = ordem.findIndex(e => e.id === _escudoEstado.turnoAtual);
  idx++;
  let rodada = _escudoEstado.rodada;
  if (idx >= ordem.length) { idx = 0; rodada++; }
  _escudoEstado = { ..._escudoEstado, turnoAtual: ordem[idx].id, rodada };
  _escudoSalvarEstadoLocal();
  _renderEscudo();
}

function escudoTurnoAnterior() {
  const ordem = _escudoOrdemAtual();
  if (!ordem.length) return;
  let idx = ordem.findIndex(e => e.id === _escudoEstado.turnoAtual);
  if (idx === -1) idx = 0;
  idx--;
  let rodada = _escudoEstado.rodada;
  if (idx < 0) { idx = ordem.length - 1; if (rodada > 1) rodada--; }
  _escudoEstado = { ..._escudoEstado, turnoAtual: ordem[idx].id, rodada };
  _escudoSalvarEstadoLocal();
  _renderEscudo();
}

function escudoReiniciarRodadas() {
  const ordem = _escudoOrdemAtual();
  const turnoAtual = ordem.length ? ordem[0].id : null;
  _escudoEstado = { ..._escudoEstado, rodada: 1, turnoAtual };
  _escudoSalvarEstadoLocal();
  _renderEscudo();
}

function escudoConfirmarReiniciarCombate() {
  abrirConfirm(
    'Reiniciar combate',
    'Isso limpa a iniciativa de todos os jogadores e remove todos os NPCs/monstros do combate. Os atributos (vida, postura, etc.) dos jogadores não são alterados. Deseja continuar?',
    async () => {
      _escudoNpcs = {};
      _escudoSalvarNpcsLocal();
      _escudoEstado = { rodada: 1, turnoAtual: null, iniciativas: {} };
      _escudoSalvarEstadoLocal();
      _renderEscudo();
      mostrarToast('Combate reiniciado.');
    }
  );
}

// ─── Modal: Adicionar NPC/Monstro ───────────────────────────────

async function abrirModalAddNpc() {
  document.getElementById('add-npc-error').style.display = 'none';
  document.getElementById('btn-confirmar-add-npc').disabled = true;
  document.getElementById('modal-add-npc').classList.add('open');
  await _carregarFichasParaNpc();
}

function fecharModalAddNpc() {
  document.getElementById('modal-add-npc').classList.remove('open');
}

async function _carregarFichasParaNpc() {
  const loading = document.getElementById('add-npc-loading');
  const empty = document.getElementById('add-npc-empty');
  const list = document.getElementById('add-npc-list');

  loading.style.display = 'block';
  empty.style.display = 'none';
  list.innerHTML = '';

  try {
    _escudoFichasMoldes = await dbLoadFichas(DB_USER.uid);
    loading.style.display = 'none';

    if (!_escudoFichasMoldes.length) {
      empty.style.display = 'block';
      empty.innerHTML = '<p style="text-align:center;color:var(--ink-soft);font-size:13px">Você não tem fichas próprias para usar como molde. <a href="../../ficha/">Criar ficha →</a></p>';
      return;
    }

    list.innerHTML = _escudoFichasMoldes.map(f => `
      <label class="ficha-option" data-id="${_esc(f.id)}" onclick="_selecionarFichaNpc(this)">
        <input type="radio" name="add-npc-pick" value="${_esc(f.id)}" style="position:absolute;opacity:0;width:0;height:0">
        <div class="ficha-option-radio"></div>
        <div class="ficha-option-avatar">${_esc((f.nome || '?')[0]).toUpperCase()}</div>
        <div class="ficha-option-info">
          <div class="ficha-option-name">${_esc(f.nome)}</div>
          <div class="ficha-option-meta">Ficha própria</div>
        </div>
      </label>`).join('');
  } catch (e) {
    loading.style.display = 'none';
    console.warn('[add-npc]', e);
  }
}

function _selecionarFichaNpc(el) {
  document.querySelectorAll('#add-npc-list .ficha-option').forEach(o => o.classList.remove('ficha-option--selected'));
  el.classList.add('ficha-option--selected');
  document.getElementById('btn-confirmar-add-npc').disabled = false;
}

// Clona TODOS os campos da ficha-molde (recursos, perícias, atributos) para
// uma instância local nova — cada clique gera um id novo (Date.now + random),
// então adicionar a mesma ficha várias vezes sempre cria NPCs distintos e
// independentes entre si. Clonar tudo (não só recursos) é o que permite o
// popup de perícias/combate funcionar igual para NPCs e PCs.
function confirmarAddNpc() {
  const sel = document.querySelector('#add-npc-list .ficha-option--selected');
  if (!sel) return;
  const molde = _escudoFichasMoldes.find(f => f.id === sel.dataset.id);
  if (!molde) return;

  const d = molde.dados || {};
  const npc = {
    ...d,
    id: _escudoGerarNpcId(),
    nome: molde.nome || 'NPC',
    foto: d._foto || null,
    hp_atual: d.hp_atual ?? '0', hp_max: d.hp_max ?? '0',
    postura_atual: d.postura_atual ?? '0', postura_max: d.postura_max ?? '0',
    pm_atual: d.pm_atual ?? '0', pm_max: d.pm_max ?? '0',
    sorte_atual: d.sorte_atual ?? '0',
    estilo_rank: d.estilo_rank || 'D',
  };
  _escudoNpcs[npc.id] = npc;
  _escudoSalvarNpcsLocal();
  _renderEscudo();

  fecharModalAddNpc();
  mostrarToast('✓ NPC adicionado ao combate!');
}

// ─── Mini-ficha: perícias (somente leitura) + painel de combate ────
// Depende também de skills.js (SKILL_BASE, SKILL_NAMES, ESCOLA_BONUSES,
// RANK_B_PLUS) e combat.js (selectCombatMode, rollAttack, etc.), incluídos
// em index.html. As funções abaixo recalculam os totais direto de `dados`
// (sem tocar DOM de ficha nenhuma) — só para exibir, nunca salvam nada.

function _escudoBasePericia(dados, skillKey) {
  if (skillKey === 'sk_esquiva') {
    const des = parseInt(dados?.des) || 0;
    return Math.floor(des / 2);
  }
  return SKILL_BASE[skillKey] || 0;
}

function _escudoBonusEscola(dados, skillKey) {
  const escola = dados?.escola || '';
  if (!escola) return 0;

  if (escola === 'domiciliar') {
    const sk1 = dados?.domiciliar_sk1 || '';
    const sk2 = dados?.domiciliar_sk2 || '';
    if (!sk1) return 0;
    if (sk2 && sk2 !== sk1) return (skillKey === sk1 || skillKey === sk2) ? 5 : 0;
    return skillKey === sk1 ? 12 : 0;
  }

  const bonus = ESCOLA_BONUSES[escola];
  if (!bonus) return 0;
  let total = 0;
  bonus.fixed.forEach(([sk, pct]) => { if (sk === skillKey) total += pct; });
  if (escola === 'hogwarts' && (dados?.hogwarts_escolha || '') === skillKey) total += 10;
  return total;
}

function _escudoBonusEstilo(dados, skillKey) {
  if (skillKey !== 'sk_magia_combate') return 0;
  return RANK_B_PLUS.includes(dados?.estilo_rank || '') ? 5 : 0;
}

function _escudoPericiaTotal(dados, skillKey) {
  const base = _escudoBasePericia(dados, skillKey);
  const bonusEsc = _escudoBonusEscola(dados, skillKey);
  const bonusEstilo = _escudoBonusEstilo(dados, skillKey);
  const ip = parseInt(dados?.[`${skillKey}_ip`]) || 0;
  const oc = parseInt(dados?.[`${skillKey}_oc`]) || 0;
  const livre = parseInt(dados?.[`${skillKey}_livre`]) || 0;
  return Math.min(99, Math.max(0, base + bonusEsc + bonusEstilo + ip + oc + livre));
}

// A rolagem em si é feita pelo dice.js (o mesmo sistema da ficha real) — não
// reimplementamos nada aqui. dice.js observa o DOM inteiro via MutationObserver
// e liga automaticamente o clique em qualquer `.skill-total[data-total]`
// (perícia) ou `.der-box.sorte` (Sorte) que aparecer, então basta usar a MESMA
// marcação que a ficha usa. O popup de resultado sai no canto inferior direito,
// com o mesmo estilo (número grande colorido + tipo de sucesso + threshold),
// exatamente como na ficha.
function _renderMiniPericiaRow(dados, skillKey, nome) {
  const total = _escudoPericiaTotal(dados, skillKey);
  return `
    <div class="mini-pericia-row">
      <span class="skill-total mini-pericia-total" data-total="${skillKey}" title="Clique para rolar">${total}%</span>
      <label><span class="skill-label-text mini-pericia-nome">${_esc(nome)}</span></label>
    </div>`;
}

function _renderMiniSorteRow(dados) {
  const total = parseInt(dados?.sorte_atual) || 0;
  return `
    <div class="der-box sorte mini-pericia-row mini-pericia-row--sorte" title="Clique para rolar Sorte">
      <span class="mini-pericia-nome">🍀 Sorte</span>
      <input type="text" class="mini-pericia-total mini-sorte-input" data-field="sorte_atual" value="${total}" readonly>
    </div>`;
}

function _renderMiniSkillCol(dados, grupo) {
  return `
    <div class="mini-skill-col">
      <h5>${_esc(grupo.titulo)}</h5>
      ${grupo.skills.map(sk => _renderMiniPericiaRow(dados, sk, SKILL_NAMES[sk] || sk)).join('')}
    </div>`;
}

function abrirMiniFicha(entityId) {
  const ficha = _escudoFichas[entityId];
  const npc = _escudoNpcs[entityId];
  if (!ficha && !npc) return;

  // O painel de combate é recriado do zero a cada abertura, mas combat.js
  // guarda o último estado (tipo de ataque, modo, etc.) em memória por id —
  // sem limpar, reabrir a mesma ficha mostraria os botões "normal/feitiço"
  // selecionados visualmente enquanto a lógica interna ainda usaria a
  // escolha da vez anterior.
  if (typeof combatState !== 'undefined') delete combatState[entityId];

  const dados = ficha ? (ficha.dados || {}) : npc;
  const nome = ficha ? ficha.nome : (npc.nome || 'NPC');

  const nomeEl = document.getElementById('mini-ficha-nome');
  if (nomeEl) nomeEl.textContent = nome;

  // NPCs adicionados antes do clone completo de dados (versão anterior desta
  // funcionalidade) só têm os recursos básicos — sem 'escola' nem nenhum
  // sk_*_ip/_oc/_livre, campos que uma ficha real sempre tem (mesmo vazios).
  // Nesse caso avisamos, já que não há como recuperar os dados retroativamente.
  const avisoLegado = (!ficha && npc && !('escola' in npc))
    ? `<div class="mini-ficha-aviso">⚠️ Este NPC foi adicionado antes do clone completo de perícias/atributos. Remova-o e adicione novamente para ver os valores corretos.</div>`
    : '';

  const conteudo = document.getElementById('mini-ficha-conteudo');
  if (conteudo) {
    conteudo.innerHTML = `
      <div id="content-${entityId}">
        ${avisoLegado}
        <h4 class="mini-ficha-sec-title">📖 Perícias</h4>
        <div class="mini-pericia-sorte-wrap">${_renderMiniSorteRow(dados)}</div>
        <div class="mini-skills-grid">
          ${ESCUDO_SKILL_GROUPS.map(g => _renderMiniSkillCol(dados, g)).join('')}
        </div>
        ${_escudoCriarPainelCombateHTML(entityId)}
      </div>`;
  }

  document.getElementById('modal-mini-ficha')?.classList.add('open');
}

function fecharMiniFicha() {
  document.getElementById('modal-mini-ficha')?.classList.remove('open');
}

function _escudoCriarPainelCombateHTML(id) {
  const templateEl = document.getElementById('template-escudo-combat');
  if (!templateEl) return '';
  return templateEl.innerHTML.replaceAll('${id}', id);
}

// ─── Rodapé: resumo de regras ───────────────────────────────────

function escudoToggleRegras() {
  document.getElementById('escudo-regras-footer')?.classList.toggle('escudo-regras--aberto');
}
