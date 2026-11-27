# Auditoria da E09 — Economia

Laudo de 2026-08-25, no formato do da E08. A etapa foi auditada por quem a
escreveu, com a instrução explícita de ser cético com o próprio trabalho. Três
lacunas foram corrigidas na mesma sessão e estão marcadas abaixo; as outras
viraram dívida registrada.

## Requisitos

| Requisito | Status | Onde está / teste |
|---|---|---|
| RF-LOJ-01 saldo e patrimônio no topo | atendido e testado | `patrimonio-topo.ejs`; `telasDaEconomia.test.js` |
| RF-LOJ-02 catálogo por categoria | atendido e testado | `loja.ejs`; `telasDaEconomia.test.js` |
| RF-LOJ-03 card com comportamento explicado | atendido e testado | `item-card.ejs`; `telasDaEconomia.test.js` |
| RF-LOJ-04 / RN-032 compra transacional | atendido e testado | `purchasesService.js`; `loja.test.js`, `aceiteDaEconomia.test.js` |
| RF-LOJ-05 confirmação com impacto | atendido e testado | `confirmar-compra.ejs`; `telasDaEconomia.test.js` |
| RF-LOJ-06 / RN-033 bloqueio explicado | atendido e testado | `itemsService.js`; `loja.test.js` |
| RF-LOJ-07 upgrade com desconto | atendido e testado | `shopService.js`; `loja.test.js` |
| RF-LOJ-08 / RN-040 venda voluntária por 60% | não atendido (P1) | só `marcarComoVendido` existe — DT-53 |
| RF-LOJ-09 vitrine de destaque | não atendido (P1) | nada |
| RF-INV-01 valor pago, atual e variação | atendido e testado | `inventario.ejs`; `telasDaEconomia.test.js` |
| RF-INV-02 / RN-041 bens x cosméticos | atendido e testado | `inventoryService.js`; `telasDaEconomia.test.js` |
| RF-INV-03 renda e custo por ciclo | atendido e testado | `inventario.ejs` |
| RF-INV-04 composição do patrimônio | atendido e testado | `graficos.js`, `patrimonio-topo.ejs` |
| RF-INV-05 equipar cosmético | não atendido (P1) | `is_equipped` existe e ninguém escreve nela |
| RF-INV-06 histórico de evolução | atendido sem porta (P1) | `patrimonyService.listarEvolucao` sem controller |
| RF-COF-01 depositar e sacar | atendido e testado | `vaultService.js`; `cofre.test.js` |
| RF-COF-02 / RN-042 / RN-043 rendimento com extrato | atendido e testado | `aplicarRendimento`; `aceiteDaEconomia.test.js` |
| RF-COF-03 / RN-044 meta com valor e prazo | parcial | o prazo não vence (DT-58) e o campo não vem preenchido (DT-62) |
| RF-COF-04 projeção | atendido e testado | `projetar`; `telasDaEconomia.test.js` |
| RN-034 / RN-035 comportamentos por ciclo | atendido e testado | `economicCycleService.js`; `cicloEconomico.test.js` |
| RN-036 ciclo preguiçoso e idempotente | atendido e testado | UNIQUE `(user_id, cycle_number)`; `aceiteDaEconomia.test.js` |
| RN-037 inadimplência e venda por 50% | atendido e testado | `cobrarCustoFixo`, `venderInadimplentesVencidas` |
| RN-038 Faixa A sem punição | atendido e testado | `regrasEconomicasDoUsuario`; `faixaNaEconomia.test.js` |
| RN-039 patrimônio auditável | atendido e testado | `patrimonyService.js`; aceite confere no centavo |
| RN-045 favo com patrimônio mínimo | atendido e testado | `contentService.js` |
| RF-HOM-09 aviso do ciclo | atendido e testado | `avisoDosCiclos`; `avisoDoCiclo.test.js` |

## O que estava certo

Nenhuma SQL fora de repository, nenhum `<%- %>` com dado de usuário, nenhuma cor
literal nas views, recompensa calculada só no servidor, compra e ciclo em
transação com trava no banco, ciclo repetido recusado pela UNIQUE e saldo
negativo recusado pelo CHECK. O checklist do DBA passa inteiro: a migration da
etapa só acrescenta coluna com padrão, nenhum valor monetário em ponto
flutuante, e `db:reconcile` fecha os quatro livros.

## Lacunas corrigidas na mesma sessão

A página `/cofre` não validava a query enquanto a rota JSON validava, o que foi
confirmado com o servidor de pé: `?porSemana=abc` respondia 200 com a projeção
inteira escrita como `NaN`, e valores negativos ou absurdos passavam direto. A
página passou a usar a mesma regra da rota JSON, e o caso virou teste. Junto
dela foram fechadas duas do checklist visual: dois botões do cofre usavam
contorno preto, proibido pela seção 8 do design system, e passaram a marcar
profundidade por sombra; e os números de dinheiro das quatro telas, que não
eram tabulares, passaram a ser — coluna de extrato e projeção não pode dançar a
cada dígito.

## Lacunas que viraram dívida

A auditoria do ciclo é grossa para a RN-010: seis semanas com renda, custo,
venda forçada e rendimento produzem uma linha só em `audit_logs` por visita, e o
detalhe por movimento existe apenas em `coin_ledger`. Depósito e saque não têm
chave de idempotência, então dois cliques no botão guardam duas vezes. A coluna
`is_economy_enabled` de `age_bands` é semeada e nunca lida, um interruptor
morto. O inventário calcula variação e renda vezes quantidade dentro do EJS, que
é aritmética de dinheiro numa camada que deveria só exibir. E a tela do cofre
tem quatro formulários competindo, contra a regra de uma ação principal por
tela.

## Veredito

Pode avançar. As três lacunas de conserto barato foram fechadas, o aceite da
etapa está provado em `aceiteDaEconomia.test.js` e nenhuma lacuna remanescente é
bloqueante. Fica um alerta de escopo: o estado diz "E09 concluída" enquanto
RF-LOJ-08, RF-LOJ-09 e RF-INV-05 não existem — são P1 declarados, mas o roadmap
precisa dizer isso com todas as letras antes da defesa.
