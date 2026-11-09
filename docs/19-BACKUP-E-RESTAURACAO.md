# Backup e restauração — T-14.6

**Data:** 2026-09-02 · **Requisito:** RNF-19 (backup do banco documentado, com
script e periodicidade, antes da entrega).

## A rotina

O backup é o `npm run db:backup`. Ele grava um dump completo em `backups/`, com
data e hora no nome, no formato `beever-AAAAMMDD-HHMM.sql`, e apaga os seus
próprios dumps com mais de sete dias. Usa o `mysqldump` da máquina quando existe
e o do contêiner do compose quando não existe, e a senha vai sempre por
`MYSQL_PWD`, nunca em argumento de processo, porque argumento é visível para
qualquer usuário do host. Ao contrário do reset e do seed, este script roda em
produção — é lá que ele importa.

A periodicidade é diária, fora do horário de uso, com retenção de sete dias, e
mora no cron do host onde a aplicação está implantada. A linha está no
`iniciar-proj.md` junto com o comando de restauração. O agendamento ficou no
host, e não como serviço do compose, porque a RNF-19 pede a rotina documentada e
o serviço extra seria mais um contêiner para operar sem nada em troca antes da
defesa.

A restauração é o `npm run db:restore -- --sim`. Sem argumento ela pega o dump
mais recente da pasta; com um nome de arquivo, pega aquele. Como ela sobrescreve
o banco, tem as mesmas guardas do reset: recusa `NODE_ENV=production` e exige a
confirmação explícita.

## O defeito que a tarefa achou, e o que ele já tinha custado

O script existia desde a E01 e nunca tinha rodado. A primeira execução real
funcionou — dump de 163 KB, 61 tabelas — e, na mesma execução, apagou o
`beever-antes-da-E01-20260817-1612.sql`, que era o dump de antes da migração da
E01 e estava citado duas vezes no estado do projeto como ponto de retorno. A
pasta `backups/` é ignorada pelo git e o arquivo não estava na lixeira: ele não
voltou.

A causa era o critério de retenção. O `ehBackupAntigo` aceitava qualquer arquivo
terminado em `.sql` com mais de sete dias, então dump automático e marco guardado
à mão tinham exatamente o mesmo destino. Na prática, todo backup que alguém
guardasse de propósito morria uma semana depois — a rotina que existe para
proteger dado apagava dado.

A correção é estreitar o critério para o que a própria rotina cria. A retenção só
encosta em nome que casa com `beever-AAAAMMDD-HHMM.sql`; qualquer outro nome é
marco de alguém e fica. O caso do dump da E01 virou teste de regressão no
`backup.test.js`.

O retorno para antes da E01 já não era caminho real na E14, com tudo migrado e a
suíte verde, então a perda não bloqueia nada. Mas as duas citações no estado do
projeto ficaram falsas e foram corrigidas.

## A prova ponta a ponta

O backup só vale se voltar, e até esta tarefa nada tinha provado que ele volta. A
conferência foi feita contra o MySQL 8.4 do compose, com o banco de
desenvolvimento cheio: 61 tabelas, 2 usuários, 37 itens.

O dump foi gerado, o `npm run db:reset -- --sim` derrubou as 61 tabelas, o banco
ficou em zero, e o `npm run db:restore -- --sim` trouxe de volta exatamente 61
tabelas, 2 usuários e 37 itens. A tabela `schema_migrations` voltou com as 23
migrations aplicadas, e o `npm run db:migrate` em seguida respondeu que não havia
nada pendente — o que importa, porque um dump que perdesse esse controle faria o
runner tentar reaplicar tudo por cima. A suíte inteira passou contra o banco
restaurado.

## O achado de lado: a suíte que travava em vez de falhar

Durante a conferência a suíte pendurou por dezoito minutos sem escrever uma linha
sequer. A causa não era lentidão: sobrava no volume do MySQL um diretório de
schema órfão, `beever_teste_monteOOrcamento`, vazio, de uma execução interrompida
em sessão anterior. O `criarBancoDeTeste` tenta criar esse schema, o MySQL
responde `ER_SCHEMA_DIR_UNKNOWN`, e no `before` do arquivo isso não virava erro:
virava espera infinita, segurando o runner inteiro. Rodado sozinho, o mesmo
arquivo falhava em 17 ms com a mensagem na tela.

O diretório foi removido e o arquivo voltou a passar. O que fica aberto é a
fragilidade: hook de teste que pendura em vez de reprovar transforma um problema
de dois segundos em vinte minutos de investigação, e num runner de CI seria
timeout sem diagnóstico nenhum.

## O que esta tarefa não prova

O cron nunca rodou em host nenhum, porque host de implantação ainda não existe: o
que está entregue é a rotina documentada e o comando que ela chama, que é o que a
RNF-19 pede. A restauração também não apaga tabela que exista no banco e não
esteja no dump, já que o `mysqldump` só emite `DROP TABLE` para o que ele mesmo
exportou — restaurar sobre um banco mais novo deixa sobra. E o backup nunca foi
exercitado com volume de dados real, só com o banco de desenvolvimento.
