import { transporteDeEmail } from '../config/email.js';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

/**
 * Monta e envia os e-mails da aplicação. Hoje só existe o de recuperação de senha.
 * Não decide quem recebe nem gera token: isso é do passwordResetService.
 */

/** Monta o e-mail de recuperação. Só texto puro, então o apelido não precisa de escape de HTML. */
export function montarEmailDeRecuperacao({ apelido, link, validadeEmMinutos }) {
  const texto = [
    `Oi, ${apelido}!`,
    '',
    'Alguém pediu para trocar a senha da sua conta no Beever. Se foi você, abra o link abaixo e escolha uma senha nova:',
    '',
    link,
    '',
    `O link vale por ${validadeEmMinutos} minutos e só funciona uma vez.`,
    '',
    'Se não foi você, pode ignorar este e-mail: sua senha continua a mesma.',
  ].join('\n');

  return { assunto: 'Troca de senha do Beever', texto };
}

/** Envia o e-mail de recuperação para o endereço da conta. */
export async function enviarRecuperacaoDeSenha({ para, apelido, link, validadeEmMinutos }) {
  const { assunto, texto } = montarEmailDeRecuperacao({ apelido, link, validadeEmMinutos });

  const resultado = await transporteDeEmail.sendMail({
    from: env.email.remetente,
    to: para,
    subject: assunto,
    text: texto,
  });

  // O endereço fica fora do log: é dado pessoal, e o id da mensagem basta para achar o envio.
  logger.info({ idDaMensagem: resultado.messageId }, 'E-mail de recuperação de senha enviado');
}
