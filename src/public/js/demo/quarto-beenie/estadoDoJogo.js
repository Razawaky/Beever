// Estado único da demo do quarto.
//
// O quarto inteiro compartilha este objeto: parede atual, atividades
// concluídas, itens que já foram guardados, o item na mão e o mel fictício.
// A regra mais importante é a de capacidade: só cabe um item na mão.

import * as Phaser from '/js/vendor/demo/phaser.esm.min.js';

export const IDS_DAS_TAREFAS = Object.freeze([
  'bau',
  'armario',
  'cama',
  'quadro',
  'mesa',
  'janela',
]);

export const IDS_DOS_ITENS = Object.freeze([
  'brinquedos',
  'roupa-frente',
  'roupa-tras',
  'roupa-esquerda',
  'travesseiro-frente',
  'travesseiro-direita',
  'coberta',
  'livro',
]);

function criarTarefas() {
  return Object.fromEntries(IDS_DAS_TAREFAS.map((id) => [id, false]));
}

function criarItens() {
  return Object.fromEntries(IDS_DOS_ITENS.map((id) => [id, false]));
}

class EstadoDoJogo extends Phaser.Events.EventEmitter {
  constructor() {
    super();
    this.moedas = 0;
    this.parede = 0;
    this.tarefas = criarTarefas();
    this.itens = criarItens();
    this.carregando = null;
  }

  reiniciar() {
    this.moedas = 0;
    this.parede = 0;
    this.tarefas = criarTarefas();
    this.itens = criarItens();
    this.carregando = null;
    this.emit('mudou', this);
  }

  get totalDeTarefas() {
    return IDS_DAS_TAREFAS.length;
  }

  get tarefasConcluidas() {
    return IDS_DAS_TAREFAS.filter((id) => this.tarefas[id]).length;
  }

  get completo() {
    return this.tarefasConcluidas === this.totalDeTarefas;
  }

  /**
   * Pega um item do cenário. A mão só aceita um por vez: se já houver algo,
   * devolve `maos-ocupadas` com o item atual para a cena explicar o que fazer.
   */
  pegar(item) {
    if (!Object.hasOwn(this.itens, item)) return { ok: false, motivo: 'item-invalido' };
    if (this.itens[item]) return { ok: false, motivo: 'ja-colocado' };
    if (this.carregando === item) return { ok: false, motivo: 'ja-na-mao' };
    if (this.carregando) {
      return { ok: false, motivo: 'maos-ocupadas', carregando: this.carregando };
    }

    this.carregando = item;
    this.emit('mudou', this);
    return { ok: true, item };
  }

  /**
   * Coloca o item da mão no móvel. `aceitos` é a lista de itens que aquele
   * móvel recebe; qualquer outro item continua na mão.
   */
  guardarEm(aceitos = []) {
    if (!this.carregando) return { ok: false, motivo: 'nada-na-mao' };
    if (!aceitos.includes(this.carregando)) {
      return { ok: false, motivo: 'item-errado', item: this.carregando };
    }

    const item = this.carregando;
    this.carregando = null;
    this.itens[item] = true;
    this.emit('mudou', this);
    return { ok: true, item };
  }

  concluirTarefa(id, recompensa = 0) {
    if (!Object.hasOwn(this.tarefas, id) || this.tarefas[id]) return false;

    this.tarefas[id] = true;
    this.moedas += Math.max(0, Math.round(recompensa));
    this.emit('mudou', this);

    if (this.completo) this.emit('completo', this);
    return true;
  }

  definirParede(indice) {
    this.parede = ((indice % 4) + 4) % 4;
    this.emit('mudou', this);
  }
}

export const estado = new EstadoDoJogo();
