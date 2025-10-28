const express = require('express');
const router = express.Router();
const { getConnection } = require('../db/conn');
const bcrypt = require('bcrypt')

//verifica se tem sessao do user ativa
function authMiddleware(req, res, next) {
    if (req.session.userId) return next();
    res.status(401).json({ error: 'Não autorizado' });
}

//listar users
router.get('/', authMiddleware, async (req, res) => {
    try{
        const conn = await getConnection();
        const [rows] = await conn.execute('SELECT * FROM usuario');
        await conn.end();
        res.json(rows);
    } catch(e){
        console.error(e);
        res.status(500).json({error: 'Erro ao buscar usuários'});
    }
})

//criar users
router.post('/', async (req, res) => {
    const {nome, email, data_nasc, senha, tipo_usuario} = req.body;
    if(!nome || !email || !data_nasc || !senha){
        return res.status(400).json({ error: 'Tem campos vazios a serem preenchidos' });
    }

    try{
        const hash = await bcrypt.hash(senha, 10);
        const conn = await getConnection();

        const query = `INSERT INTO usuario (nome, email, data_nasc, senha, data_criacao, ultimo_login, status, tipo_usuario) VALUES (?,?,?,?,NOW(),NULL,'Ativo',?)`;

        const [result] = await conn.execute(query, [nome,email,data_nasc,hash,tipo_usuario || 'Comum']);
        await conn.end();

        res.status(201).json({
            id: result.insertId, 
            nome, email, 
            tipo_usuario: tipo_usuario || 'Comum'
        })
    } catch(e){
        console.error(e);
        res.status(500).json({error: 'Erro ao criar usuários'});
    }
})

//atualizar user
router.put('/:id', authMiddleware, async (req, res) => {
    const {id} = req.params;
    const {nome, email, data_nasc} = req.body;

    try{
        const conn = await getConnection();

        const [result] = await conn.execute(`
            UPDATE usuario SET 
            nome = COALESCE(?, nome),
            email = COALESCE(?, email),
            data_nasc = COALESCE(?, data_nasc)
            WHERE id = ?`, [nome, email, data_nasc, id]
        );

        await conn.end();

        if(result.affectedRows === 0){
            return res.status(404).json({error:'Usuário não encontrado'});
        }

        res.json({message: 'Dados atualizados com sucesso!'})
    } catch(e){
        console.error(e);
        res.status(500).json({error: 'Erro ao atualizar dados'})
    }
})

//deletar user
router.delete('/:id', authMiddleware, async (req, res) => {
    const {id} = req.params;
        const {nome, email} = req.body;

    try{
        const conn = await getConnection();

        //atualiza status para inativo
        await conn.execute(`UPDATE usuario SET status = 'Inativo' WHERE id = ?`, [id]);

        //cria log
        await conn.execute('INSERT INTO log_user (id_user, nome, email, acao) VALUES (?,?,?,?)', [id, nome, email, 'INATIVADO'])

        await conn.end();

        res.json({message: 'Usuário deletado com sucesso'})
    } catch(e){
        console.error(e);
        res.status(500).json({error: 'Erro ao deletar usuário'})
    }
})

module.exports = router;