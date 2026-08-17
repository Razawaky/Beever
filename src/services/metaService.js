import * as auditoriaRepository from '../repositories/auditoriaRepository.js';
import * as metaRepository from '../repositories/metaRepository.js';
import * as tarefaRepository from '../repositories/tarefaRepository.js';
import { erroAcessoNegado, erroNaoEncontrado } from '../utils/erros.js';
import * as cronogramaService from './cronogramaService.js';

export async function listarDoPerfil(idPerfil) {
  const metas = await metaRepository.listarPorPerfil(idPerfil);
  return Promise.all(
    metas.map(async (meta) => {
      const tarefas = await tarefaRepository.listarPorMeta(meta.id);
      const concluidas = tarefas.filter((tarefa) => tarefa.progresso >= 100).length;
      return { ...meta, tarefas, progresso: tarefas.length === 0 ? 0 : Math.round((concluidas / tarefas.length) * 100) };
    })
  );
}

export async function criar(idPerfil, idUsuario, { titulo, descricao, dataFinal }) {
  const idCronograma = await cronogramaService.obterOuCriarAtivo(idPerfil);
  const idMeta = await metaRepository.criar({ idCronograma, titulo, descricao, dataFinal });

  await auditoriaRepository.registrar({
    atorTipo: 'Usuario',
    atorId: idUsuario,
    acao: 'CRIAR_META',
    entidade: 'meta',
    entidadeId: idMeta,
    estadoNovo: { titulo, dataFinal },
  });

  return idMeta;
}

export async function exigirPosse(idMeta, idPerfil) {
  const meta = await metaRepository.buscarPorId(idMeta);
  if (!meta) throw erroNaoEncontrado('Meta não encontrada');
  if (meta.id_perfil !== idPerfil) throw erroAcessoNegado();
  return meta;
}
