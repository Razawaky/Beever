import bcrypt from 'bcrypt';

import { hashDoIpDaRequisicao } from '../config/contextoRequisicao.js';
import { emTransacao } from '../config/database.js';
import * as guardianConsentsRepository from '../repositories/guardianConsentsRepository.js';
import * as profilesRepository from '../repositories/profilesRepository.js';
import * as userLevelsRepository from '../repositories/userLevelsRepository.js';
import * as usersRepository from '../repositories/usersRepository.js';
import * as walletsRepository from '../repositories/walletsRepository.js';
import { ErroAplicacao, erroAcessoNegado, erroNaoEncontrado, erroValidacao } from '../utils/erros.js';
import * as auditService from './auditService.js';

/**
 * Regra de negócio de contas. Zero SQL aqui — tudo passa pelos repositories.
 *
 * A conta **não guarda nome completo**. A RN-049 proíbe coletar dado pessoal de
 * criança além de apelido e avatar, e o schema seguiu a regra: existe
 * `nickname`, não existe `name`. Por isso o cadastro pede apelido, e o apelido é
 * obrigatório — antes era opcional, com o nome real fazendo as vezes dele.
 */

const CUSTO_BCRYPT = 10;

/**
 * O ator pode ser o dono da conta ou um administrador agindo sobre ela — a
 * diferença muda quem responde pela ação na trilha de auditoria.
 */
function quemAgiu(ator) {
  return ator.ehAdmin ? auditService.admin(ator.id) : auditService.usuario(ator.id);
}

/**
 * Só o dono da conta mexe na conta — ou um administrador.
 *
 * Estar logado dizia quem você é, não sobre quem você pode agir: as rotas de
 * conta exigiam sessão e paravam aí, e o id da URL entrava direto no `UPDATE`.
 * Qualquer conta trocava e-mail e senha de qualquer outra, e a auditoria
 * registrava fielmente o atacante — gravar o fato não é impedi-lo.
 *
 * O perfil já fazia a checagem certa (`profilesService.exigirPosse`); aqui ela
 * faltava. Recusar com 403 e não com 404 é decisão consciente: quem está logado
 * já sabe que outras contas existem, então esconder a existência não protege
 * nada e só atrapalha quem tenta entender o erro.
 */
function exigirPosse(idAlvo, ator) {
  if (ator?.ehAdmin) return;
  if (Number(ator?.id) !== Number(idAlvo)) throw erroAcessoNegado('Você só pode alterar a sua própria conta');
}

/** Política do documento: mínimo 8 caracteres, com letras e números. */
export function senhaValida(senha) {
  return typeof senha === 'string' && senha.length >= 8 && /[a-zA-Z]/.test(senha) && /[0-9]/.test(senha);
}

function exigirSenhaValida(senha) {
  if (!senhaValida(senha)) {
    throw erroValidacao('A senha precisa ter ao menos 8 caracteres, com letras e números');
  }
}

/**
 * Idade a partir da qual a pessoa responde por si.
 *
 * Na prática o público inteiro do Beever é menor (6 a 15), então o
 * consentimento vale para todo mundo. A regra fica escrita assim mesmo assim:
 * quando um adulto criar conta para acompanhar, ela se comporta certo sozinha,
 * em vez de pedir autorização de responsável a um pai de família.
 */
const MAIORIDADE = 18;

/** Idade em anos completos na data de referência. */
export function idadeEm(dataNasc, referencia = new Date()) {
  const nascimento = new Date(dataNasc);
  let idade = referencia.getFullYear() - nascimento.getFullYear();
  const passouAniversario =
    referencia.getMonth() > nascimento.getMonth() ||
    (referencia.getMonth() === nascimento.getMonth() && referencia.getDate() >= nascimento.getDate());
  if (!passouAniversario) idade -= 1;
  return idade;
}

/**
 * Classifica a idade numa das faixas do catálogo. Cálculo puro sobre a lista
 * que veio do banco, para poder ser testado sem banco.
 *
 * Quem está fora do intervalo declarado cai na faixa mais próxima em vez de
 * ficar sem faixa: perfil sem faixa não vê conteúdo nenhum, e uma criança de 5
 * anos que o responsável cadastrou não merece uma tela vazia.
 */
export function faixaParaIdade(faixas, idade) {
  const exata = faixas.find((faixa) => idade >= faixa.min_age && idade <= faixa.max_age);
  if (exata) return exata;
  return idade < faixas[0].min_age ? faixas[0] : faixas[faixas.length - 1];
}

export async function listar() {
  return usersRepository.listar();
}

export async function obter(id) {
  const usuario = await usersRepository.buscarPorId(id);
  if (!usuario) throw erroNaoEncontrado('Usuário não encontrado');
  return usuario;
}

/**
 * Cria a conta inteira ou nenhuma parte dela.
 *
 * São quatro linhas em quatro tabelas — conta, perfil, carteira e nível — e
 * todas fazem parte do que "ter uma conta" significa. Uma conta sem carteira
 * não consegue receber mel; uma sem linha de nível quebra na primeira
 * recompensa. Por isso a transação: no schema antigo isso eram três chamadas
 * soltas que podiam falhar no meio e deixar conta pela metade.
 */
export async function criar({ email, dataNasc, senha, apelido, consentimentoResponsavel = false }) {
  exigirSenhaValida(senha);

  const apelidoLimpo = apelido?.trim();
  if (!apelidoLimpo) throw erroValidacao('Informe como você quer ser chamado');

  const idade = idadeEm(dataNasc);
  const precisaDeConsentimento = idade < MAIORIDADE;

  // A checagem vem antes de tudo o que custa: nem hash de senha, nem consulta de
  // faixa etária, nem linha nenhuma no banco. Conta de criança sem autorização
  // de responsável não deve nem começar a existir.
  if (precisaDeConsentimento && !consentimentoResponsavel) {
    throw new ErroAplicacao(
      'É preciso que um responsável autorize a criação desta conta',
      { status: 422, codigo: 'CONSENTIMENTO_NECESSARIO' },
    );
  }

  if (await usersRepository.emailJaUsado(email)) {
    throw new ErroAplicacao('Este e-mail já está cadastrado', { status: 409, codigo: 'EMAIL_EM_USO' });
  }

  const senhaHash = await bcrypt.hash(senha, CUSTO_BCRYPT);
  const faixas = await profilesRepository.listarFaixasEtarias();
  const faixa = faixaParaIdade(faixas, idade);

  const { idUsuario, idPerfil } = await emTransacao(async (conexao) => {
    const usuario = await usersRepository.criar({ email, apelido: apelidoLimpo, dataNasc, senhaHash }, conexao);
    const perfil = await profilesRepository.criar({ idUsuario: usuario }, conexao);
    await walletsRepository.criar(usuario, conexao);
    await userLevelsRepository.criar(usuario, conexao);

    // O consentimento entra na mesma transação da conta. Consentimento perdido
    // com conta criada é o pior desfecho possível: a criança fica cadastrada e a
    // prova de que alguém autorizou, não.
    if (precisaDeConsentimento) {
      await guardianConsentsRepository.registrar(conexao, {
        idUsuario: usuario,
        // O e-mail do registro é o do responsável quando a conta é de menor
        // (RN-048). Copiar aqui não é redundância: se o e-mail de login mudar
        // amanhã, a prova continua dizendo a quem o consentimento foi dado.
        emailResponsavel: email,
        ipHash: hashDoIpDaRequisicao() ?? null,
      });
    }

    return { idUsuario: usuario, idPerfil: perfil };
  });

  // A faixa etária fica fora da transação de propósito: se ela falhar, a conta
  // continua utilizável e o onboarding regrava. Derrubar um cadastro inteiro por
  // causa da classificação de idade seria trocar um problema pequeno por um
  // grande.
  await profilesRepository.atualizar(idPerfil, { faixaEtaria: faixa.code });

  // A trilha nasce anônima (RN-053): apelido e e-mail são dado pessoal e a
  // tabela é append-only por gatilho (RNF-17) — o que entrar aqui sobrevive à
  // exclusão da conta para sempre. Entra só o agregado: a faixa e o fato de
  // haver consentimento, que é o que a auditoria precisa saber depois.
  await auditService.registrar(auditService.usuario(idUsuario), 'conta.criada', {
    entidade: 'user',
    id: idUsuario,
    depois: { faixaEtaria: faixa.code, consentimentoDeResponsavel: precisaDeConsentimento },
  });

  if (precisaDeConsentimento) {
    // O e-mail do responsável não entra aqui pelo mesmo motivo do apelido na
    // linha acima. Quem provou o consentimento na hora é a tabela
    // `guardian_consents`, que acompanha o ciclo de vida da conta e sai junto
    // quando ela é apagada.
    await auditService.registrar(auditService.usuario(idUsuario), 'consentimento.registrado', {
      entidade: 'user',
      id: idUsuario,
      depois: { idade },
    });
  }

  return {
    id: idUsuario,
    email,
    apelido: apelidoLimpo,
    idPerfil,
    faixaEtaria: faixa.code,
    consentimentoDeResponsavel: precisaDeConsentimento,
  };
}

export async function atualizar(id, { apelido, email, dataNasc, senha }, ator) {
  exigirPosse(id, ator);

  let senhaHash = null;
  if (senha) {
    exigirSenhaValida(senha);
    senhaHash = await bcrypt.hash(senha, CUSTO_BCRYPT);
  }

  const afetadas = await usersRepository.atualizar(id, { apelido, email, dataNasc, senhaHash });
  if (afetadas === 0) throw erroNaoEncontrado('Usuário não encontrado');

  await auditService.registrar(quemAgiu(ator), 'conta.atualizada', {
    entidade: 'user',
    id,
    // Nada de valor pessoal entra na trilha: apenas o que mudou. Apelido,
    // e-mail e data de nascimento são dado pessoal (RN-049), e apagar a conta
    // um dia (RN-053) não pode deixar cópia deles no histórico imutável.
    depois: {
      emailAlterado: Boolean(email),
      apelidoAlterado: Boolean(apelido),
      dataNascAlterada: Boolean(dataNasc),
      senhaAlterada: Boolean(senha),
    },
  });

  return usersRepository.buscarPorId(id);
}

/**
 * Exclusão lógica: a conta é desativada e o expurgo definitivo fica a cargo do
 * cron, 15 dias depois — dando margem para arrependimento (RN-053).
 */
export async function inativar(id, ator) {
  exigirPosse(id, ator);

  const usuario = await obter(id);

  const afetadas = await usersRepository.inativar(id);
  if (afetadas === 0) throw erroNaoEncontrado('Usuário não encontrado');

  await auditService.registrar(quemAgiu(ator), 'conta.inativada', {
    entidade: 'user',
    id,
    antes: { ativa: Boolean(usuario.is_active) },
    depois: { ativa: false },
  });
}

/**
 * Apagamento definitivo (RN-053): remove a linha do usuário e, pela cascata
 * das foreign keys, tudo o que a conta possui — perfil, carteira, metas,
 * compras, consentimento. É o que a política de privacidade oferece a quem
 * pede a exclusão pelo Art. 18 da LGPD: o dado sai de verdade.
 *
 * A trilha de auditoria não pode ser reescrita (RNF-17 a tornou imutável por
 * gatilho), e ela não tem foreign key para `users` justamente para sobreviver
 * à exclusão. O que mantém a RN-053 inteira é o agregado já nascer anônimo —
 * `conta.criada`, `conta.atualizada` e `consentimento.registrado` não gravam
 * apelido, e-mail nem data, então quando o expurgo chega não há o que apagar.
 */
export async function apagarDefinitivamente(id, ator) {
  exigirPosse(id, ator);

  // O `obter` garante que a conta existe; sem ele, o registro sairia sobre um
  // id que não pertence a ninguém.
  const usuario = await obter(id);

  // O registro sai antes do `DELETE`: a linha de auditoria precisa do id
  // enquanto ele ainda existe. É a mesma ordem do expurgo do cron
  // (`limpezaService`), e o que ele guarda é só o agregado.
  await auditService.registrar(quemAgiu(ator), 'conta.apagada', {
    entidade: 'user',
    id,
    antes: { ativa: Boolean(usuario.is_active) },
    depois: { tinhaOnboarding: Boolean(usuario.onboarding_completed_at) },
  });

  await usersRepository.removerPorId(id);
}
