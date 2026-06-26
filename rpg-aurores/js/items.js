/* ═══════════════════════════════════════════════════════════════
   ITEMS — catálogo e mochila de missão
═══════════════════════════════════════════════════════════════ */

const ITEMS_DATA = [
  // ── Rank 1 — Cadete ──────────────────────────────────────────
  {
    id: 'pocao_cura_menor',
    nome: 'Poção de PM Menor',
    rank: 1, rankNome: 'Cadete', tipo: 'Poção',
    peso: 1, usos: 2, categoria: 'Cura',
    descricao: 'Uma poção simples de PM rápida, padrão do kit de campo de todo Cadete.',
    efeito: 'Restaura 1d3 de PM ao ser consumida. Pode ser usada na Ação de Combate.',
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
    descricao: 'Versão aprimorada da poção Wiggenweld, com ingredientes de maior concentração.',
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
                <span class="item-badge-tipo tipo-${(item.tipo || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, '')}">${item.tipo || ''}</span>
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
            <span class="item-badge-tipo tipo-${(item.tipo || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, '')}">${item.tipo || ''}</span>
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
