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
import { motivoDeRecusa } from './apelidoPublico.js';

/**
 * Regra de negócio de contas. Zero SQL aqui — tudo passa pelos repositories.
 *
 * A conta **não guarda nome completo**. A RN-049 proíbe coletar dado pessoal de
 * criança além de apelido e avatar, e o schema seguiu a regra: existe
 * `nickname`, não existe `name`. O cadastro pede como o responsável quer ser
 * chamado; as crianças entram depois, como perfis da conta.
 */

// Exportado para a recuperação de senha gravar o hash com o mesmo custo do cadastro.
export const CUSTO_BCRYPT = 10;

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

/** Idade a partir da qual a pessoa pode responder pela própria conta. */
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
 * Cria a conta do responsável.
 *
 * Hoje é uma linha só: a conta não joga e, portanto, não tem carteira, nível nem
 * perfil. Os filhos entram depois com `criarPerfilDaConta`, que sim monta o
 * conjunto completo (usuário, perfil, carteira, nível e consentimento) numa
 * transação — perfil sem carteira não recebe mel e sem nível quebra na primeira
 * recompensa.
 */
export async function criar({ email, dataNasc, senha, apelido }) {
  exigirSenhaValida(senha);
  return criarConta({ email, dataNasc, apelido, senha });
}

/** Conta nascida do login com Google: sem senha, com o id do Google no lugar. */
export async function criarComGoogle({ email, googleSub, dataNasc, apelido }) {
  return criarConta({ email, dataNasc, apelido, googleSub });
}

/**
 * Cadastro do responsável. Não cria perfil de jogo: a conta entra no sistema
 * para cadastrar as crianças depois, e cada perfil infantil terá carteira,
 * nível, faixa etária e consentimento próprios (`criarPerfilDaConta`).
 *
 * A conta também não passa pelo onboarding — wizard de avatar, rotina e objetivo
 * é coisa de perfil jogador. Por isso ela nasce com onboarding concluído e o
 * login já a leva para `/perfis`.
 */
async function criarConta({ email, dataNasc, apelido, senha = null, googleSub = null }) {
  const apelidoLimpo = apelido?.trim();
  if (!apelidoLimpo) throw erroValidacao('Informe como você quer ser chamado');

  // Quem cria a conta por senha responde por ela. A checagem vem antes do hash
  // e de qualquer escrita: cadastro de menor como responsável não pode começar.
  // O fluxo do Google fica como era — foi explicitamente deixado de fora desta
  // mudança — e por isso não recebe esta barreira.
  if (!googleSub && idadeEm(dataNasc) < MAIORIDADE) {
    throw new ErroAplicacao('O cadastro deve ser feito por um adulto responsável', {
      status: 422,
      codigo: 'RESPONSAVEL_MENOR_DE_IDADE',
    });
  }

  if (await usersRepository.emailJaUsado(email)) {
    throw new ErroAplicacao('Este e-mail já está cadastrado', { status: 409, codigo: 'EMAIL_EM_USO' });
  }

  const senhaHash = senha ? await bcrypt.hash(senha, CUSTO_BCRYPT) : null;
  // O responsável não passa pelo wizard, mas a conta pelo Google mantém o
  // comportamento de antes: ainda cai no onboarding no primeiro login.
  const onboardingConcluido = !googleSub;
  const idUsuario = await emTransacao((conexao) =>
    usersRepository.criar(
      { email, apelido: apelidoLimpo, dataNasc, senhaHash, googleSub, onboardingConcluido },
      conexao,
    ),
  );

  // A trilha nasce anônima (RN-053): apelido e e-mail são dado pessoal e a
  // tabela é append-only por gatilho (RNF-17). Sai só o agregado.
  await auditService.registrar(auditService.usuario(idUsuario), 'conta.criada', {
    entidade: 'user',
    id: idUsuario,
    depois: { responsavel: true },
  });

  return { id: idUsuario, email, apelido: apelidoLimpo, onboardingConcluido };
}

/**
 * Cria um perfil de jogo dentro de uma conta existente.
 *
 * Perfil adicional não é conta: nasce sem e-mail, sem senha e sem Google, e
 * não aparece nas consultas de login. Ele existe para separar o progresso de
 * irmãos que dividem a mesma conta — carteira, níveis, metas, agenda,
 * inventário, cofre e trilha ficam presos ao `user_id` da persona, como já
 * ficavam na conta única.
 *
 * A faixa etária sai da data de nascimento do perfil, não da conta: dois irmãos
 * com idades diferentes precisam ver conteúdos e regras econômicas diferentes.
 * A gravação entra na mesma transação do restante porque perfil sem faixa não
 * vê conteúdo nenhum.
 */
export async function criarPerfilDaConta(idConta, { apelido, dataNasc, consentimentoResponsavel }) {
  const conta = await usersRepository.buscarPorId(idConta);
  if (!conta || conta.owner_user_id) throw erroNaoEncontrado('Conta não encontrada');
  if (!conta.is_active) {
    throw new ErroAplicacao('Esta conta está inativa', { status: 403, codigo: 'CONTA_INATIVA' });
  }

  // O consentimento é manifestado no ato de adicionar a criança, não no cadastro
  // do adulto (RN-048/LGPD Art. 14). Sem ele, nenhuma persona nasce: perfil sem
  // autorização registrada seria dado de menor guardado sem prova.
  if (consentimentoResponsavel !== true) {
    throw new ErroAplicacao('Autorize a criação deste perfil infantil', {
      status: 422,
      codigo: 'CONSENTIMENTO_NECESSARIO',
    });
  }

  const apelidoLimpo = String(apelido ?? '').trim();
  const motivo = motivoDeRecusa(apelidoLimpo);
  if (motivo) throw erroValidacao(motivo);

  const nascimento = new Date(dataNasc);
  if (!dataNasc || Number.isNaN(nascimento.getTime())) {
    throw erroValidacao('Data de nascimento inválida');
  }
  if (nascimento > new Date()) throw erroValidacao('A data de nascimento não pode estar no futuro');

  const faixas = await profilesRepository.listarFaixasEtarias();
  const faixa = faixaParaIdade(faixas, idadeEm(dataNasc));

  const { idUsuario, idPerfil } = await emTransacao(async (conexao) => {
    const usuario = await usersRepository.criarPerfilDaConta(
      { idConta: conta.id, apelido: apelidoLimpo, dataNasc },
      conexao,
    );
    const perfil = await profilesRepository.criar({ idUsuario: usuario }, conexao);
    await walletsRepository.criar(usuario, conexao);
    await userLevelsRepository.criar(usuario, conexao);
    await profilesRepository.atualizar(perfil, { faixaEtaria: faixa.code }, conexao);
    await guardianConsentsRepository.registrar(conexao, {
      idUsuario: usuario,
      // O e-mail é o da conta que autorizou. Copiado de propósito: se o
      // responsável trocar o e-mail de login amanhã, a prova continua dizendo
      // a quem o consentimento foi dado.
      emailResponsavel: conta.email,
      ipHash: hashDoIpDaRequisicao() ?? null,
    });

    return { idUsuario: usuario, idPerfil: perfil };
  });

  // A trilha não guarda apelido nem data: são dado pessoal (RN-049) e o
  // histórico é imutável (RNF-17), então precisa sobreviver ao apagamento.
  // O consentimento é um fato jurídico (LGPD Art. 14), não um detalhe do
  // perfil: merece linha própria na trilha. Só o agregado entra nela — e-mail,
  // apelido e IP ficam na tabela de consentimento, que a exclusão apaga.
  await auditService.registrar(auditService.usuario(idConta), 'consentimento.registrado', {
    entidade: 'profile',
    id: idPerfil,
    depois: { registrado: true },
  });

  await auditService.registrar(auditService.usuario(idConta), 'perfil.criado', {
    entidade: 'profile',
    id: idPerfil,
    depois: { faixaEtaria: faixa.code, consentimentoDeResponsavel: true },
  });

  return {
    id: idUsuario,
    idPerfil,
    apelido: apelidoLimpo,
    faixaEtaria: faixa.code,
    consentimentoDeResponsavel: true,
  };
}

export async function atualizar(id, { apelido, email, dataNasc, senha }, ator) {
  exigirPosse(id, ator);

  const alvo = await usersRepository.buscarPorId(id);
  if (!alvo) throw erroNaoEncontrado('Usuário não encontrado');

  // Perfil adicional é persona, não conta: não tem e-mail nem senha. Recusar
  // aqui evita que uma rota de conta transforme um perfil em credencial
  // acidental (o login continuaria barrando pelo `owner_user_id`, mas o dado
  // ficaria no lugar errado).
  if (!ator?.ehAdmin && (email || senha) && alvo.owner_user_id) {
    throw erroValidacao('Perfil adicional não tem e-mail nem senha de login');
  }

  // A tela de configurações permite trocar o e-mail, e a UNIQUE da tabela é a
  // última defesa. Conferir antes transforma o erro do banco em uma mensagem
  // que a pessoa entende, em vez de um 500.
  let emailFinal = email;
  if (email) {
    emailFinal = String(email).trim().toLowerCase();
    if (emailFinal !== alvo.email && (await usersRepository.emailJaUsado(emailFinal))) {
      throw new ErroAplicacao('Este e-mail já está cadastrado', {
        status: 409,
        codigo: 'EMAIL_EM_USO',
      });
    }
  }

  let senhaHash = null;
  if (senha) {
    exigirSenhaValida(senha);
    senhaHash = await bcrypt.hash(senha, CUSTO_BCRYPT);
  }

  const afetadas = await usersRepository.atualizar(id, { apelido, email: emailFinal, dataNasc, senhaHash });
  if (afetadas === 0) throw erroNaoEncontrado('Usuário não encontrado');

  await auditService.registrar(quemAgiu(ator), 'conta.atualizada', {
    entidade: 'user',
    id,
    // Nada de valor pessoal entra na trilha: apenas o que mudou. Apelido,
    // e-mail e data de nascimento são dado pessoal (RN-049), e apagar a conta
    // um dia (RN-053) não pode deixar cópia deles no histórico imutável.
    depois: {
      emailAlterado: Boolean(emailFinal && emailFinal !== alvo.email),
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
