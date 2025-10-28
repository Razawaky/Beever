const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');

const { getConnection } = require('../db/conn');
const sessaoModel = require('../models/sessao');

//verifica se tem sessao do user ativa
function authMiddleware(req, res, next) {
    if (req.session.userId) return next();
    res.status(401).json({ error: 'Não autorizado' });
}

//login users - inicializa sessao
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

        //criando sessao do user - middleware
        req.session.userId = user.id;
        req.session.email = user.email;
        //criando sessao do user - banco de dados
        await sessaoModel.criarSessao(user.id);

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

//logout users - finaliza sessao
router.post('/logout', authMiddleware, async (req, res) => {

    try{
        const userId = req.session.userId;

        //finaliza sessao no banco
        await sessaoModel.finalizarSessao(userId);

        //destroi sessao cookie
        req.session.destroy(e => {
            if(e){
                return res.status(500).json({error: 'Erro ao encerrar sessão'});
            } else {
                res.clearCookie('SessionCookie');
                res.json({message: 'Logout realizado com sucesso'})
            }
        })
    } catch(e){
        console.error(e);
        res.status(500).json({error:'Erro ao finalizar sessão'});
    }
})

//rota teste - só quem está logado acessa
router.get('/check', authMiddleware, (req, res) => {
    res.json({
        message: 'Sessão ativa', 
        userId: req.session.userId
    })
})

module.exports = router;