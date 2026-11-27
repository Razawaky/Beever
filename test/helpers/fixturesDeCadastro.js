import assert from 'node:assert/strict';

/**
 * Cadastro em duas portas, como o produto faz hoje: primeiro a conta do
 * responsável, depois cada criança como perfil jogável.
 */

const NASCIMENTO_DO_RESPONSAVEL = '1990-05-20';
const SENHA_PADRAO = 'beever123';
const APELIDO_DO_RESPONSAVEL = 'responsavel';

export async function lerToken(agente, caminho = '/login') {
  const resposta = await agente.get(caminho).set('Accept', 'text/html').expect(200);
  const achado =
    /name="_csrf" value="([^"]+)"/.exec(resposta.text) ?? /data-csrf-token="([^"]+)"/.exec(resposta.text);
  assert.ok(achado, `token CSRF não encontrado em ${caminho}`);
  return achado[1];
}

export async function criarResponsavel(
  agente,
  { email, senha = SENHA_PADRAO, apelido = APELIDO_DO_RESPONSAVEL, dataNasc = NASCIMENTO_DO_RESPONSAVEL } = {},
) {
  const csrf = await lerToken(agente);
  return agente
    .post('/users')
    .set('Accept', 'application/json')
    .send({ apelido, email, data_nasc: dataNasc, senha, _csrf: csrf })
    .expect(201);
}

export async function criarCrianca(
  agente,
  { apelido, email, data_nasc: dataNasc, senha = SENHA_PADRAO } = {},
) {
  const conta = await criarResponsavel(agente, { email, senha });
  const csrf = await lerToken(agente, '/perfis');
  const cadastro = await agente
    .post('/perfis')
    .set('Accept', 'application/json')
    .send({ apelido, data_nasc: dataNasc, consentimento_responsavel: true, _csrf: csrf })
    .expect(201);

  cadastro.body.contaId = conta.body.id;
  return cadastro;
}
