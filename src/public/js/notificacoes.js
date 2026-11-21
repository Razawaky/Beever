// Notificações globais: toast para avisos, dialog nativo para falhas críticas.
//
// Este módulo não depende de biblioteca nem de script inline (a CSP é
// `script-src 'self'`). É importado por `acessibilidade.js` (telas comuns) e
// por `partida.js` (jogos), então o listener de HTMX e o wrapper de fetch entram
// em ação antes de qualquer tela pedir algo ao servidor. Toda mensagem entra
// por `textContent`: o texto vem da resposta HTTP e nunca pode virar HTML.

const TEMPO_DO_TOAST = 4000;
const MAXIMO_DE_TOASTS = 3;
const MENSAGEM_PADRAO = 'Não foi possível concluir esta ação. Tente novamente em instantes.';
const FALHA_DE_REDE = 'Não foi possível falar com o Beever. Confira sua conexão e tente de novo.';

const ROTULOS = {
  sucesso: 'Tudo certo',
  aviso: 'Atenção',
  erro: 'Erro',
  info: 'Aviso',
};

const container = document.getElementById('toast-container');
const dialogo = document.getElementById('dialogo-alerta-global');
const tituloDialogo = document.getElementById('titulo-alerta-global');
const mensagemDialogo = document.getElementById('mensagem-alerta-global');
const botaoFecharDialogo = document.getElementById('fechar-alerta-global');

function texto(candidato, padrao = MENSAGEM_PADRAO) {
  if (typeof candidato !== 'string' || !candidato.trim()) return padrao;
  // Um erro inesperado pode trazer um texto enorme do servidor; o dialog e o
  // toast precisam continuar cabendo na tela de um celular.
  return candidato.trim().slice(0, 300);
}

function tipoSeguro(tipo) {
  return Object.hasOwn(ROTULOS, tipo) ? tipo : 'info';
}

/** Notificação temporária no canto da tela. some em 4 s (RNF: menos movimento, sem animação). */
export function mostrarToast(mensagem, tipo = 'info', { titulo } = {}) {
  if (!container) return null;

  const normalizado = tipoSeguro(tipo);
  const toast = document.createElement('div');
  toast.className = `toast toast-${normalizado}`;
  toast.setAttribute('role', normalizado === 'erro' ? 'alert' : 'status');

  const tituloElemento = document.createElement('p');
  tituloElemento.className = 'toast-titulo';
  tituloElemento.textContent = texto(titulo ?? ROTULOS[normalizado], ROTULOS[normalizado]);

  const mensagemElemento = document.createElement('p');
  mensagemElemento.className = 'toast-mensagem';
  mensagemElemento.textContent = texto(mensagem);

  toast.append(tituloElemento, mensagemElemento);
  container.append(toast);

  while (container.children.length > MAXIMO_DE_TOASTS) container.firstElementChild.remove();
  window.setTimeout(() => toast.remove(), TEMPO_DO_TOAST);

  return toast;
}

/** Alerta crítico: modal nativo, foco preso, exige "Entendi" (ou Esc) para fechar. */
export function mostrarAlerta(mensagem, { titulo = 'Atenção' } = {}) {
  if (!dialogo || typeof dialogo.showModal !== 'function') {
    // Navegador antigo ainda recebe o aviso, só perde a exigência de clique.
    return mostrarToast(mensagem, 'erro', { titulo });
  }

  if (tituloDialogo) tituloDialogo.textContent = texto(titulo, 'Atenção');
  if (mensagemDialogo) mensagemDialogo.textContent = texto(mensagem);

  if (!dialogo.open) dialogo.showModal();
  botaoFecharDialogo?.focus();
  return dialogo;
}

/** Traduz o contrato `{ erro, codigo, requestId }` do errorHandler em texto humano. */
export function mensagemDeErro(dados, status) {
  const possiveis = [dados?.erro, dados?.message];
  const encontrada = possiveis.find((valor) => typeof valor === 'string' && valor.trim());
  if (encontrada) return texto(encontrada);

  if (status === 404) return 'Não encontramos o que você procurava.';
  if (status >= 500) return 'Erro interno do servidor. Tente novamente em instantes.';
  return MENSAGEM_PADRAO;
}

function eCritico(dados, status) {
  return status >= 500 || dados?.codigo === 'ERRO_INTERNO';
}

function exibirErro(mensagem, critico) {
  if (critico) mostrarAlerta(mensagem, { titulo: 'Ops, algo deu errado' });
  else mostrarToast(mensagem, 'erro');
}

/** Lê o corpo de uma resposta de erro sem engolir o corpo original do chamador. */
async function lerErroDaResposta({ status, corpo, contentType }) {
  const bruto = typeof corpo === 'string' ? corpo.trim() : '';
  const pareceJson = /application\/json/i.test(contentType ?? '') || bruto.startsWith('{');

  if (bruto && pareceJson) {
    try {
      const dados = JSON.parse(bruto);
      return { mensagem: mensagemDeErro(dados, status), critico: eCritico(dados, status) };
    } catch {
      // JSON corrompido cai no texto genérico abaixo, sem quebrar a tela.
    }
  }

  return { mensagem: mensagemDeErro(null, status), critico: status >= 500 };
}

botaoFecharDialogo?.addEventListener('click', () => dialogo?.close());
dialogo?.addEventListener('click', (evento) => {
  if (evento.target === dialogo) dialogo.close();
});

// HTMX usa XHR, não fetch. O evento existe mesmo antes da biblioteca entrar na
// página: registrar aqui evita depender de ordem de carregamento.
document.addEventListener('htmx:responseError', (evento) => {
  const xhr = evento.detail?.xhr;
  if (!xhr) return;

  lerErroDaResposta({
    status: xhr.status,
    corpo: xhr.responseText,
    contentType: xhr.getResponseHeader?.('content-type') ?? '',
  }).then(({ mensagem, critico }) => exibirErro(mensagem, critico));
});

document.addEventListener('htmx:sendError', () => mostrarToast(FALHA_DE_REDE, 'erro', { titulo: 'Erro' }));

// fetch: devolve a resposta original para quem chamou (os clients já leem o
// JSON e tratam o próprio estado). Aqui só observamos o status.
const fetchOriginal = window.fetch;
if (typeof fetchOriginal === 'function') {
  window.fetch = async function comNotificacao(...argumentos) {
    const resposta = await fetchOriginal.apply(this, argumentos);

    if (!resposta.ok) {
      try {
        const copia = resposta.clone();
        const { mensagem, critico } = await lerErroDaResposta({
          status: resposta.status,
          corpo: await copia.text(),
          contentType: resposta.headers.get('content-type') ?? '',
        });
        exibirErro(mensagem, critico);
      } catch {
        // Falha ao ler o corpo não pode virar uma segunda falha na tela.
      }
    }

    return resposta;
  };
}
