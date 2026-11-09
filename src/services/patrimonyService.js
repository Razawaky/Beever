import * as inventoryRepository from '../repositories/inventoryRepository.js';
import * as patrimonyRepository from '../repositories/patrimonyRepository.js';
import * as vaultsRepository from '../repositories/vaultsRepository.js';
import { dataDoDia } from '../utils/diaDoJogador.js';
import * as coinsService from './coinsService.js';
import * as profilesService from './profilesService.js';

/**
 * Patrimônio = mel na carteira + saldo do cofre + valor atual dos bens (RN-039).
 *
 * A soma é feita na hora, a cada chamada. Guardar o total numa coluna seria mais
 * rápido e seria a mentira mais cara de depurar: a regra pede valor auditável, e
 * auditável é o que dá para recontar. Cosmético não entra (RN-041), e quem
 * decide isso é o `counts_in_patrimony` do item, não uma lista de slugs aqui.
 */

/** A composição sempre aberta: quem só quer o número lê `total`. */
export async function obterDoUsuario(idUsuario) {
  const [carteira, cofre, bens] = await Promise.all([
    coinsService.obterCarteira(idUsuario),
    vaultsRepository.buscarPorUsuario(idUsuario),
    inventoryRepository.valorTotalEmPatrimonio(idUsuario),
  ]);

  // Quem nunca depositou não tem linha em `vaults`, e leitura não cria linha:
  // o cofre nasce no primeiro depósito.
  const composicao = {
    carteira: carteira.mel,
    cofre: Number(cofre?.balance ?? 0),
    bens,
  };
  const patrimonio = { ...composicao, total: composicao.carteira + composicao.cofre + composicao.bens };

  await guardarFotoDoDia(idUsuario, patrimonio);
  return patrimonio;
}

/**
 * A foto de `patrimony_snapshots` é para o gráfico de evolução, não para
 * responder quanto o jogador tem — quem responde isso é a soma acima.
 *
 * Grava preguiçosamente, como a sequência e o ciclo: só quando o dia ainda não
 * tem foto ou quando o total mudou desde a última. Sem isso, toda abertura da
 * loja viraria uma escrita.
 */
async function guardarFotoDoDia(idUsuario, patrimonio) {
  const fuso = await profilesService.fusoDoUsuario(idUsuario);
  const data = dataDoDia(new Date(), fuso);

  const foto = await patrimonyRepository.buscarDoDia(idUsuario, data);
  if (foto && Number(foto.total_value) === patrimonio.total) return;

  await patrimonyRepository.gravar(null, {
    idUsuario,
    data,
    carteira: patrimonio.carteira,
    cofre: patrimonio.cofre,
    itens: patrimonio.bens,
    total: patrimonio.total,
  });
}

/** As fotos mais recentes, para o gráfico de evolução (RF-INV-06). */
export async function listarEvolucao(idUsuario, limite = 30) {
  return patrimonyRepository.listarUltimas(idUsuario, limite);
}
