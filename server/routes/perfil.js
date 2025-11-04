const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');

const perfilModel = require('../models/perfil');

//verifica se tem sessao do user ativa
function authMiddleware(req, res, next) {
    if (req.session.userId) return next();
    res.status(401).json({ error: 'Não autorizado' });
}

//listar perfis
router.get('/:id_user', authMiddleware, async (req, res) => {
    const {id_user} = req.params;

    //verifica se é o usuário que está logado no momento
    if (req.session.userId !== parseInt(id_user)) {
        return res.status(403).json({ error: 'Acesso negado' });
    }

    try{
        const result = await perfilModel.listarPerfil(id_user);
        if (result.length === 0){
            return res.status(404).json({ error: 'Nenhum perfil encontrado para este usuário' });
        }

        res.json(result);

    } catch(e){
        console.error(e);
        res.status(500).json({error: 'Erro ao buscar perfis'});
    }
})

//criar perfil
router.post('/:id_user', authMiddleware, async (req, res) => {
    const {id_user} = req.params;
    const {nome_perfil, senha_perfil, data_nasc, avatar_img} = req.body;

    //verifica se é o usuário que está logado no momento
    if (req.session.userId !== parseInt(id_user)) {
        return res.status(403).json({ error: 'Acesso negado' });
    }

    if(!nome_perfil || !senha_perfil || !data_nasc){
        return res.status(400).json({ error: 'Tem campos vazios a serem preenchidos' });
    }

    try{
        const idPerfil = await perfilModel.criarPerfil(id_user, nome_perfil, senha_perfil, data_nasc, avatar_img)

        res.status(201).json({
            id: idPerfil, 
            id_user, nome_perfil, data_nasc, 
            avatar_img: avatar_img || null,
            moedas: 0
        })
    } catch(e){
        console.error(e);
        res.status(500).json({error: 'Erro ao criar perfil'});
    }
})

//login perfil
router.post('/:id_user/login', authMiddleware, async (req, res) => {
    const {id_user} = req.params;
    const {nome_perfil, senha_perfil} = req.body;

    if(!nome_perfil || !senha_perfil){
        return res.status(400).json({ error: 'Nome e senha obrigatórios' });
    }

    //verifica se é o usuário que está logado no momento
    if (req.session.userId !== parseInt(id_user)) {
        return res.status(403).json({ error: 'Acesso negado' });
    }

    try{
        const perfil = await perfilModel.buscarPerfilNome(id_user, nome_perfil)

        //verifica se perfil existe
        if (!perfil){
            return res.status(404).json({error:'Perfil não encontrado'});
        }

        const senhaCorreta = await bcrypt.compare(senha_perfil, perfil.senha_perfil);

        if(!senhaCorreta){
            return res.status(401).json({error:'Senha incorreta'});
        }

        //salvando sessao no banco do express
        req.session.perfilId = perfil.id;
        //atualizando ultimo login
        await perfilModel.atualizarLoginPerfil(perfil.id)

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
router.put('/:id_user/:id', authMiddleware, async (req, res) => {
    const {id_user, id} = req.params;
    const {nome_perfil, senha_perfil, data_nasc} = req.body;

    //verifica se é o usuário que está logado no momento
    if (req.session.userId !== parseInt(id_user)) {
        return res.status(403).json({ error: 'Acesso negado' });
    }

    try{
        const result = await perfilModel.atualizarPerfil(id, nome_perfil, senha_perfil, data_nasc);

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
router.delete('/:id_user/:id', authMiddleware, async (req, res) => {
    const {id_user, id} = req.params;

    //verifica se é o usuário que está logado no momento
    if (req.session.userId !== parseInt(id_user)) {
        return res.status(403).json({ error: 'Acesso negado' });
    }

    try{

        const result = await perfilModel.deletarPerfil(id);

        if (!result){
            return res.status(404).json({ error: 'Perfil não encontrado' });
        }
        res.json({message: 'Perfil deletado com sucesso'})

    } catch(e){
        console.error(e);
        res.status(500).json({error: 'Erro ao deletar perfil'})
    }
})

module.exports = router;