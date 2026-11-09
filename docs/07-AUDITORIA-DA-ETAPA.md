# Auditoria da E07 — Jogos interativos

**Data:** 2026-08-19 · **Commit auditado:** `8f7c737` · **Suíte:** 491 testes, zero falhas
**Veredito:** pode avançar, zero bloqueantes. Duas lacunas de risco médio (L-1 e L-2) foram corrigidas na mesma sessão; sete de risco baixo ficam abertas e estão listadas abaixo.

O aceite da etapa, escrito no `docs/02-ROADMAP-ETAPAS.md`, é curto: cada jogo roda em ≤1 s, funciona no celular, e a nota vem do servidor. Duas das três metades nunca haviam sido medidas. Esta auditoria mediu o tempo e não mediu o celular.

## O que foi conferido, e como

A conferência foi feita contra o código e contra a aplicação de pé, não contra o que o `docs/ESTADO-DO-PROJETO.md` afirma. O tempo de resposta foi medido com o servidor rodando e o usuário demo, doze repetições por jogo.

| Requisito | Situação | Onde está e onde é testado |
|---|---|---|
| RF-JOG-01 Quiz do Favo | atendido e testado | `public/js/quiz.js`, `partials/jogos/quiz.ejs` · `quizDoFavo.test.js` |
| RF-JOG-02 Arraste e Classifique | atendido e testado | `public/js/arraste.js` · `arrasteEClassifique.test.js` |
| RF-JOG-03 Monte o Orçamento | atendido e testado | `public/js/orcamento.js` · `monteOOrcamento.test.js` |
| RF-JOG-04 Cofre do Tempo | atendido e testado | `public/js/cofre.js` · `cofreDoTempo.test.js` |
| RF-JOG-05 Mercado Esperto | atendido e testado | `public/js/mercado.js` · `mercadoEsperto.test.js` |
| RF-JOG-06 Ordene a Prioridade | atendido e testado | `public/js/ordene.js` · `ordeneAPrioridade.test.js` |
| RF-JOG-07 Retomada de sessão | atendido e testado | migration 015, `saved_state` · `retomadaDePartida.test.js` |
| RF-JOG-08 Contrato único | atendido e testado | `services/validadoresDeJogo.js` · `validadoresDeJogo.test.js`, 47 casos sem banco |
| RF-CON-03 Abrir célula e jogar | atendido e testado | `contentService.abrirCelula` e `podeJogar` · `telasDaTrilha.test.js` |
| RF-CON-04 Progresso por célula | atendido e testado | `progressService`, `duration_seconds` calculado pelo banco · `sessaoDeJogo.test.js` |
| RF-CON-05 Tela de resultado | atendido e testado | `partials/jogo-resultado.ejs`, `public/js/resultado.js` · `telaDeResultado.test.js` |
| RN-007 A nota sai do servidor | atendido e testado | cinco jogos têm o caso "mandar pontuação pronta não muda nada"; o Ordene a Prioridade não tem — lacuna L-9 |
| RN-008 Repetição rende menos | atendido e testado | `reward_modifiers` · `sessaoDeJogo.test.js` |
| RN-009 Token não credita duas vezes | atendido e testado | `bloquearAbertaPorToken` com `FOR UPDATE` · `aceiteDoMotor.test.js` |
| RN-010 Auditoria do crédito | atendido e testado | `auditService.registrarRecompensa` · `auditoriaDeCreditos.test.js` |
| RNF-23 Alternativa por clique e teclado | atendido, não verificado em navegador | `arraste.js` faz os três caminhos caírem na mesma função; `ordene.js` usa setas |
| Aceite: ≤1 s por jogo | **atendido e medido** | página 17–24 ms, abrir partida 24–43 ms, fechar partida 65 ms de mediana e 110 ms de máximo. Um usuário, máquina local — não sob carga |
| Aceite: funciona no celular | **não verificado** | lacuna L-4, que é a DT-22 |

Camadas, segurança e banco foram conferidos um a um: não há SQL fora de repository, não há `<%-` com dado de usuário, a CSP é `script-src 'self'` e não existe script inline, o CSRF cobre POST, PUT e DELETE, o corpo da requisição é limitado a 100 kb, o crédito acontece dentro de `emTransacao` com `executarUmaVezSo`, e o `reward_configs` cobre os seis tipos de jogo por `CROSS JOIN` — nenhum jogo novo nasce sem valor de recompensa. Não há `console.log` em código de produção.

## As duas lacunas de risco médio, corrigidas

**L-1 — a estrela amarela era texto.** A tela de resultado pintava o caractere ★ com `text-mel` sobre fundo cera, o que dá contraste de cerca de 1,7:1. A RNF-21 e o checklist da seção 8 do design system dizem literalmente que amarelo não é cor de texto sobre fundo claro, e a tela do favo já desenhava a estrela em SVG justamente por isso. As estrelas do resultado passaram a ser desenho, com preenchimento por `currentColor`: a mesma cor que reprova como letra passa como forma. O teste da tela de resultado agora recusa `text-mel` no container das estrelas.

**L-2 — a rota de partida creditava sem limitador.** Tarefa, meta, perfil e loja carregam `limiteRecompensa` ou `limiteCompra`; a partida, que é a maior fonte de XP, pólen e mel do jogo, tinha só o limite global de 600 requisições em quinze minutos. O próprio comentário do `rateLimiters.js` define aquele limitador como o das rotas que creditam recompensa, e a partida havia ficado de fora. Abrir partida e fechar partida passaram a usá-lo. Salvar progresso ficou de fora de propósito, e é decisão registrada: ele é chamado a cada decisão do jogador — a cada toque no `+` do orçamento — e um limite de recompensa ali castigaria quem está apenas jogando. O teste novo mora em arquivo próprio e força `NODE_ENV=development`, porque os limitadores se desligam sozinhos em teste; é o mesmo caminho que o `bruteForce.test.js` já usava.

## As lacunas que ficam abertas

**L-3, risco baixo, dívida DT-37.** O `seguranca.test.js` falhou uma vez em três execuções da suíte completa e passa três de três quando roda sozinho. A causa não foi reproduzida. Teste que falha de vez em quando é pior do que teste que falha sempre, porque ensina a ignorar vermelho. O próximo passo é rodar a suíte com `--test-concurrency=1` para isolar.

**L-4, risco baixo, dívida DT-22.** Metade do aceite continua sem verificação: nenhuma tela foi aberta em navegador real. Ficam sem conferência o comportamento a 320 px, o foco de teclado visível de verdade, o gesto de arrastar com mouse e com dedo, o gráfico do cofre e as estrelas animadas.

**L-5, risco baixo.** Partida aberta em outra célula nunca é fechada. A retomada é por célula, então quem abandona a célula A pela metade e vai jogar a B deixa a A aberta para sempre. Não paga nada indevido, porque cada partida exige o próprio token, mas a tabela acumula partidas penduradas.

**L-6, risco baixo.** Falta índice `(user_id, cell_id)` em `game_sessions`. O `buscarAbertaDaCelula`, criado na T-07.7, e o `contarConcluidasNaCelula`, da E06, filtram por essas duas colunas, e o índice existente é `(user_id, started_at)`.

**L-7, risco baixo.** A migration 015 usa `ALTER TABLE ... ADD COLUMN` sem guarda de idempotência, enquanto as anteriores usam `CREATE TABLE IF NOT EXISTS`. O ledger `schema_migrations`, com checksum, garante execução única, então é inconsistência de estilo e não risco real.

**L-8, risco baixo.** Cinco células de quiz ainda têm conteúdo de demonstração. A trilha as mostra honestamente como "em breve" desde a T-07.5, mas o jogador demo esbarra nelas a partir do segundo favo. É conteúdo a escrever, não código a fazer.

**L-9, risco baixo.** O Ordene a Prioridade é o único dos seis jogos sem teste explícito da RN-007. Os outros cinco têm o caso "mandar pontuação pronta no corpo não muda nada".

**L-10, risco baixo, achado durante a correção da L-2.** O salvamento de progresso é falador demais: o orçamento grava a cada toque nos botões `−` e `+`, então uma célula de faixa C com 500 de mel e passo 10 pode gerar dezenas de requisições numa partida só. Não quebra nada e cabe no limite global, mas é desperdício. Agrupar os toques antes de salvar resolve, e é trabalho pequeno.

## Duas lições desta auditoria

A primeira: **o que não é medido não está atendido**. O aceite da etapa exigia ≤1 s desde o começo e ninguém havia cronometrado nada. A medida levou poucos minutos e o resultado passa com folga de dez vezes — mas isso só se soube agora, e podia ter sido o contrário.

A segunda: **regra escrita no projeto é a que mais escapa**. As duas lacunas de risco médio não eram descuido de engenharia, eram desvio de regra já documentada — uma do design system, outra do comentário do próprio limitador. Vale conferir o checklist visual e o de segurança contra o código, e não contra a lembrança de quem escreveu.
