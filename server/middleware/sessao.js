const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const { v4: genuuid } = require('uuid');

const options = {
    host: 'localhost',
    port: 3306,
    user: 'beever',
    password: 'beever123_',
    database: 'beever'
}

const sessionStore = new MySQLStore(options);

//criando sessao como middleware
const sessao = session({
    name: 'SessionCookie',//nome do cookie
    genid: function (req) {
        console.log('ID da sessão criada')
        return genuuid() //criando id unico pra sessao
    },
    secret: 'Segredo!',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        httpOnly: true,
        sameSite: "lax",
        maxAge: 20 * 60 * 1000 //20 minutos a duração da sessao
    }
})

module.exports = sessao;