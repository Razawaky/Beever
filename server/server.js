const express = require('express');
const cors = require('cors');

//rotas
const usersRouter = require('./routes/users');

const app = express();
const PORT = process.env.PORT || 3000;

//configouração dos middleware
app.use(cors()); //permite requisção de outras origens
app.use(express.json()) //transforma em JSON as requisições do body

//iniciar server
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
})

//rotas ----
app.use('/users', usersRouter);