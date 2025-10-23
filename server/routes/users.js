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