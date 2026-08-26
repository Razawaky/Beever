import { randomUUID } from 'node:crypto';

import * as achievementsService from '../services/achievementsService.js';
import * as contentService from '../services/contentService.js';
import * as goalsService from '../services/goalsService.js';
import * as homeService from '../services/homeService.js';
import * as inventoryService from '../services/inventoryService.js';
import * as profilesService from '../services/profilesService.js';
import * as schedulesService from '../services/schedulesService.js';
import * as shopService from '../services/shopService.js';
import * as streakService from '../services/streakService.js';
import * as tasksService from '../services/tasksService.js';
import * as vaultService from '../services/vaultService.js';
import { env } from '../config/env.js';
import { assincrono, erroNaoEncontrado } from '../utils/erros.js';
import { renderizarPagina } from '../utils/pagina.js';
import { querJson } from '../utils/resposta.js';

/**
 * Controller só das páginas que renderizam EJS a partir de GET simples —
 * formulário e leitura, sem mudar estado. Ações que mudam dado (login,
 * cadastro, onboarding) continuam nos controllers de domínio, que também sabem
 * redirecionar em vez de só responder JSON.
 *
 * O esqueleto da página (doctype, head, cabeçalho, rodapé) mora no layout: aqui
 * só se diz qual página, com quais dados, e o que ela tem de diferente do
 * padrão — a cor de fundo, um script, um cabeçalho.
 */

const FUNDO_CERA = 'min-h-screen bg-cera text-tinta antialiased';

function redirecionarLogado(req, res) {
  res.redirect(req.session.onboardingConcluido ? '/painel' : '/onboarding');
}

/** Política de privacidade: pública, e o e-mail de contato vem do ambiente. */
export const privacidade = (req, res) =>
  renderizarPagina(res, 'privacidade', {
    titulo: 'Política de privacidade — Beever',
    classeBody: FUNDO_CERA,
    emailDeContato: env.emailDeContato,
  });

export const login = (req, res) => {
  if (req.session?.usuarioId) return redirecionarLogado(req, res);
  renderizarPagina(res, 'login', { titulo: 'Entrar — Beever' });
};

export const cadastro = (req, res) => {
  if (req.session?.usuarioId) return redirecionarLogado(req, res);
  renderizarPagina(res, 'cadastro', {
    titulo: 'Criar conta — Beever',
    scripts: ['/js/cadastro.js'],
  });
};

// Quem pode ver esta tela é decidido pelo `requireOnboardingPendente` na rota,
// não por um `if` aqui dentro.
export const onboarding = assincrono(async (req, res) => {
  // O que já foi respondido volta do servidor, não do navegador: quem começa no
  // computador da escola precisa poder terminar em casa (decisão D-2 da T-04.1).
  const rascunho = await profilesService.obterRascunhoDoOnboarding(req.session.usuarioId);

  renderizarPagina(res, 'onboarding', {
    titulo: 'Configurar perfil — Beever',
    classeBody: 'flex min-h-screen flex-col items-center justify-center bg-cera p-4 text-tinta antialiased',
    // O wizard é montado em JavaScript e lê estes três do `dataset` do body. O
    // rascunho viaja como JSON num atributo, que o EJS escapa como qualquer
    // outro valor — a CSP não permite script embutido na página (RNF-11).
    dadosBody: {
      'perfil-id': req.session.perfilId,
      'csrf-token': res.locals.csrfToken,
      onboarding: JSON.stringify(rascunho),
    },
    scripts: ['/js/onboarding.js'],
  });
});

/**
 * A Colmeia (RF-HOM-01 a 09). O controller não orquestra nada: quem aplica os
 * efeitos da visita e monta os blocos é o `homeService`, e o mesmo endereço
 * responde JSON para quem pedir.
 */
export const painel = assincrono(async (req, res) => {
  const colmeia = await homeService.obterColmeia(req.session.usuarioId);
  if (querJson(req)) return res.json(colmeia);

  renderizarPagina(res, 'painel', {
    titulo: `${colmeia.jogador.apelido} — Beever`,
    // Sem espaço no topo, porque o cabeçalho é grudado; e folga embaixo no
    // celular, para o botão "Continuar" não tapar o fim da página.
    classeBody: 'min-h-screen bg-cera pb-28 text-tinta antialiased sm:pb-10',
    colmeia,
  });
});

export const loja = assincrono(async (req, res) => {
  const [perfil, vitrine] = await Promise.all([
    profilesService.obterDoUsuario(req.session.usuarioId),
    shopService.listarVitrine(req.session.usuarioId),
  ]);

  renderizarPagina(res, 'loja', {
    titulo: 'Loja — Beever',
    classeBody: FUNDO_CERA,
    perfil,
    vitrine,
    scripts: ['/js/graficos.js'],
  });
});

/**
 * A confirmação da compra (RF-LOJ-05) tem endereço próprio, e não um balão na
 * loja: funciona sem JavaScript, dá para voltar, e o impacto vem pronto do
 * service — a tela não faz conta nenhuma.
 */
export const confirmarCompra = assincrono(async (req, res) => {
  const [perfil, previa] = await Promise.all([
    profilesService.obterDoUsuario(req.session.usuarioId),
    shopService.previaDaCompra(req.session.usuarioId, Number(req.params.idItem)),
  ]);

  // Uma chave de idempotência por renderização: dois cliques no mesmo botão
  // mandam a mesma chave e compram uma vez só, e abrir a confirmação de novo
  // traz chave nova, então comprar o mesmo item de propósito continua possível.
  renderizarPagina(res, 'confirmar-compra', {
    titulo: `Comprar ${previa.item.name} — Beever`,
    classeBody: FUNDO_CERA,
    perfil,
    previa,
    chaveDeCompra: randomUUID(),
  });
});

export const inventario = assincrono(async (req, res) => {
  const [perfil, resumo] = await Promise.all([
    profilesService.obterDoUsuario(req.session.usuarioId),
    inventoryService.resumoDoUsuario(req.session.usuarioId),
  ]);

  renderizarPagina(res, 'inventario', {
    titulo: 'Meus itens — Beever',
    classeBody: FUNDO_CERA,
    perfil,
    resumo,
    scripts: ['/js/graficos.js'],
  });
});

export const cofre = assincrono(async (req, res) => {
  const porSemana = req.query.porSemana ? Number(req.query.porSemana) : 0;
  const [perfil, cofreDoJogador] = await Promise.all([
    profilesService.obterDoUsuario(req.session.usuarioId),
    vaultService.obterDoUsuario(req.session.usuarioId, { porSemana }),
  ]);

  renderizarPagina(res, 'cofre', {
    titulo: 'Meu cofre — Beever',
    classeBody: FUNDO_CERA,
    perfil,
    cofre: cofreDoJogador,
    porSemana,
    scripts: ['/js/graficos.js'],
  });
});

export const metas = assincrono(async (req, res) => {
  // A chegada do jogador tem uma dona só: o `homeService`. Esta tela repetia
  // cinco dos seis passos à mão, sem o ciclo econômico, e mostrava o saldo de
  // antes das contas da semana.
  await homeService.prepararVisita(req.session.usuarioId);

  const [listaDeMetas, tarefas, semana, conquistas] = await Promise.all([
    goalsService.listarDoUsuario(req.session.usuarioId),
    tasksService.listarDoUsuario(req.session.usuarioId),
    streakService.resumoDaSemana(req.session.usuarioId),
    achievementsService.listarDoUsuario(req.session.usuarioId),
  ]);

  // A meta chega resumida pelo service, como na Colmeia: percentual, prazo em
  // palavra e recompensa saem de um lugar só (RF-MET-02).
  const metasResumidas = listaDeMetas.map((meta) =>
    goalsService.resumirMeta(meta, { hoje: semana.hoje, fuso: semana.fuso }),
  );

  renderizarPagina(res, 'metas', {
    titulo: 'Metas — Beever',
    classeBody: FUNDO_CERA,
    metas: metasResumidas,
    tarefas: tarefas.map(tasksService.resumirTarefa),
    semana,
    conquistas,
  });
});

/**
 * Perfil do jogador. Existe para editar os dias da semana (RF-ONB-09); os outros
 * campos têm rota e ainda não têm tela (DT-12).
 */
export const perfil = assincrono(async (req, res) => {
  // Mesma chegada da Colmeia e da tela de metas, pelo mesmo caminho.
  await homeService.prepararVisita(req.session.usuarioId);

  const [dados, semana, metas] = await Promise.all([
    profilesService.obterDoUsuario(req.session.usuarioId),
    schedulesService.obterSemana(req.session.usuarioId),
    goalsService.listarAtivas(req.session.usuarioId),
  ]);

  renderizarPagina(res, 'perfil', {
    titulo: `${dados.apelido} — Beever`,
    classeBody: FUNDO_CERA,
    perfil: dados,
    semana,
    metas,
    dadosBody: { 'csrf-token': res.locals.csrfToken },
    scripts: ['/js/perfil.js'],
  });
});

/**
 * A trilha (RF-CON-01). O favo "atual" é o primeiro aberto e não concluído — é
 * ele que o botão "Continuar" abre.
 */
export const trilha = assincrono(async (req, res) => {
  const trilha = await contentService.listarTrilha(req.session.usuarioId);
  const favoAtual = trilha.find((favo) => favo.aberto && !favo.concluido) ?? null;
  // A trilha já está lida: passar adiante evita cobrar do banco as mesmas
  // consultas de novo (RNF-04).
  const proximaCelula = await contentService.proximaCelulaPendente(req.session.usuarioId, trilha);

  renderizarPagina(res, 'trilha', {
    titulo: 'Minha trilha — Beever',
    classeBody: 'min-h-screen bg-cera pb-28 text-tinta antialiased sm:pb-10',
    trilha,
    favoAtual,
    proximaCelula,
  });
});

/** As células de um favo (RF-CON-02). Favo travado nem lista: quem barra é o service. */
export const favo = assincrono(async (req, res) => {
  const { favo, celulas } = await contentService.listarCelulasDoFavo(req.session.usuarioId, Number(req.params.id));

  // Quem diz se a célula tem jogo é o `contentService`, célula a célula: o quiz
  // e o Arraste e Classifique existem, os outros quatro não. As demais seguem
  // com "em breve", porque prometer o que não existe é pior do que avisar que
  // não dá.
  renderizarPagina(res, 'favo', {
    titulo: `${favo.title} — Beever`,
    classeBody: FUNDO_CERA,
    favo,
    celulas,
  });
});

/**
 * Qual recorte de tela e qual JavaScript cada jogo usa.
 *
 * A casca da página é a mesma para todos; o que muda é a área do meio. O mapa
 * fica aqui, e não na view, para que o slug vindo do banco nunca vire caminho
 * de arquivo.
 */
const TELAS_DE_JOGO = {
  'quiz-do-favo': { areaDoJogo: 'quiz', script: '/js/quiz.js' },
  'arraste-e-classifique': { areaDoJogo: 'arraste', script: '/js/arraste.js' },
  'monte-o-orcamento': { areaDoJogo: 'orcamento', script: '/js/orcamento.js' },
  'cofre-do-tempo': { areaDoJogo: 'cofre', script: '/js/cofre.js' },
  'mercado-esperto': { areaDoJogo: 'mercado', script: '/js/mercado.js' },
  'ordene-a-prioridade': { areaDoJogo: 'ordene', script: '/js/ordene.js' },
};

/**
 * A tela de jogo (RF-JOG-01 e RF-JOG-02).
 *
 * A página é uma casca: ela conhece o id da célula e nada mais. Quem abre a
 * partida e recebe o conteúdo é o JavaScript do jogo, por `fetch` — assim `GET`
 * não cria partida, e atualizar a tela não deixa partida abandonada para trás.
 *
 * A conferência de acesso acontece aqui também, e não só no `POST`: quem digita
 * a URL de uma célula travada precisa ver o erro na hora, não depois de a tela
 * carregar.
 */
export const celula = assincrono(async (req, res) => {
  const { celula } = await contentService.abrirCelula(req.session.usuarioId, Number(req.params.idCelula));
  const tela = TELAS_DE_JOGO[celula.game_type_slug];

  if (!tela) throw erroNaoEncontrado('Este jogo ainda não está disponível');

  renderizarPagina(res, 'celula', {
    titulo: `${celula.title} — Beever`,
    classeBody: FUNDO_CERA,
    // Sem menu, sem saldo, sem nada clicável fora do jogo (design system §5).
    comAcessibilidade: false,
    celula,
    idFavo: Number(req.params.idFavo),
    areaDoJogo: tela.areaDoJogo,
    scripts: [tela.script],
    // Os nomes vão em kebab-case porque o navegador lê `data-celula-id` como
    // `dataset.celulaId`; escrito junto, `data-celulaId` vira `celulaid` e o
    // JavaScript não acha nada. O token de CSRF viaja aqui pelo mesmo motivo
    // que no onboarding: a partida é POST, e a página não tem formulário.
    dadosBody: {
      'celula-id': Number(celula.id),
      'favo-id': Number(req.params.idFavo),
      'csrf-token': res.locals.csrfToken,
    },
  });
});

export const manutencao = (req, res) => {
  renderizarPagina(res, 'manutencao', {
    titulo: 'Em manutenção — Beever',
    classeBody: 'flex min-h-screen flex-col items-center justify-center bg-breu p-6 text-center antialiased',
  });
};
