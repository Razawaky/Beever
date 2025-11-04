const express = require('express');
const router = express.Router();

const userModel = require('../models/user');

//verifica se tem sessao do user ativa
function authMiddleware(req, res, next) {
    if (req.session.userId) return next();
    res.status(401).json({ error: 'Não autorizado' });
}

//listar users
router.get('/', authMiddleware, async (req, res) => {
    try{
        const result = userModel.listarUser();
        res.json(result);
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
        
        const userId = await userModel.criarUser(nome, email, data_nasc, senha, tipo_usuario)

        res.status(201).json({
            id: userId, 
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
    const {nome, email, data_nasc, senha} = req.body;

    try{
 
        const result = await userModel.atualizarUser(id, nome, email, data_nasc, senha);

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
        const result = await userModel.deletarUser(id, nome, email);

        if (!result){
            return res.status(404).json({error: 'Usuário não encontrado'})
        }

        res.json({message: 'Usuário deletado com sucesso'})
    } catch(e){
        console.error(e);
        res.status(500).json({error: 'Erro ao deletar usuário'})
    }
})

module.exports = router;