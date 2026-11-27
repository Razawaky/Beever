import { consultar, consultarEm } from '../config/database.js';

export async function buscarUltimoHash(conexao) {
  const linhas = await consultarEm(
    conexao,
    'SELECT hash_atual FROM log_blockchain ORDER BY id DESC LIMIT 1 FOR UPDATE'
  );
  return linhas[0]?.hash_atual ?? null;
}

export function inserirBloco(conexao, bloco) {
  return consultarEm(
    conexao,
    `INSERT INTO log_blockchain (data_hora, usuario, acao, hash_anterior, hash_atual)
     VALUES (?,?,?,?,?)`,
    [bloco.dataHora, bloco.usuario, bloco.acao, bloco.hashAnterior, bloco.hashAtual]
  );
}

export function listarBlocos() {
  return consultar('SELECT * FROM log_blockchain ORDER BY id ASC');
}