import { emTransacao } from '../config/database.js';
import { logger } from '../config/logger.js';
import * as profilesRepository from '../repositories/profilesRepository.js';
import * as usersRepository from '../repositories/usersRepository.js';
import { erroAcessoNegado, erroNaoEncontrado, erroValidacao } from '../utils/erros.js';
import * as auditService from './auditService.js';
import * as coinsService from './coinsService.js';
import * as goalPlannerService from './goalPlannerService.js';
import * as levelsService from './levelsService.js';
import * as schedulesService from './schedulesService.js';

/**
 * Regra de negócio do perfil do jogador.
 *
 * Perfil é 1:1 com usuário, então não há listagem nem seleção: cada conta tem
 * exatamente um. A divisão entre conta e perfil, no schema novo, é esta: o
 * **apelido mora na conta** (`users.nickname`, junto do e-mail e da data de
 * nascimento), e o perfil guarda como o jogo se apresenta — avatar, faixa
 * etária, objetivo inicial, fuso, duração de sessão e acessibilidade.
 */

/**
 * As durações de sessão da RN-011. O banco repete a lista em
 * `ck_profiles_session_minutes`, e é de propósito que ela apareça aqui também:
 * validador de rota é a primeira barreira, não a única, e sem esta checagem um
 * valor fora da lista chegava ao MySQL e voltava como 500 em vez de erro de
 * formulário. Se um dia virar catálogo em tabela, este é o único lugar a mudar.
 *
 * Eram três durações até a T-04.3, quando 30 e 45 minutos entraram por decisão
 * de produto — o jogador mais velho quer uma sessão de estudo inteira, e não
 * duas visitas ao app. A migration 012 abriu o CHECK e a RN-011 foi reescrita.
 */
const MINUTOS_POR_SESSAO = [5, 10, 20, 30, 45];

/**
 * Preferências de apresentação da RN-050. Cada uma é um interruptor, e o passo
 * do onboarding manda a lista das que estão ligadas — lista vazia é resposta
 * válida, e quer dizer "sem som e com as animações normais".
 */
const PREFERENCIAS = [
  { valor: 'som', rotulo: 'Quero ouvir os sons do jogo' },
  { valor: 'movimento-reduzido', rotulo: 'Prefiro menos animação na tela' },
];

/**
 * Ordem dos passos do onboarding (RF-ONB-01, RN-011).
 *
 * Duas diferenças em relação à regra escrita, ambas registradas como decisão no
 * laudo da T-04.1: a faixa etária **não** é passo, porque sai da data de
 * nascimento e não pode ser autodeclarada por quem queira mudar de regra
 * econômica (D-1); e o nível inicial **é** passo, embora a RN-011 não o preveja,
 * porque alimenta o ponto de partida do XP (D-3).
 *
 * O tempo por sessão entra na posição que a RN-011 lhe dá, logo depois dos
 * dias. As preferências de som e animação não têm posição na regra — ficam
 * antes do nível, que é o passo que fecha o onboarding.
 *
 * Esta lista é a única fonte da ordem: a coluna `profiles.onboarding_step`
 * guarda um índice dela, e a migration 011 não repete o tamanho num CHECK
 * justamente para que acrescentar um passo continue sendo mudança de código.
 */
export const PASSOS_DO_ONBOARDING = ['apelido', 'dias', 'tempo', 'objetivo', 'avatar', 'preferencias', 'nivel'];

// RF-ONB-03. A mesma recusa vale ao gravar o passo e ao concluir, então o texto
// mora num lugar só.
const ERRO_SEM_DIAS = 'Escolha pelo menos um dia da semana para jogar';

function exigirMinutosValidos(minutos) {
  if (!MINUTOS_POR_SESSAO.includes(Number(minutos))) {
    throw erroValidacao(`Tempo por sessão inválido: ${minutos}. Use ${MINUTOS_POR_SESSAO.join(', ')}.`);
  }
  return Number(minutos);
}

/**
 * Confere um slug contra o catálogo antes de gravar (DT-27).
 *
 * Até a T-04.3 avatar e objetivo eram aceitos como texto qualquer: quem
 * mandasse um slug inexistente recebia 200 e ficava com a coluna vazia, porque
 * o `COALESCE` do repository não distinguia "não existe" de "não informado". A
 * conferência mora aqui, e não no validador da rota, porque o catálogo é dado —
 * acrescentar um mascote tem de ser seed, não deploy.
 */
function exigirDoCatalogo(opcoes, valor, mensagem) {
  const escolhido = String(valor ?? '').trim();
  if (!escolhido) throw erroValidacao(mensagem);

  if (!opcoes.some((opcao) => opcao.valor === escolhido)) {
    throw erroValidacao(`${mensagem}: "${escolhido}" não está entre as opções`);
  }
  return escolhido;
}

/**
 * As opções que a tela oferece e o servidor aceita, lidas do banco.
 *
 * Vai junto do rascunho para o wizard, que até a T-04.2 trazia os slugs
 * escritos no próprio JavaScript — duas listas para manter em sincronia, e
 * nenhuma delas conferida na hora de gravar. As opções de nível ficam de fora
 * de propósito: elas não são catálogo, são a curva de XP, e quem as valida é a
 * rota de conclusão junto do `levelsService`.
 */
export async function obterCatalogoDoOnboarding() {
  const [avatares, objetivos] = await Promise.all([
    profilesRepository.listarAvatares(),
    profilesRepository.listarObjetivosIniciais(),
  ]);

  return {
    tempo: MINUTOS_POR_SESSAO.map((minutos) => ({ valor: String(minutos), rotulo: `${minutos} minutos` })),
    objetivo: objetivos.map((objetivo) => ({ valor: objetivo.slug, rotulo: objetivo.label })),
    avatar: avatares.map((avatar) => ({ valor: avatar.slug, rotulo: avatar.name, imagem: avatar.image_path })),
    preferencias: PREFERENCIAS,
  };
}

/** Lista de preferências marcadas, conferida contra o catálogo fixo da RN-050. */
function lerPreferencias(resposta) {
  const marcadas = [].concat(resposta ?? [])
    .map((item) => String(item ?? '').trim())
    .filter(Boolean);

  for (const marcada of marcadas) {
    if (!PREFERENCIAS.some((preferencia) => preferencia.valor === marcada)) {
      throw erroValidacao(`Preferência desconhecida: ${marcada}`);
    }
  }

  return {
    somAtivo: marcadas.includes('som'),
    animacaoReduzida: marcadas.includes('movimento-reduzido'),
  };
}

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
  tempo: async ({ idPerfil }, resposta) => {
    await profilesRepository.atualizar(idPerfil, { minutosPorSessao: exigirMinutosValidos(resposta) });
  },
  objetivo: async ({ idPerfil, catalogo }, resposta) => {
    const objetivo = exigirDoCatalogo(catalogo.objetivo, resposta, 'Escolha um objetivo');
    await profilesRepository.atualizar(idPerfil, { objetivoInicial: objetivo });
  },
  avatar: async ({ idPerfil, catalogo }, resposta) => {
    const avatar = exigirDoCatalogo(catalogo.avatar, resposta, 'Escolha sua abelha');
    await profilesRepository.atualizar(idPerfil, { avatar });
  },
  // Nenhuma marcada é resposta legítima: quer dizer sem som e com animação
  // normal. Por isso este passo não tem checagem de "respondeu alguma coisa".
  preferencias: async ({ idPerfil }, resposta) => {
    await profilesRepository.atualizar(idPerfil, lerPreferencias(resposta));
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
export async function atualizar(
  idPerfil,
  idUsuario,
  { apelido, avatar, fuso, minutosPorSessao, somAtivo, animacaoReduzida },
) {
  const minutosInformados = minutosPorSessao !== undefined && minutosPorSessao !== null;
  if (minutosInformados) exigirMinutosValidos(minutosPorSessao);

  await exigirPosse(idPerfil, idUsuario);

  // O avatar continua opcional aqui — esta é a tela de perfil, onde se muda uma
  // coisa de cada vez —, mas quando vem, vem conferido contra o catálogo.
  if (avatar !== undefined && avatar !== null) {
    const catalogo = await obterCatalogoDoOnboarding();
    exigirDoCatalogo(catalogo.avatar, avatar, 'Escolha sua abelha');
  }

  const anterior = await profilesRepository.buscarDetalhadoPorUsuario(idUsuario);
  const usuarioAnterior = await usersRepository.buscarPorId(idUsuario);

  if (apelido) await usersRepository.atualizar(idUsuario, { apelido });
  await profilesRepository.atualizar(idPerfil, { avatar, fuso, minutosPorSessao, somAtivo, animacaoReduzida });

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
 * inicial, o tempo por sessão, as preferências de apresentação, o ponto de
 * partida do XP e os dias da semana em que o jogador pretende jogar.
 *
 * Tudo numa transação porque um onboarding pela metade é pior do que nenhum: a
 * conta ficaria marcada como configurada, com o jogador caindo num painel sem
 * nível nem agenda e sem tela nenhuma para voltar e corrigir.
 *
 * A marca de concluído é gravada por último e só uma vez — o
 * `AND onboarding_completed_at IS NULL` do repository garante que reenviar o
 * formulário não reescreve a data original.
 */
export async function salvarOnboarding(
  idPerfil,
  idUsuario,
  { apelido, avatar, objetivo, nivel, dias = [], minutosPorSessao, preferencias },
) {
  // RF-ONB-03: pelo menos um dia. A tela já cobrava, o servidor não — e semana
  // vazia não é detalhe cosmético: é o que a RN-014 lê para dizer quantas metas
  // o jogador recebe, e a faixa de zero dias não existe na tabela.
  if (dias.length === 0) throw erroValidacao(ERRO_SEM_DIAS);

  const catalogo = await obterCatalogoDoOnboarding();
  // RF-ONB-06: o avatar é obrigatório para concluir. Conferir os dois slugs
  // aqui, antes da transação, é o que impede a conta de terminar o onboarding
  // sem mascote e sem objetivo (DT-27).
  exigirDoCatalogo(catalogo.avatar, avatar, 'Escolha sua abelha');
  exigirDoCatalogo(catalogo.objetivo, objetivo, 'Escolha um objetivo');

  const minutosInformados = minutosPorSessao !== undefined && minutosPorSessao !== null;
  if (minutosInformados) exigirMinutosValidos(minutosPorSessao);
  // Quem passou passo a passo já gravou as preferências; quem mandou tudo de
  // uma vez manda a lista aqui. Ausente quer dizer "não mexeu", e o perfil fica
  // com o padrão do banco.
  const preferenciasMarcadas = preferencias === undefined ? null : lerPreferencias(preferencias);

  await exigirPosse(idPerfil, idUsuario);

  const resultado = await emTransacao(async (conexao) => {
    if (apelido) await usersRepository.atualizar(idUsuario, { apelido }, conexao);
    await profilesRepository.atualizar(
      idPerfil,
      {
        avatar,
        objetivoInicial: objetivo,
        minutosPorSessao: minutosInformados ? Number(minutosPorSessao) : null,
        ...(preferenciasMarcadas ?? {}),
      },
      conexao,
    );

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

  // RF-ONB-07: as primeiras metas nascem aqui, conforme a RN-014.
  //
  // Fora da transação, e de propósito. O planejador lê o nível e o saldo para
  // dimensionar o alvo, e leituras feitas de outra conexão não enxergariam o que
  // esta transação ainda não confirmou — o nível inicial sairia como zero e a
  // meta nasceria errada. Como o planejador é idempotente e o painel completa o
  // plano a cada visita, uma falha aqui custa a primeira tela sem meta, não uma
  // conta quebrada: por isso ela é registrada e não derruba o onboarding, que
  // já está concluído e pago.
  let metasGeradas = 0;
  try {
    const planejadas = await goalPlannerService.garantirMetasAtivas(idUsuario);
    metasGeradas = planejadas.criadas;
  } catch (erro) {
    logger.error({ erro, idUsuario }, 'Falha ao gerar as metas iniciais do onboarding');
  }

  return {
    apelido,
    avatar,
    objetivo,
    ...resultado.nivelInicial,
    diasDisponiveis: resultado.diasMarcados,
    metasGeradas,
  };
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
  const catalogo = await obterCatalogoDoOnboarding();
  await escritor({ idUsuario, idPerfil, catalogo }, resposta);
  await profilesRepository.avancarPasso(idPerfil, indice + 1);

  return obterRascunhoDoOnboarding(idUsuario);
}

/**
 * O que o wizard precisa para retomar de onde parou: em que passo o jogador
 * está, o que ele já respondeu e quais opções existem.
 *
 * Vive fora de `obterDoUsuario` porque só a tela de onboarding usa. Pendurar a
 * agenda semanal e o catálogo na leitura de perfil custaria consultas a mais em
 * toda página do jogo para servir uma tela que o jogador vê uma vez.
 */
export async function obterRascunhoDoOnboarding(idUsuario) {
  const perfil = await profilesRepository.buscarDetalhadoPorUsuario(idUsuario);
  if (!perfil) throw erroNaoEncontrado('Perfil não encontrado');

  const [usuario, dias, catalogo] = await Promise.all([
    usersRepository.buscarPorId(idUsuario),
    schedulesService.diasDisponiveis(idUsuario),
    obterCatalogoDoOnboarding(),
  ]);

  // Só volta o que foi respondido: campo ausente no rascunho é campo que o
  // wizard tem de perguntar de novo. Os dias saem como texto porque é assim que
  // os valores das caixas de seleção da tela são comparados.
  //
  // Tempo por sessão e preferências fogem à regra por terem padrão no banco:
  // não existe "sem resposta" para eles, então voltam sempre — e o passo aparece
  // com o padrão já marcado, que é o que se quer numa pergunta de preferência.
  const respostas = {
    tempo: String(perfil.session_minutes),
    preferencias: [
      ...(perfil.is_sound_enabled ? ['som'] : []),
      ...(perfil.has_reduced_motion ? ['movimento-reduzido'] : []),
    ],
  };
  if (usuario?.nickname) respostas.apelido = usuario.nickname;
  if (dias.length > 0) respostas.dias = dias.map(String);
  if (perfil.objetivo_inicial) respostas.objetivo = perfil.objetivo_inicial;
  if (perfil.avatar) respostas.avatar = perfil.avatar;

  return {
    passos: PASSOS_DO_ONBOARDING,
    passoAtual: Number(perfil.onboarding_step),
    respostas,
    catalogo,
  };
}
