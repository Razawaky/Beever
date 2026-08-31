# Medição de carga — T-14.3

**Data:** 2026-08-31 · **Requisito:** RNF-02 (30 usuários simultâneos com pool bem
configurado) e RNF-01 (página em até 2 s).

**O número daqui vale como comparação entre configurações, não como promessa de
produção.** A medição roda numa máquina de desenvolvimento que divide processador
com o próprio MySQL; um servidor atrás de proxy se comporta diferente. O que o
laudo responde é "qual tamanho de pool aguenta trinta simultâneos", que é a
pergunta que a tarefa faz — e a resposta mudou o padrão do projeto.

## Como medir

```
npm run carga
npm run carga -- --usuarios=30 --rodadas=5
DB_POOL_LIMIT=20 npm run carga
```

`scripts/carga.js` sobe a aplicação em processo numa porta livre e fala com ela
por HTTP, então a medição inclui sessão, middleware e render — o que o jogador
espera, e não só o tempo da consulta. Cada jogador tem cookie próprio. O cadastro
das contas fica fora do cronômetro de propósito: o bcrypt do registro é caro por
definição e esconderia a disputa por conexão, que é o alvo.

A jornada medida é `/painel`, `/trilha`, `/metas` e `/loja`, nessa ordem, que é o
que uma sessão comum abre.

**Rode com `NODE_ENV=test`**, ou o limite global de requisições responde 429 antes
de o pool ser exercitado — ver o achado sobre isso abaixo.

## O que a medição mostrou

Duas cargas diferentes se escondiam sob o mesmo nome. **A primeira visita** de um
jogador é muito mais cara do que as seguintes: é ela que fecha ciclo econômico,
julga sequência, abre a liga, cria as tarefas do dia e monta o plano de metas.
Da segunda em diante quase tudo isso já está feito.

`/painel`, 30 jogadores chegando ao mesmo tempo, p95 em milissegundos:

| Pool | 1ª visita (3 execuções) | mediana | visita seguinte |
|---|---|---|---|
| 10 | 2953 · 2375 · 2103 | **2375** | ~1460 |
| 20 | 1957 · 1924 · 1882 | **1924** | ~1600 |
| 25 | 2035 | 2035 | — |
| 30 | 2488 · 2044 · 2804 | **2488** | — |
| 40 | 2283 | 2283 | ~1678 |

Duas conclusões, e a segunda é a que interessa.

**Dez conexões não davam conta da primeira visita.** Com o padrão anterior, a
mediana do p95 ficava em 2375 ms — acima do teto de 2 s da RNF-01, com trinta
crianças abrindo a Colmeia ao mesmo tempo. É exatamente o primeiro dia de uso numa
sala de aula, que é o cenário que o requisito descreve.

**Mais pool não é melhor pool.** De trinta conexões para cima o número piora: a
fila sai da aplicação e vai para dentro do MySQL, onde é mais difícil de
diagnosticar e onde cada conexão custa memória. Vinte foi o único tamanho que
ficou abaixo de 2 s nas três execuções, e é o novo padrão do projeto
(`DB_POOL_LIMIT=20`).

O restante da jornada nunca chegou perto do teto em nenhuma configuração:
`/trilha` fica em torno de 400 ms, `/metas` e `/loja` abaixo de 1 s.

## Achado fora do pool: o limite global barra uma sala de aula

A primeira execução, com os limitadores ligados, devolveu **120 respostas 429 em
600 requisições**. Não era lentidão: era o `limiteGlobal`, de 600 requisições por
IP a cada quinze minutos, batendo. Trinta crianças atrás do mesmo IP da escola,
abrindo cinco páginas cada, consomem esse teto em poucos minutos.

É a mesma família da DT-24, que a T-14.1 corrigiu para o login. O limite global
continua contando por endereço, e para uma escola isso conta a turma como se
fosse uma pessoa. Está registrado como dívida, com a saída provável sendo contar
por sessão em vez de por endereço nas rotas de leitura.

## O que entrou na suíte

`test/integration/cargaSimultanea.test.js` não é benchmark: é regressão de
concorrência, e roda em segundos. Trinta visitas simultâneas à Colmeia precisam
terminar sem erro, devolver a tela inteira, e **devolver todas as conexões ao
pool no fim** — conexão que não volta é o defeito que a carga revela, porque a
aplicação segue de pé e vai ficando mais lenta até travar de vez. O cronômetro do
arquivo se pula sob instrumentação de cobertura, pelo mesmo motivo da T-14.2.

## O que esta medição não cobre

Carga sustentada por horas, que é onde vazamento de memória aparece. Concorrência
de escrita no mesmo registro — duas crianças comprando o último item —, que é
domínio da idempotência e já tem teste próprio. E o comportamento com o MySQL em
outra máquina, onde a latência de rede entra na conta e muda o tamanho ideal do
pool.
