import { emTransacao } from '../config/database.js';
import * as profilesRepository from '../repositories/profilesRepository.js';
import * as usersRepository from '../repositories/usersRepository.js';
import { erroAcessoNegado, erroNaoEncontrado, erroValidacao } from '../utils/erros.js';
import * as auditService from './auditService.js';
import * as coinsService from './coinsService.js';
import * as levelsService from './levelsService.js';
import * as schedulesService from './schedulesService.js';

/**
 * Regra de negócio do perfil do jogador.
 *
 * Perfil é 1:1 com usuário, então não há listagem nem seleção: cada conta tem
 * exatamente um. A divisão entre conta e perfil, no schema novo, é esta: o
 * **apelido mora na conta** (`users.nickname`, junto do e-mail e da data de
 * nascimento), e o perfil guarda como o jogo se apresenta — avatar, faixa
 * etária, objetivo inicial, fuso e duração de sessão.
 */

/**
 * As três durações de sessão da RN-011. O banco repete a lista em
 * `ck_profiles_session_minutes`, e é de propósito que ela apareça aqui também:
 * validador de rota é a primeira barreira, não a única, e sem esta checagem um
 * valor como 30 chegava ao MySQL e voltava como 500 em vez de erro de
 * formulário. Se um dia virar catálogo em tabela, este é o único lugar a mudar.
 */
const MINUTOS_POR_SESSAO = [5, 10, 20];

/**
 * Ordem dos passos do onboarding (RF-ONB-01, RN-011).
 *
 * Duas diferenças em relação à regra escrita, ambas registradas como decisão no
 * laudo da T-04.1: a faixa etária **não** é passo, porque sai da data de
 * nascimento e não pode ser autodeclarada por quem queira mudar de regra
 * econômica (D-1); e o nível inicial **é** passo, embora a RN-011 não o preveja,
 * porque alimenta o ponto de partida do XP (D-3).
 *
 * Esta lista é a única fonte da ordem: a coluna `profiles.onboarding_step`
 * guarda um índice dela, e a migration 011 não repete o tamanho num CHECK
 * justamente para que acrescentar um passo continue sendo mudança de código.
 */
export const PASSOS_DO_ONBOARDING = ['apelido', 'dias', 'objetivo', 'avatar', 'nivel'];

// RF-ONB-03. A mesma recusa vale ao gravar o passo e ao concluir, então o texto
// mora num lugar só.
const ERRO_SEM_DIAS = 'Escolha pelo menos um dia da semana para jogar';

/**
 * Onde cada passo é gravado assim que é respondido (decisão D-2 da T-04.1):
 * cada resposta vai direto para a coluna que já é dela, sem tabela de rascunho
 * e sem cópia no fim. Antes disso as respostas viviam só na memória da aba, e
 * fechar o navegador no meio custava o começo de novo.
 *
 * O nível não aparece aqui de propósito. Ele não é preferência: lança XP no
 * livro e é irreversível, então gravá-lo antes do fim deixaria contas com nível
 * e sem agenda se o jogador desistisse no último passo. É o passo final, e quem
 * o grava é `salvarOnboarding`, dentro da transação.
 */
const ESCRITORES_DE_PASSO = {
  apelido: async ({ idUsuario }, resposta) => {
    const apelido = String(resposta ?? '').trim();
    if (!apelido) throw erroValidacao('Informe como quer ser chamado');
    await usersRepository.atualizar(idUsuario, { apelido });
  },
  dias: async ({ idUsuario }, resposta) => {
    // Um único dia marcado chega como valor solto, vários chegam como lista.
    const dias = [].concat(resposta ?? []).filter((dia) => dia !== '' && dia !== null && dia !== undefined);
    if (dias.length === 0) throw erroValidacao(ERRO_SEM_DIAS);
    await schedulesService.definirSemana(null, idUsuario, dias);
  },
  objetivo: async ({ idPerfil }, resposta) => {
    const objetivo = String(resposta ?? '').trim();
    if (!objetivo) throw erroValidacao('Escolha um objetivo');
    await profilesRepository.atualizar(idPerfil, { objetivoInicial: objetivo });
  },
  avatar: async ({ idPerfil }, resposta) => {
    const avatar = String(resposta ?? '').trim();
    if (!avatar) throw erroValidacao('Escolha sua abelha');
    await profilesRepository.atualizar(idPerfil, { avatar });
  },
};

export async function obterDoUsuario(idUsuario) {
  const perfil = await profilesRepository.buscarDetalhadoPorUsuario(idUsuario);
  if (!perfil) throw erroNaoEncontrado('Perfil não encontrado');

  const [usuario, nivel, carteira] = await Promise.all([
    usersRepository.buscarPorId(idUsuario),
    levelsService.obterDoUsuario(idUsuario),
    coinsService.obterCarteira(idUsuario),
  ]);

  return {
    ...perfil,
    apelido: usuario?.nickname ?? null,
    email: usuario?.email ?? null,
    onboardingConcluido: Boolean(usuario?.onboarding_completed_at),
    nivel,
    mel: carteira.mel,
    polen: carteira.polen,
  };
}

async function exigirPosse(idPerfil, idUsuario) {
  const perfil = await profilesRepository.buscarPorId(idPerfil);
  if (!perfil) throw erroNaoEncontrado('Perfil não encontrado');
  if (Number(perfil.user_id) !== Number(idUsuario)) throw erroAcessoNegado();
  return perfil;
}

/**
 * Atualiza o que é do perfil e o que é da conta na mesma chamada, porque para
 * quem usa a tela isso é uma coisa só: "meus dados". O apelido vai para
 * `users`, o resto para `profiles`.
 */
export async function atualizar(idPerfil, idUsuario, { apelido, avatar, fuso, minutosPorSessao }) {
  const minutosInformados = minutosPorSessao !== undefined && minutosPorSessao !== null;
  if (minutosInformados && !MINUTOS_POR_SESSAO.includes(Number(minutosPorSessao))) {
    throw erroValidacao(`Tempo por sessão inválido: ${minutosPorSessao}. Use ${MINUTOS_POR_SESSAO.join(', ')}.`);
  }

  await exigirPosse(idPerfil, idUsuario);
  const anterior = await profilesRepository.buscarDetalhadoPorUsuario(idUsuario);
  const usuarioAnterior = await usersRepository.buscarPorId(idUsuario);

  if (apelido) await usersRepository.atualizar(idUsuario, { apelido });
  await profilesRepository.atualizar(idPerfil, { avatar, fuso, minutosPorSessao });

  await auditService.registrar(auditService.usuario(idUsuario), 'perfil.atualizado', {
    entidade: 'profile',
    id: idPerfil,
    antes: { apelido: usuarioAnterior?.nickname, avatar: anterior?.avatar },
    depois: { apelido: apelido ?? usuarioAnterior?.nickname, avatar: avatar ?? anterior?.avatar },
  });

  return obterDoUsuario(idUsuario);
}

export async function remover(idPerfil, idUsuario) {
  await exigirPosse(idPerfil, idUsuario);
  await profilesRepository.remover(idPerfil);

  await auditService.registrar(auditService.usuario(idUsuario), 'perfil.removido', {
    entidade: 'profile',
    id: idPerfil,
  });
}

/**
 * Onboarding (RN-012): fecha de uma vez o apelido, o avatar, o objetivo
 * inicial, o ponto de partida do XP e os dias da semana em que o jogador
 * pretende jogar.
 *
 * Tudo numa transação porque um onboarding pela metade é pior do que nenhum: a
 * conta ficaria marcada como configurada, com o jogador caindo num painel sem
 * nível nem agenda e sem tela nenhuma para voltar e corrigir.
 *
 * A marca de concluído é gravada por último e só uma vez — o
 * `AND onboarding_completed_at IS NULL` do repository garante que reenviar o
 * formulário não reescreve a data original.
 */
export async function salvarOnboarding(idPerfil, idUsuario, { apelido, avatar, objetivo, nivel, dias = [] }) {
  // RF-ONB-03: pelo menos um dia. A tela já cobrava, o servidor não — e semana
  // vazia não é detalhe cosmético: é o que a RN-014 lê para dizer quantas metas
  // o jogador recebe, e a faixa de zero dias não existe na tabela.
  if (dias.length === 0) throw erroValidacao(ERRO_SEM_DIAS);

  await exigirPosse(idPerfil, idUsuario);

  const resultado = await emTransacao(async (conexao) => {
    if (apelido) await usersRepository.atualizar(idUsuario, { apelido }, conexao);
    await profilesRepository.atualizar(idPerfil, { avatar, objetivoInicial: objetivo }, conexao);

    const nivelInicial = await levelsService.definirPontoDePartida(conexao, idUsuario, nivel);
    const diasMarcados = await schedulesService.definirSemana(conexao, idUsuario, dias);

    // Passo além do último: quem concluiu não tem passo pendente. Vale mesmo
    // para quem respondeu tudo de uma vez, sem passar pela gravação por passo.
    await profilesRepository.avancarPasso(idPerfil, PASSOS_DO_ONBOARDING.length, conexao);
    await usersRepository.marcarOnboardingConcluido(idUsuario, conexao);

    return { nivelInicial, diasMarcados };
  });

  await auditService.registrar(auditService.usuario(idUsuario), 'onboarding.concluido', {
    entidade: 'profile',
    id: idPerfil,
    depois: {
      apelido,
      avatar,
      objetivo,
      nivelInicial: resultado.nivelInicial.nivel,
      diasDisponiveis: resultado.diasMarcados,
    },
  });

  return { apelido, avatar, objetivo, ...resultado.nivelInicial, diasDisponiveis: resultado.diasMarcados };
}

/**
 * Grava um passo do onboarding assim que ele é respondido (RF-ONB-01) e devolve
 * o rascunho atualizado.
 *
 * Não marca a conta como configurada: isso continua sendo trabalho de
 * `salvarOnboarding`, na transação do último passo. Enquanto ela não roda, o
 * `requireOnboarding` segue barrando o app — que é o comportamento certo para
 * um onboarding pela metade, e o motivo de a marca de concluído morar em
 * `users` e não nesta coluna.
 */
export async function salvarPassoDoOnboarding(idPerfil, idUsuario, { passo, resposta }) {
  const indice = PASSOS_DO_ONBOARDING.indexOf(passo);
  if (indice < 0) throw erroValidacao(`Passo de onboarding desconhecido: ${passo}`);

  const escritor = ESCRITORES_DE_PASSO[passo];
  if (!escritor) throw erroValidacao(`O passo "${passo}" é gravado ao concluir o onboarding`);

  await exigirPosse(idPerfil, idUsuario);
  await escritor({ idUsuario, idPerfil }, resposta);
  await profilesRepository.avancarPasso(idPerfil, indice + 1);

  return obterRascunhoDoOnboarding(idUsuario);
}

/**
 * O que o wizard precisa para retomar de onde parou: em que passo o jogador
 * está e o que ele já respondeu.
 *
 * Vive fora de `obterDoUsuario` porque só a tela de onboarding usa. Pendurar a
 * agenda semanal na leitura de perfil custaria uma consulta a mais em toda
 * página do jogo para servir uma tela que o jogador vê uma vez.
 */
export async function obterRascunhoDoOnboarding(idUsuario) {
  const perfil = await profilesRepository.buscarDetalhadoPorUsuario(idUsuario);
  if (!perfil) throw erroNaoEncontrado('Perfil não encontrado');

  const [usuario, dias] = await Promise.all([
    usersRepository.buscarPorId(idUsuario),
    schedulesService.diasDisponiveis(idUsuario),
  ]);

  // Só volta o que foi respondido: campo ausente no rascunho é campo que o
  // wizard tem de perguntar de novo. Os dias saem como texto porque é assim que
  // os valores das caixas de seleção da tela são comparados.
  const respostas = {};
  if (usuario?.nickname) respostas.apelido = usuario.nickname;
  if (dias.length > 0) respostas.dias = dias.map(String);
  if (perfil.objetivo_inicial) respostas.objetivo = perfil.objetivo_inicial;
  if (perfil.avatar) respostas.avatar = perfil.avatar;

  return {
    passos: PASSOS_DO_ONBOARDING,
    passoAtual: Number(perfil.onboarding_step),
    respostas,
  };
}
