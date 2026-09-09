# Plano para a banca — protótipo final e caminho de lançamento

**Data:** 2026-09-09 · **Escopo:** o que falta para apresentar o Beever à banca
com um protótipo no ar, e o que fica depois disso para virar produto.

Este documento é a última tarefa planejada do projeto. Ele existe porque a
pergunta "está pronto?" tem duas respostas diferentes — para a banca e para
crianças de verdade — e misturar as duas faz o time trabalhar no item errado.
A ordem abaixo é de **obrigação decrescente**: o que está em P0 impede a
apresentação, o que está em P3 melhora um produto que já foi defendido.

**Fora de escopo, por decisão do time:** tudo que dependa de parecer jurídico ou
aprovação institucional. A revisão jurídica da política de privacidade sai da
lista de trabalho e fica registrada como fato conhecido. Implementar o que a
política **promete** continua em escopo: é código, não parecer.

O que já está pronto está em `docs/25-EVIDENCIAS-DE-TESTE.md` (execuções e
prints), `docs/RASTREABILIDADE.md` (requisito → arquivo → teste) e
`docs/26-TRABALHOS-FUTUROS.md` (o que ficou de fora e por quê). Este plano só
trata do que **falta**.

---

## P0 — Sem isto não há apresentação

| # | Tarefa | Por quê | O que já existe | Aceite |
|---|---|---|---|---|
| P0.1 | Corrigir os dois defeitos visíveis do cofre | Aparecem na tela que a banca vai ver. "Rende 10% neste semana" (DT-124) e o extrato com cabeçalho sobre corpo vazio na primeira rodada (DT-125) | O partial `estado-vazio` já existe para o segundo caso | Os dois prints do cofre saem sem erro de concordância e sem tabela vazia |
| P0.2 | Subir o app numa cloud, com domínio e TLS | Fecha quatro dívidas de uma vez: TLS no proxy (DT-114, RNF-12), réplica nunca exercitada (DT-115), imagem nunca publicada (DT-116, RNF-40) e backup que nunca rodou em host (DT-119, RNF-19) | `Dockerfile` multi-stage, `docker-compose.yml` e o job `imagem` do CI, que já constrói e prova que a imagem sobe | O endereço público abre em HTTPS, o cookie de sessão sai com `Secure`, e o backup roda uma vez de verdade no host |
| P0.3 | Ensaiar a instalação do zero seguindo só o manual | É o maior risco do dia, e a auditoria da E15 registrou que ninguém nunca fez isso | `docs/24-MANUAL-DE-INSTALACAO-E-EXECUCAO.md`, canônico e coberto por teste | Alguém que não escreveu o projeto sobe tudo do clone limpo, cronometrado, sem pedir ajuda |
| P0.4 | Seed de demonstração com história | Hoje a conta de exemplo está em nível 1, zero dias seguidos, liga vazia e dois favos: a tela conta que o app está vazio, não que ele funciona | `scripts/seed.js` já monta o mundo; falta o jogador com passado | Três contas em estágios diferentes — iniciante, intermediária e avançada — em faixas etárias distintas, mostrando ao vivo a regra econômica por faixa (RN-038) |

---

## P1 — Sem isto a defesa fica pobre

| # | Tarefa | Por quê | O que já existe | Aceite |
|---|---|---|---|---|
| P1.1 | Serviço de e-mail | É pré-requisito de três coisas ao mesmo tempo, e nenhuma delas existe sem ele | Nada; é a única frente que começa do zero | Um e-mail sai do app em produção e chega |
| P1.2 | Recuperação de senha (RF-AUT-06) | É **P1 do documento de requisitos e não tem uma linha de código**. Quem esquece a senha perde a conta, e isso vira a primeira pergunta da banca sobre operação | Depende da P1.1 | Fluxo completo com token expirável, e um teste que prova que o token vencido não entra |
| P1.3 | Segundo fator, no lugar certo | Demonstra capacidade sem prejudicar o produto: **obrigatório no painel administrativo**, onde conta invadida faz estrago real, e **opcional para o jogador**. Segundo fator obrigatório para criança de seis anos é atrito que derruba o uso | `requireAdmin` já isola o prefixo `/admin` | O administrador não entra sem o segundo fator; o jogador entra como sempre |
| P1.4 | As três telas de P1 cujo dado já está gravado | É o melhor custo-benefício do projeto: **o dado existe e nenhum controller o lê**. Some três linhas de "não atendido" da matriz que a banca folheia | Evolução do patrimônio gravada desde a E09 (RF-INV-06, DT-111), histórico de metas (RF-MET-07) e `marcarComoVendido` pronto para a venda voluntária (RF-LOJ-08, DT-53) | Os três requisitos saem de "não atendido" na matriz, com teste |
| P1.5 | Apagamento definitivo de conta (T-16.2) | É a última tarefa da E16 e o que a política de privacidade promete. É código, não parecer | `DELETE /users/:id` hoje só marca `is_active = 0` | O dado pessoal some de verdade e o agregado de auditoria fica anônimo e íntegro (RF-PER-04, RN-053) |

---

## P2 — O que faz a apresentação ser boa, e não só correta

| # | Tarefa | Por quê | O que já existe | Aceite |
|---|---|---|---|---|
| P2.1 | Demonstrar acessibilidade ao vivo | É dos argumentos mais fortes que o projeto tem, e quase nenhum TCC mostra. Ligar daltonismo e reduzir movimento na frente da banca vale mais que qualquer slide | O painel de acessibilidade da T-11.8 já está pronto | Está no roteiro, ensaiado, e funciona no ambiente da apresentação |
| P2.2 | Abrir as telas em navegador real a 320 px e com leitor de tela | Sem isso, toda afirmação de acessibilidade continua com ressalva no laudo (DT-22 e DT-121) | A varredura automática lê o HTML servido, sem navegador | As três perguntas fora do alcance da varredura passam a ter resposta escrita |
| P2.3 | Roteiro de cinco minutos | Evita procurar tela ao vivo, que é o que faz a demonstração parecer frágil | O fluxo do usuário está desenhado no `docs/02-ROADMAP-ETAPAS.md` | Landing, entrar, Colmeia, jogar uma célula, ver as três recompensas creditadas, comprar na loja e guardar no cofre — cronometrado |
| P2.4 | Vídeo de demonstração gravado | Plano B para internet ruim no dia. Barato, e salva a apresentação | O roteiro da P2.3 | O vídeo cobre o mesmo caminho e roda sem rede |
| P2.5 | QR code para a banca abrir no celular | Mostra o mobile-first na mão deles, o que nenhum slide mostra | Depende da P0.2 | O endereço abre no celular da banca |
| P2.6 | Observabilidade mínima no host | Prova que "está no ar", em vez de afirmar | `/health` já responde | Um monitor externo consulta o `/health` e mostra histórico |

---

## P3 — Depois da defesa, para virar produto

Estas não entram no protótipo, e estão aqui para a pergunta "e daqui pra
frente?" ter resposta ordenada. O detalhe de cada frente está em
`docs/26-TRABALHOS-FUTUROS.md`.

Primeiro o que já tem dado esperando: o login do responsável, que é onde entrar
com Google faz sentido — a criança não tem conta, porque o Google exige idade
mínima que a faixa do Beever não alcança, e o responsável tem. Dele nasce o
painel do responsável, que é a frente mais barata das grandes, porque o
histórico já é confiável.

Depois a dívida que só dói com volume: a Colmeia que custa 60 consultas por
visita (DT-72) e as métricas do painel administrativo recalculadas a cada
abertura (DT-99). Nenhuma das duas dói na base do TCC.

Por último as frentes de arquitetura — SPA, aplicativo mobile e recomendação de
conteúdo —, nesta ordem e pelos motivos escritos no documento de trabalhos
futuros. A recomendação começa por medir se o sorteio atual erra, e não por
modelo.

Fora dessa fila, uma dívida de processo que atrapalha o time todo dia: a
DT-118, o `before` do arnês de teste que pendura em vez de reprovar, e que já
custou meia hora de sessão duas vezes.

---

## Como este plano vai ser conferido

O padrão da E15 vale aqui: documento de projeto não envelhece sozinho.
`test/unit/plano-da-banca.test.js` reprova requisito citado que não exista no
documento de requisitos, dívida citada que não esteja na seção 5 do
`docs/ESTADO-DO-PROJETO.md` e arquivo citado que tenha sumido do disco.

O que o teste **não** confere é se a prioridade está certa. Isso é decisão de
produto, e muda quando a data da defesa mudar.

## Referências

- `docs/01-REQUISITOS-E-REGRAS.md` — os RF/RNF/RN citados acima
- `docs/02-ROADMAP-ETAPAS.md` — as etapas E01 a E16
- `docs/24-MANUAL-DE-INSTALACAO-E-EXECUCAO.md` — a instalação que a P0.3 ensaia
- `docs/25-EVIDENCIAS-DE-TESTE.md` — o que já está provado, e o que não está
- `docs/26-TRABALHOS-FUTUROS.md` — o detalhe das frentes de P3
- `docs/27-AUDITORIA-DA-ETAPA-E15.md` — de onde vieram várias destas lacunas
- `docs/ESTADO-DO-PROJETO.md` — a dívida técnica com número e origem
