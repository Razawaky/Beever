const bcrypt = require('bcrypt');
const { getConnection } = require('../db/conn');

//listar perfis
async function listarPerfil(id_user){
    const conn = await getConnection();

    const query = `SELECT id, nome_perfil, moedas, avatar_img FROM perfil WHERE id_user = ?`;
    const [result] = await conn.execute(query, [id_user]);

    await conn.end()
    return result;
}

//criar perfil
async function criarPerfil(id_user, nome_perfil, senha_perfil, data_nasc, avatar_img){
    const hash = await bcrypt.hash(senha_perfil, 10);
    const conn = await getConnection();

    const query = `INSERT INTO perfil (id_user, nome_perfil, senha_perfil, data_nasc, moedas, data_criacao, ultimo_login, avatar_img) VALUES (?,?,?,?,0,NOW(),NULL,?)`;
    const [result] = await conn.execute(query, [id_user,nome_perfil,hash,data_nasc,avatar_img || null]);

    await conn.end()
    return result.insertId; //retorna id do perfil criada
}

//buscar perfil por nome - pra login
async function buscarPerfilNome(id_user, nome_perfil){
    const conn = await getConnection();

    const query = `SELECT * FROM perfil WHERE id_user = ? AND nome_perfil = ?`;
    const [result] = await conn.execute(query, [id_user, nome_perfil]);

    await conn.end()
    return result.length > 0 ? result[0] : null; //vai retornar ou o primeiro listado ou NULL
}

//atualizar login do perfil
async function atualizarLoginPerfil(perfilId){
    const conn = await getConnection();

    await conn.execute('UPDATE perfil SET ultimo_login = NOW() WHERE id = ?', [perfilId]);

    await conn.end()
}

//atualizar perfil
async function atualizarPerfil(id_perfil, nome_perfil, senha_perfil, data_nasc){
    const conn = await getConnection();

    //se trocou a senha, faz hash
    let senhaHash = null;
    if(senha_perfil){
        senhaHash = await bcrypt.hash(senha_perfil, 10)
    }

    const query = `UPDATE perfil SET nome_perfil = COALESCE(?, nome_perfil), senha_perfil = COALESCE(?, senha_perfil), data_nasc = COALESCE(?, data_nasc) WHERE id = ?`;
    const [result] = await conn.execute(query, [nome_perfil, senhaHash, data_nasc, id_perfil])

    await conn.end()
    return result;
}

//deletar perfil
async function deletarPerfil(id_perfil){
    const conn = await getConnection();

    //verifica se o perfil existe ou nao
    const [rows] = await conn.execute(`SELECT * FROM perfil WHERE id = ?`, [id_perfil]);
    if(rows.length === 0){
        await conn.end();
        return null;
    }

    //deletar perfil
    const [result] = await conn.execute('DELETE FROM perfil WHERE id = ?', [id_perfil])

    await conn.end()

    return result;
}

module.exports = {
    buscarPerfilNome,
    atualizarLoginPerfil,
    listarPerfil,
    criarPerfil,
    atualizarPerfil,
    deletarPerfil
}