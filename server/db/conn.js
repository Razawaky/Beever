const mysql = require('mysql2/promise');

//conexao com BD
const dbConfig = {
    host: 'localhost',
    user: 'beever',
    password: 'beever123_',
    database: 'beever'
}

//função pra conexao e reutilização
async function getConnection(){
    const connection = await mysql.createConnection(dbConfig);
    return connection;
}

module.exports = {getConnection};