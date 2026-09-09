# Evidências de teste — T-15.5

**Data:** 2026-09-09 · **Base:** `c158d46` mais as mudanças da T-15.6 · **Requisito:** RNF-28 (cobertura),
RNF-01 e RNF-04 (tempo de resposta), RNF-05 a RNF-08 (segurança).
**Ambiente:** Node 22.22.3, MySQL 8.4.11, Brave em modo sem janela.

Este documento é o que a banca lê quando pergunta "e como vocês sabem que
funciona". Não afirma nada que não tenha saída de execução guardada ao lado: os
números abaixo vieram de duas execuções feitas nesta sessão, e as duas saídas
inteiras estão em `docs/evidencias/`.

## As duas execuções

A suíte roda de duas formas, e cada uma prova uma coisa diferente. A execução
limpa (`npm run test:db`) é a que vale para tempo, porque o cronômetro da RNF-01
só significa algo sem instrumentação. A execução com medição de cobertura
(`npm run test:cobertura`) é a que vale para a RNF-28, e nela os três testes de
tempo se declaram pulados de propósito — a instrumentação infla justamente o
número que eles cobram.

| Execução | Comando | Saída guardada | Testes | Passaram | Falharam | Pulados | Duração |
|---|---|---|---|---|---|---|---|
| Suíte completa contra banco | `npm run test:db` | `docs/evidencias/suite.txt` | 1111 | 1111 | 0 | 0 | 3 min 51 s |
| Cobertura dos services de cálculo | `npm run test:cobertura` | `docs/evidencias/cobertura.txt` | 1111 | 1108 | 0 | 3 | 3 min 53 s |

São 210 suítes em 139 arquivos, 95 de integração contra MySQL real e 44
unitários. Nenhum teste é pulado em silêncio: com `TESTES_DE_BANCO=1` a ausência
de banco vira falha, e foi assim que as duas execuções rodaram.

## Cobertura (RNF-28)

O requisito pede 100% dos services de cálculo, não um percentual global — piso de
aplicação inteira deixaria um service de mel em 60% com o total verde. A lista dos
24 services que contam mora em `scripts/cobertura.js`, e o critério de quem entra
está explicado em `docs/15-COBERTURA-DE-TESTES.md`.

| | piso do portão | medido nesta execução |
|---|---|---|
| Linha | 100% | **100,00%** |
| Ramo | 92% | **92,93%** |
| Função | 99% | **99,39%** |

Linha em 100% é o que a RNF-28 cobra e não se negocia. Ramo e função são catraca:
o número é o que a suíte alcança hoje e só sobe, com o piso um ponto abaixo do
medido de propósito, porque o runner do CI mede um pouco menos que a máquina de
quem escreve. Os ramos que faltam para 100% estão listados um a um, com o motivo,
em `docs/15-COBERTURA-DE-TESTES.md`.

## O que a suíte prova, requisito por requisito

Cada linha abaixo é um teste que passou na execução limpa e pode ser encontrado
pelo nome dentro de `docs/evidencias/suite.txt`.

| Requisito | O que é cobrado | Teste que sustenta |
|---|---|---|
| RNF-01 | Colmeia em até 2 s com jogador avançado | `a Colmeia responde dentro do teto de 2 s da RNF-01` |
| RNF-01 | Fim de partida em até 1 s | `o fechamento da partida continua dentro do teto de 1 s da RNF-01` |
| RNF-01 | Painel administrativo dentro do teto | `a página desenha as métricas e responde dentro do teto da RNF-01` |
| RNF-04 | Sem N+1: consulta não cresce com o dado | `a Colmeia não cobra mais consultas quando o jogador acumula mais dado (RNF-04)` |
| RNF-05 | Nenhum SQL concatenado | `varredura de SQL (RNF-05)` |
| RNF-06 | Toda rota valida entrada | `varredura de validação de entrada (RNF-06)` |
| RNF-07 | Escape em view e XSS armazenado | `varredura de escape em view (RNF-07)`, `XSS armazenado (RNF-07)` |
| RNF-08 | CSRF nas rotas de escrita | `CSRF (RNF-08)` |

A rastreabilidade completa, requisito por requisito até o arquivo e o teste, está
em `docs/RASTREABILIDADE.md`, que tem teste próprio contra virar ficção.

## Os prints das telas

Print tirado à mão envelhece e ninguém sabe de qual versão do código ele saiu.
Aqui a captura é um comando, `npm run evidencias`, que sobe o navegador sem
janela, entra com a conta `ana@beever.dev` do seed e fotografa cada tela pelo
endereço. Regerar é reproduzir, não refazer à mão.

As dezesseis imagens estão em `docs/evidencias/telas/`, em WebP pelo mesmo motivo
do resto da arte do projeto: em PNG o conjunto pesava 7,2 MB e agora pesa 2,6 MB.
As quatro telas mais visitadas — Colmeia, trilha, loja e cofre — têm foto também
em 1440 px, porque é nelas que a T-16.1 vai mexer e a comparação precisa existir
antes.

| Tela | Arquivo | O que a foto mostra |
|---|---|---|
| Landing | `01-landing-celular.webp` | A porta de entrada, com o aviso da RNF-35 no herói |
| Login | `02-login-celular.webp` | A entrada com a mensagem de erro genérica da RN-002 |
| Colmeia | `03-colmeia-celular.webp`, `03-colmeia-desktop.webp` | Os nove blocos: nível, mel, patrimônio, sequência, trilha, tarefas, meta, liga e atalhos |
| Trilha | `04-trilha-celular.webp`, `04-trilha-desktop.webp` | Os favos com estado, e o motivo escrito no que está travado |
| Partida | `05-celula-celular.webp` | O jogo Cofre do Tempo em rodada, com a regra do rendimento na tela |
| Loja | `06-loja-celular.webp`, `06-loja-desktop.webp` | As seis categorias, o preço em mel e o requisito de cada item |
| Cofre | `07-cofre-celular.webp`, `07-cofre-desktop.webp` | Saldo, extrato com saldo depois de cada linha, meta e projeção |
| Metas | `08-metas-celular.webp` | A meta mais próxima do vencimento com a urgência escrita |
| Conquistas | `09-conquistas-celular.webp` | As cinco escadas, com alvo e progresso no degrau travado |
| Liga | `10-liga-celular.webp` | O ranque só por apelido, com a linha do jogador marcada por palavra |
| Inventário | `11-inventario-celular.webp` | Bens e enfeites separados, com o valor de cada um |
| Privacidade | `12-privacidade-celular.webp` | A política de dados que a landing promete |

**O que o print não mostra.** A foto é da página inteira, e nela o navegador
desenha elemento fixo na altura em que a janela estava — o botão "Continuar" e o
botão de acessibilidade aparecem no meio da imagem, não colados na borda como no
celular de verdade. É artefato da captura, não defeito da tela.

## O que ainda não está provado

Esta seção existe porque a banca vai perguntar, e admitir antes vale mais do que
ser pego depois. Nada aqui é surpresa: tudo já está registrado como dívida.

O LCP em rede 4G nunca foi medido, e o roteiro para medir está em
`docs/MEDICAO-DE-PERFORMANCE.md` (DT-74). A varredura de acessibilidade prova
contraste, foco e alvo de toque por cálculo, mas o que só um leitor de tela real
revela continua fora (DT-121). O fim de partida não tem print: a comemoração é
desenhada no navegador depois de a criança responder, e fotografá-la exigiria
conduzir o jogo de fora — quem prova esse caminho é o teste de integração da
conclusão de partida. Cobertura de ramo está em 92,93% e não em 100%, com os
ramos que faltam listados no `docs/15`. E a entrega em si segue sem TLS, sem host
e sem duas réplicas de verdade (DT-114, DT-115, DT-119).

## O que esta tarefa achou

Escrever o gerador de prints custou três defeitos, e nenhum deles apareceria numa
captura feita à mão.

O primeiro estava no próprio gerador: com a sessão de login ligada, `/` e `/login`
redirecionam para a Colmeia, então os três primeiros prints saíram byte a byte
idênticos, todos da mesma tela. Tela pública passou a ser fotografada antes do
login, com os cookies limpos.

O segundo é um teto do formato. O WebP não passa de 16383 px de altura, e a
landing e a loja em escala dobrada passam disso — o navegador devolve arquivo
vazio, sem erro nenhum. Dois prints de zero byte foram gravados como se estivesse
tudo certo. Agora a escala cai quando a página é longa demais, e print vazio
virou falha em vez de arquivo silencioso.

O terceiro apareceu ao olhar as fotos. Na tela do Cofre do Tempo, a rodada 1
desenha o cabeçalho do extrato — Ciclo, Guardado, Saldo — sobre um corpo de
tabela vazio, e o gráfico fica só com a linha da meta; a criança vê títulos de
coluna sem nenhuma linha embaixo. Virou DT-125. No mesmo jogo, a regra escrita em
`src/public/js/cofre.js` monta "rende 10% neste semana", porque o nome do ciclo
vem do banco e o texto assume gênero masculino. Virou DT-124.

## Como regerar

Com o servidor de pé e o banco seedado, `npm run evidencias` refaz os dezesseis
prints. `npm run test:db > docs/evidencias/suite.txt 2>&1` e
`npm run test:cobertura > docs/evidencias/cobertura.txt 2>&1` refazem as duas
saídas. O `test/unit/evidencias.test.js` reprova este documento se ele citar
print que não existe, deixar print sem citação, ou trouxer número de cobertura
diferente do piso que o portão realmente aplica.
