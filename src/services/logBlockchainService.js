import { emTransacao } from '../config/database.js';
import { logger } from '../config/logger.js';
import * as repo from '../repositories/logBlockchainRepository.js';
import { HASH_GENESIS, calcularHash, verificarCadeia } from '../utils/cadeiaDeHashes.js';

/** Registra um bloco. Nunca lança erro: falha no log não pode derrubar o app. */
export async function registrar(usuario, acao) {
  for (let tentativa = 1; tentativa <= 3; tentativa++) {
    try {
      return await emTransacao(async (conexao) => {
        const hashAnterior = (await repo.buscarUltimoHash(conexao)) ?? HASH_GENESIS;
        const dataHora = new Date().toISOString();
        const usuarioTexto = String(usuario ?? 'sistema');
        const hashAtual = calcularHash(dataHora, usuarioTexto, acao, hashAnterior);
        await repo.inserirBloco(conexao, {
          dataHora, usuario: usuarioTexto, acao, hashAnterior, hashAtual,
        });
        return hashAtual;
      });
    } catch (erro) {
      if (tentativa === 3) {
        logger.error({ erro }, 'Falha ao registrar bloco do log em blockchain');
      }
    }
  }
  return null;
}

export async function validar() {
  return verificarCadeia(await repo.listarBlocos());
}

export const listar = () => repo.listarBlocos();