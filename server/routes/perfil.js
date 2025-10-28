const express = require('express');
const router = express.Router();
const { getConnection } = require('../db/conn');
const bcrypt = require('bcrypt')

//verifica se tem sessao do user ativa
function authMiddleware(req, res, next) {
    if (req.session.userId) return next();
    res.status(401).json({ error: 'Não autorizado' });
}

//listar perfis
router.get('/', authMiddleware, async (req, res) => {
    try{
        const conn = await getConnection();
        const [rows] = await conn.execute('SELECT * FROM perfil');
        await conn.end();
        res.json(rows);
    } catch(e){
        console.error(e);
        res.status(500).json({error: 'Erro ao buscar perfis'});
    }
})

//criar perfil
router.post('/', authMiddleware, async (req, res) => {
    const {id_user, nome_perfil, senha_perfil, data_nasc, avatar_img} = req.body;
    if(!id_user || !nome_perfil || !senha_perfil || !data_nasc){
        return res.status(400).json({ error: 'Tem campos vazios a serem preenchidos' });
    }

    try{
        const hash = await bcrypt.hash(senha_perfil, 10);
        const conn = await getConnection();

        const query = `INSERT INTO perfil (id_user, nome_perfil, senha_perfil, data_nasc, moedas, data_criacao, ultimo_login, avatar_img) VALUES (?,?,?,?,0,NOW(),NULL,?)`;

        const [result] = await conn.execute(query, [id_user,nome_perfil,hash,data_nasc,avatar_img || null]);
        await conn.end();

        res.status(201).json({
            id: result.insertId, 
            id_user, nome_perfil, data_nasc, 
            tipo_usuario: avatar_img || null,
            moedas: 0
        })
    } catch(e){
        console.error(e);
        res.status(500).json({error: 'Erro ao criar perfil'});
    }
})

//login perfil
router.post('/login', authMiddleware, async (req, res) => {
    const {nome_perfil, senha_perfil} = req.body;
    if(!nome_perfil || !senha_perfil){
        return res.status(400).json({ error: 'Nome e senha obrigatórios' });
    }

    try{
        const conn = await getConnection();
        const [rows] =  await conn.execute('SELECT * FROM perfil WHERE nome_perfil = ?', [nome_perfil]);
        await conn.end();

        //verifica se user existe
        if (rows.length === 0){
            return res.status(404).json({error:'Perfil não encontrado'});
        }

        const perfil = rows[0];
        const senhaCorreta = await bcrypt.compare(senha_perfil, perfil.senha_perfil);

        if(!senhaCorreta){
            return res.status(401).json({error:'Senha incorreta'});
        }

        //atualizando ultimo login
        const conn2 = await getConnection();
        await conn2.execute('UPDATE perfil SET ultimo_login = NOW() WHERE id = ?', [perfil.id]);
        await conn2.end();

        res.json({
            message: 'Logado com sucesso!',
            id: perfil.id,
            id_user: perfil.id_user,
            nome_perfil: perfil.nome_perfil,
            avatar_img: perfil.avatar_img,
            moedas: perfil.moedas
        })
    } catch(e){
        console.error(e);
        res.status(500).json({error:'Erro no login'});
    }
})

//atualizar perfil
router.put('/:id', authMiddleware, async (req, res) => {
    const {id} = req.params;
    const {nome_perfil, data_nasc} = req.body;

    try{
        const conn = await getConnection();

        const [result] = await conn.execute(`
            UPDATE perfil SET 
            nome_perfil = COALESCE(?, nome_perfil),
            data_nasc = COALESCE(?, data_nasc)
            WHERE id = ?`, [nome_perfil, data_nasc, id]
        );

        await conn.end();

        if(result.affectedRows === 0){
            return res.status(404).json({error:'Perfil não encontrado'});
        }

        res.json({message: 'Dados atualizados com sucesso!'})
    } catch(e){
        console.error(e);
        res.status(500).json({error: 'Erro ao atualizar dados'})
    }
})

//deletar perfil
router.delete('/:id', authMiddleware, async (req, res) => {
    const {id} = req.params;

    try{
        const conn = await getConnection();

        //verifica se o perfil existe ou nao
        const [rows] = await conn.execute(`SELECT * FROM perfil WHERE id = ?`, [id]);
        if(rows.length === 0){
            await conn.end();
            return res.status(404).json({error: 'Perfil não encontrado'});
        }

        //deletar perfil
        await conn.execute('DELETE FROM perfil WHERE id = ?', [id])

        await conn.end();

        res.json({message: 'Perfil deletado com sucesso'})
    } catch(e){
        console.error(e);
        res.status(500).json({error: 'Erro ao deletar perfil'})
    }
})

module.exports = router;