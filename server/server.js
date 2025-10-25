const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const {getConnection} = require('./db/conn')

//rotas
const usersRouter = require('./routes/users');
const perfilRouter = require('./routes/perfil');

const app = express();
const PORT = process.env.PORT || 3000;

//configouração dos middleware
app.use(cors()); //permite requisção de outras origens
app.use(express.json()) //transforma em JSON as requisições do body

//node-cron pra poder deletar users após 15 dias, tem que deixar rodando isso, em HIPÓTESE ALGUMA REMOVER ISSO!!!!!!!!!!
cron.schedule('0 0 * * *', async() => {
    const conn = await getConnection();

    //seleciona user inativo a mais de 15 dias
    const [rows] = await conn.execute(`SELECT id FROM usuario WHERE status = 'Inativo' AND ultimo_login <= DATE_SUB(NOW(), INTERVAL 15 DAY) OR ultimo_login IS NULL`);

    //cria log de deletado
    for (const user of rows){
        await conn.execute('INSERT INTO log_user (id_user, nome, email, acao) VALUES (?,?,?,?)', [user.id, user.nome, user.email, 'DELETADO']);
    }

    //remove do banco
    await conn.execute(`DELETE FROM usuario WHERE status = 'Inativo' AND ultimo_login <= DATE_SUB(NOW(), INTERVAL 15 DAY) OR ultimo_login IS NULL`)

    await conn.end();

    console.log(`[CRON] Removido users inativos a mais de 15 dias`)
})

//chamando as rotas
app.use('/users', usersRouter);
app.use('/perfil', perfilRouter)

//iniciar server
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
})