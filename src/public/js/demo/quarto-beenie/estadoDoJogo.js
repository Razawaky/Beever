// Estado único da demo do quarto.
//
// O quarto e o minigame são cenas diferentes, mas compartilham este objeto.
// Assim a cena do cofre pode devolver moedas e o quarto continua de onde parou.

import * as Phaser from '/js/vendor/demo/phaser.esm.min.js';

export const IDS_DAS_TAREFAS = Object.freeze([
  'cama',
  'brinquedo-bola',
  'brinquedo-bloco',
  'brinquedo-foguete',
  'livros',
  'roupa',
  'cofre',
]);

function criarTarefas() {
  return Object.fromEntries(IDS_DAS_TAREFAS.map((id) => [id, false]));
}

class EstadoDoJogo extends Phaser.Events.EventEmitter {
  constructor() {
    super();
    this.moedas = 0;
    this.parede = 0;
    this.tarefas = criarTarefas();
  }

  reiniciar() {
    this.moedas = 0;
    this.parede = 0;
    this.tarefas = criarTarefas();
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
