const bcrypt = require('bcrypt');
const { getConnection } = require('../db/conn');

//listar users
async function listarUser(){
    const conn = await getConnection();

    const query = `SELECT * FROM usuario`;
    const [result] = await conn.execute(query);

    await conn.end()
    return result;
}

//criar users
async function criarUser(nome, email, data_nasc, senha, tipo_usuario){
    const hash = await bcrypt.hash(senha, 10);
    const conn = await getConnection();

    const query = `INSERT INTO usuario (nome, email, data_nasc, senha, data_criacao, ultimo_login, status, tipo_usuario) VALUES (?,?,?,?,NOW(),NULL,'Ativo',?)`;
    const [result] = await conn.execute(query, [nome,email,data_nasc,hash,tipo_usuario || 'Comum']);

    await conn.end()
    return result.insertId; //retorna id do user criada
}

//atualizar user
async function atualizarUser(userId, nome, email, data_nasc, senha){
    const conn = await getConnection();

    const query = `UPDATE usuario SET 
            nome = COALESCE(?, nome),
            email = COALESCE(?, email),
            senha = COALESCE(?, senha),
            data_nasc = COALESCE(?, data_nasc)
            WHERE id = ?`;
    const [result] = await conn.execute(query, [nome, email, senha, data_nasc, userId])

    await conn.end()
    return result;
}

//deletar user
async function deletarUser(userId, nome, email){
    const conn = await getConnection();

    //verifica se o user existe ou nao
    const [rows] = await conn.execute(`SELECT * FROM usuario WHERE id = ?`, [userId]);
    if(rows.length === 0){
        await conn.end();
        return null;
    }

    //atualiza status para inativo
    const [result] = await conn.execute(`UPDATE usuario SET status = 'Inativo' WHERE id = ?`, [userId])

    //cria log
    await conn.execute('INSERT INTO log_user (id_user, nome, email, acao) VALUES (?,?,?,?)', [userId, nome, email, 'INATIVADO'])

    await conn.end()

    return result;
}

module.exports = {
    listarUser,
    criarUser,
    atualizarUser,
    deletarUser
}