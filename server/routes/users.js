const express = require('express');
const router = express.Router();
const { getConnection } = require('../db/conn');
const bcrypt = require('bcrypt')

//listar users
router.get('/', async (req, res) => {
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

        const query = `INSERT INTO usuario (nome, email, data_nasc, senha, data_criacao, ultimo_login, status, moedas, tipo_usuario) VALUES (?,?,?,?,NOW(),NULL,'Ativo',0,?)`;

        const [result] = await conn.execute(query, [nome,email,data_nasc,hash,tipo_usuario || Comum]);
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

//login users
router.post('/login', async (req, res) => {
    const {email, senha} = req.body;
    if(!email || !senha){
        return res.status(400).json({ error: 'E-mail e senha são obrigatórios' });
    }

    try{
        const conn = await getConnection();
        const [rows] =  await conn.execute('SELECT * FROM usuario WHERE email = ?', [email]);
        await conn.end();

        //verifica se user existe
        if (rows.length === 0){
            return res.status(404).json({error:'Usuário não encontrado'});
        }

        const user = rows[0];
        const senhaCorreta = await bcrypt.compare(senha, user.senha);

        if(!senhaCorreta){
            return res.status(401).json({error:'Senha incorreta'});
        }

        //atualizando ultimo login
        const conn2 = await getConnection();
        await conn2.execute('UPDATE usuario SET ultimo_login = NOW() WHERE id = ?', [user.id]);
        await conn2.end();

        res.json({
            id: user.id,
            nome: user.nome,
            email: user.email,
            tipo_usuario: user.tipo_usuario
        })
    } catch(e){
        console.error(e);
        res.status(500).json({error:'Erro no login'});
    }
})

//atualizar user
router.put('/:id', async (req, res) => {
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
router.delete('/:id', async (req, res) => {
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