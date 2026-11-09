import { consultar, fecharPool } from '../src/config/database.js';
import { registrar, validar } from '../src/services/logBlockchainService.js';

await registrar('1', 'CRIACAO_USUARIO');
await registrar('1', 'LICAO_CONCLUIDA');
await registrar('2', 'COMPRA_ITEM');

console.log('ANTES de adulterar:', await validar());

await consultar("UPDATE log_blockchain SET acao = 'ALTERADO_PELO_HACKER' ORDER BY id LIMIT 1");

console.log('DEPOIS de adulterar:', await validar());
await fecharPool();