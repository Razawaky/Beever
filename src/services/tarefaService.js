import { emTransacao } from '../config/database.js';
import * as auditoriaRepository from '../repositories/auditoriaRepository.js';
import * as tarefaRepository from '../repositories/tarefaRepository.js';
import { erroAcessoNegado, erroNaoEncontrado, erroValidacao } from '../utils/erros.js';
import * as metaService from './metaService.js';
import * as pontosService from './pontosService.js';

export async function criar(idPerfil, idUsuario, idMeta, { titulo, descricao, dataPrazo, prioridade }) {
  await metaService.exigirPosse(idMeta, idPerfil);

  const idTarefa = await tarefaRepository.criar({ idMeta, idPerfil, titulo, descricao, dataPrazo, prioridade });

  await auditoriaRepository.registrar({
    atorTipo: 'Usuario',
    atorId: idUsuario,
    acao: 'CRIAR_TAREFA',
    entidade: 'tarefa',
    entidadeId: idTarefa,
    estadoNovo: { titulo, idMeta },
  });

  return idTarefa;
}

async function exigirPosse(idTarefa, idPerfil) {
  const tarefa = await tarefaRepository.buscarPorId(idTarefa);
  if (!tarefa) throw erroNaoEncontrado('Tarefa não encontrada');
  if (tarefa.id_perfil !== idPerfil) throw erroAcessoNegado();
  return tarefa;
}

/** Concluir credita pontos — tudo dentro da mesma transação, tudo ou nada. */
export async function concluir(idTarefa, idPerfil, idUsuario) {
  const tarefa = await exigirPosse(idTarefa, idPerfil);
  if (tarefa.progresso >= 100) {
    throw erroValidacao('Esta tarefa já foi concluída');
  }

  const pontos = pontosService.pontosPorTarefaConcluida();

  await emTransacao(async (conexao) => {
    const afetadas = await tarefaRepository.concluir(conexao, idTarefa);
    if (afetadas === 0) throw erroValidacao('Esta tarefa já foi concluída');
    await pontosService.creditar(conexao, idPerfil, pontos);
  });

  await auditoriaRepository.registrar({
    atorTipo: 'Usuario',
    atorId: idUsuario,
    acao: 'CONCLUIR_TAREFA',
    entidade: 'tarefa',
    entidadeId: idTarefa,
    estadoNovo: { titulo: tarefa.titulo, pontosGanhos: pontos },
  });

  return { pontosGanhos: pontos };
}
