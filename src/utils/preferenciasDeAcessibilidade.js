/**
 * Ponte entre as preferências do perfil e a sessão de login.
 *
 * Som e animação reduzida são escolhas da pessoa logada: moram em `profiles`
 * (`is_sound_enabled` e `has_reduced_motion`) e são copiadas para a sessão para
 * que toda página renderize o mesmo estado sem consultar o banco de novo. O
 * painel flutuante continua guardando contraste, texto e distração no
 * navegador — esses valem para o aparelho, não para a conta.
 */

/** Chaves expostas no body para o JavaScript saber o que é gerido pelo servidor. */
export const PREFERENCIA_ANIMACAO = 'animacao-reduzida';
export const PREFERENCIA_SOM = 'sem-som';

/**
 * Copia as duas preferências do perfil para a sessão ativa.
 *
 * `perfil` pode vir do repository (snake_case) ou de um objeto já montado pelo
 * service (camelCase). Valor ausente cai no padrão do banco: som ligado e
 * animação normal.
 */
export function sincronizarPreferenciasDaSessao(req, perfil) {
  const sessao = req.session;
  if (!sessao) return;

  const animacao = perfil?.has_reduced_motion ?? perfil?.animacaoReduzida;
  const som = perfil?.is_sound_enabled ?? perfil?.somAtivo;

  sessao.animacaoReduzida = Boolean(animacao);
  sessao.somAtivo = som === undefined || som === null ? true : Boolean(som);
  if (sessao.usuarioId !== undefined) {
    sessao.preferenciasCarregadasPara = Number(sessao.usuarioId);
  }
}

/** Estado usado tanto pela view quanto pelo script do painel de acessibilidade. */
export function preferenciasDaSessao(req) {
  const sessao = req?.session ?? {};
  const logado = Boolean(sessao.usuarioId);

  return {
    logado,
    animacaoReduzida: logado && Boolean(sessao.animacaoReduzida),
    // As transições de entrada e a rolagem suave valem só para a pessoa logada
    // e desaparecem quando ela pede movimento reduzido.
    transicoesSuaves: logado && !sessao.animacaoReduzida,
    somAtivo: !logado || sessao.somAtivo !== false,
    chavesGerenciadas: logado ? [PREFERENCIA_ANIMACAO, PREFERENCIA_SOM] : [],
  };
}
