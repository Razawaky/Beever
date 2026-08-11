#!/usr/bin/env node
import bcrypt from 'bcrypt';

import { env } from '../src/config/env.js';
import { pool, emTransacao } from '../src/config/database.js';

/**
 * Dados de desenvolvimento.
 *
 * Idempotente: identifica usuário por e-mail e item por nome, então pode rodar
 * quantas vezes quiser sem duplicar. Nunca deve ser executado em produção — as
 * senhas aqui são públicas.
 */

const CUSTO_BCRYPT = 10;

const USUARIOS = [
  { nome: 'Ana Souza', email: 'ana@beever.dev', dataNasc: '2014-03-12', senha: 'beever123', apelido: 'Aninha', admin: false },
  { nome: 'Professor Silva', email: 'admin@beever.dev', dataNasc: '1988-07-02', senha: 'admin1234', apelido: 'Prof', admin: true },
];

const ITENS = [
  { nome: 'Chapéu de Abelha', descricao: 'Um chapéu listrado para o seu avatar.', preco: 50, categoria: 'Avatar' },
  { nome: 'Óculos de Sol', descricao: 'Estilo garantido na colmeia.', preco: 80, categoria: 'Avatar' },
  { nome: 'Tema Girassol', descricao: 'Deixa a interface amarelinha.', preco: 120, categoria: 'Tema' },
  { nome: 'Tema Noturno', descricao: 'Para estudar de noite sem cansar a vista.', preco: 120, categoria: 'Tema' },
  { nome: 'Pote de Mel', descricao: 'Recupera uma vida no jogo do quiz.', preco: 25, categoria: 'Consumivel' },
  { nome: 'Asas Douradas', descricao: 'Acessório raro para quem completa metas.', preco: 300, categoria: 'Acessorio' },
];

const CONTEUDO = {
  titulo: 'O que é poupança?',
  descricao: 'Primeira lição sobre guardar dinheiro com um objetivo.',
  corpo:
    'Poupar é separar hoje uma parte do que você recebe para usar depois, ' +
    'em vez de gastar tudo de uma vez. Quando você guarda um pouco toda semana, ' +
    'consegue comprar coisas maiores sem precisar pedir emprestado.',
};

const JOGO = { nome: 'Quiz da Poupança', minScore: 60 };

if (env.producao) {
  console.error('O seed não pode ser executado com NODE_ENV=production.');
  process.exit(1);
}

async function semear() {
  return emTransacao(async (conexao) => {
    const resumo = { usuarios: 0, admins: 0, perfis: 0, itens: 0, conteudos: 0, jogos: 0 };

    let idAdmin = null;

    for (const dados of USUARIOS) {
      const senhaHash = await bcrypt.hash(dados.senha, CUSTO_BCRYPT);

      const [existente] = await conexao.execute('SELECT id FROM usuario WHERE email = ?', [dados.email]);
      let idUsuario = existente[0]?.id;

      if (!idUsuario) {
        const [resultado] = await conexao.execute(
          'INSERT INTO usuario (nome, email, data_nasc, senha) VALUES (?, ?, ?, ?)',
          [dados.nome, dados.email, dados.dataNasc, senhaHash]
        );
        idUsuario = resultado.insertId;
        resumo.usuarios += 1;
      }

      if (dados.admin) {
        const [jaAdmin] = await conexao.execute('SELECT id_admin FROM admin WHERE user_id_user = ?', [idUsuario]);
        if (jaAdmin[0]) {
          idAdmin = jaAdmin[0].id_admin;
        } else {
          const [resultado] = await conexao.execute('INSERT INTO admin (user_id_user) VALUES (?)', [idUsuario]);
          idAdmin = resultado.insertId;
          resumo.admins += 1;
        }
      }

      // Todo usuário tem exatamente um perfil, e todo perfil tem um nível.
      const [temPerfil] = await conexao.execute('SELECT id FROM perfil WHERE id_usuario = ?', [idUsuario]);
      if (!temPerfil[0]) {
        const [resultado] = await conexao.execute(
          'INSERT INTO perfil (id_usuario, apelido, moedas, pontos) VALUES (?, ?, ?, ?)',
          [idUsuario, dados.apelido, dados.admin ? 0 : 150, dados.admin ? 0 : 40]
        );
        await conexao.execute('INSERT INTO nivel (id_perfil) VALUES (?)', [resultado.insertId]);
        resumo.perfis += 1;
      }
    }

    for (const item of ITENS) {
      const [existente] = await conexao.execute('SELECT id FROM item WHERE nome = ?', [item.nome]);
      if (existente[0]) continue;

      await conexao.execute(
        'INSERT INTO item (id_admin_criador, nome, descricao, preco, categoria) VALUES (?, ?, ?, ?, ?)',
        [idAdmin, item.nome, item.descricao, item.preco, item.categoria]
      );
      resumo.itens += 1;
    }

    const [temConteudo] = await conexao.execute('SELECT id FROM conteudo WHERE titulo = ?', [CONTEUDO.titulo]);
    let idConteudo = temConteudo[0]?.id;
    if (!idConteudo) {
      const [resultado] = await conexao.execute(
        'INSERT INTO conteudo (id_admin_criador, titulo, descricao, corpo) VALUES (?, ?, ?, ?)',
        [idAdmin, CONTEUDO.titulo, CONTEUDO.descricao, CONTEUDO.corpo]
      );
      idConteudo = resultado.insertId;
      resumo.conteudos += 1;
    }

    const [temJogo] = await conexao.execute('SELECT id FROM jogo WHERE nome = ?', [JOGO.nome]);
    if (!temJogo[0]) {
      await conexao.execute('INSERT INTO jogo (id_conteudo, nome, min_score) VALUES (?, ?, ?)', [
        idConteudo,
        JOGO.nome,
        JOGO.minScore,
      ]);
      resumo.jogos += 1;
    }

    return resumo;
  });
}

try {
  const resumo = await semear();
  console.log('Seed concluído. Registros criados nesta execução:');
  console.table(resumo);
  console.log('\nContas de desenvolvimento:');
  USUARIOS.forEach((u) => console.log(`  ${u.admin ? '[admin]' : '[comum]'} ${u.email} / ${u.senha}`));
  await pool.end();
  process.exit(0);
} catch (erro) {
  console.error(`Falha no seed: ${erro.message}`);
  await pool.end();
  process.exit(1);
}
