const { getConnection } = require('../db/conn');

//criar sessao
async function criarSessao(id_user, sessionId, id_jogos = null){
    const conn = await getConnection();

    const query = `INSERT INTO sessao (id_user_sessao, id_jogos, data_inicio, ultimo_ativo, id_sessao_cookie) VALUES (?,?,NOW(),NOW(),?)`;
    const [result] = await conn.execute(query, [id_user, id_jogos, sessionId])

    await conn.end()
    return result.insertId; //retorna id da sessao criada
}

//atualiza sessao
async function atualizaSessao(sessaoId){
    const conn = await getConnection();

    const query = `UPDATE sessao SET ultimo_ativo = NOW() WHERE id = ?`;
    await conn.execute(query, [sessaoId])

    await conn.end()
}

//finaliza sessao
async function finalizarSessao(userId, pontos=0, moedas=0){
    const conn = await getConnection();

    const query = `UPDATE sessao SET data_fim = NOW(), pontos_obtidos = ?, moedas_ganhas = ? WHERE id_user_sessao = ? AND data_fim IS NULL`;
    await conn.execute(query, [pontos, moedas, userId])

    await conn.end()
}

module.exports = {
    criarSessao,
    atualizaSessao,
    finalizarSessao
}