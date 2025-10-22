const express = require('express');
const router = express.Router();
const { getConnection } = require('../db/conn');

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
    const {nome, email} = req.body;
    if(!nome || !email){
        return res.status(400).json({ error: 'Nome e e-mail são obrigatórios' });
    }

    try{
        const conn = await getConnection();
        const [rows] = await conn.execute('INSERT INTO usuario (nome, email) VALUES (?,?)', [nome, email]);
        await conn.end();
        res.json(rows);
    } catch(e){
        console.error(e);
        res.status(500).json({error: 'Erro ao buscar usuários'});
    }
})