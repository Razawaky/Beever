# Varredura de segurança — T-14.1

**Data:** 2026-08-31 · **Suíte no fechamento:** 975 testes passando ·
**Escopo:** SQLi, XSS, CSRF, rate limit, cabeçalhos e sessão, mais o que a
varredura encontrou pelo caminho — autorização, upload e segredo em código.

## Como foi feita

Duas frentes. A estática, em `test/unit/varreduraDeCodigo.test.js`, lê o próprio
código: toda interpolação dentro de repository, toda rota de escrita, toda saída
de view sem escape e toda atribuição que pareça segredo. A dinâmica, em
`test/integration/varreduraDeSeguranca.test.js`, exercita a aplicação de verdade
pelo HTTP.

A escolha de fundo é a que separa varredura de teatro: os testes não conferem um
punhado de casos escolhidos a dedo, eles **enumeram**. A lista de rotas de
escrita é lida dos arquivos de rota, e um segundo teste compara essa lista com o
que o Express realmente montou — se um dia as duas contas divergirem, é porque a
varredura passou a olhar menos do que existe. Hoje são 36 rotas, e as 36 são
testadas uma a uma contra CSRF ausente.

## As frentes

| Frente | O que foi conferido | Evidência | Veredito |
|---|---|---|---|
| SQLi (RNF-05) | Toda interpolação dos 28 repositories foi classificada em três famílias — constante do módulo, fragmento montado internamente com `?` dentro, e número já limitado para `LIMIT`. Nenhuma recebe texto de fora | `varreduraDeCodigo.test.js` — lista fechada de expressões auditadas; interpolação nova reprova o teste | limpo |
| SQL fora de lugar | Nenhum service, controller ou middleware escreve SQL; o teste ignora comentário para não confundir menção com consulta | `varreduraDeCodigo.test.js` | limpo |
| Validação (RNF-06) | As 36 rotas de escrita têm validador; a única exceção é `POST /sessao/logout`, que não recebe nada além da sessão | `varreduraDeCodigo.test.js` | limpo |
| XSS refletido e armazenado (RNF-07) | Nenhuma view imprime dado com `<%- %>` — o único uso sem escape é `include`, que monta template. Favo cadastrado pelo painel com `<script>` e com `onerror=` chega à tela escapado | `varreduraDeCodigo.test.js`, `varreduraDeSeguranca.test.js` | limpo |
| CSRF (RNF-08) | As 36 rotas de escrita recusam com 403 sem token; token de outra sessão não vale | `varreduraDeSeguranca.test.js` | limpo, com uma observação abaixo |
| Rate limit (RNF-09) | Login e cadastro passaram a ter dois baldes: origem e credencial | `bruteForce.test.js` — 4 casos com o limite ligado | **corrigido nesta tarefa** |
| Cabeçalhos (RNF-11) | CSP sem `unsafe-inline` e sem `unsafe-eval`, `script-src 'self'`, `frame-ancestors 'none'`, `object-src 'none'`, `nosniff`, sem `X-Powered-By` | `varreduraDeSeguranca.test.js` | limpo |
| Cookie e sessão (RNF-12) | Cookie `httpOnly` e `SameSite=Lax`; `Secure` ligado só em produção, onde há TLS. O identificador da sessão muda no login, então id plantado antes não sobrevive à autenticação | `varreduraDeSeguranca.test.js` | limpo |
| Autorização | Jogadora não abre nenhuma tela administrativa e não altera perfil de outra conta | `varreduraDeSeguranca.test.js`, `seguranca.test.js` | limpo |
| Segredo em código (RNF-13) | Nenhuma senha, chave ou segredo literal em `config`, `services`, `middlewares` ou `controllers` | `varreduraDeCodigo.test.js` | limpo |
| Dependências | `npm audit` no fechamento | 0 vulnerabilidades | limpo; o portão que reprova o build é a T-14.5 |

## O que foi corrigido

**O limite de login era por endereço, e a escola inteira sai do mesmo endereço.**
Dez erros de senha somados entre alunos diferentes trancavam a turma por quinze
minutos — era a DT-24. Agora existem dois baldes: sessenta tentativas por origem,
como rede contra varredura em massa, e **cinco por e-mail tentado**, que é o que
de fato contém a força bruta contra uma conta. Acertar a senha não consome cota,
então quem sabe a própria senha nunca é barrado, e o colega de carteira continua
entrando enquanto a conta ao lado está sob ataque. A porta administrativa, que é
o alvo de maior valor, leva os dois. O `bruteForce.test.js` foi reescrito para
provar as três propriedades, inclusive a de que conta que existe e conta que não
existe respondem igual sob o mesmo tratamento.

**`normalizeEmail()` apagava pontos e sufixos `+` de endereços do Gmail.** Dois
e-mails reais e distintos colidiam no 409 de duplicado, e o endereço guardado
como prova de consentimento do responsável podia não ser o que ele digitou — era
a DT-26. Saiu das três portas (cadastro, login e login administrativo); ficou
`trim` e minúsculas, que é o suficiente para a unicidade e preserva o que a
pessoa escreveu.

**Os dois únicos pedaços de SQL montados por interpolação ganharam lista
fechada.** Nome de coluna e nome de tabela não podem virar `?`, e
`walletsRepository` os recebia por parâmetro de função privada — seguro pelos
chamadores de hoje, e sem nada que impedisse o de amanhã. Agora `COLUNAS_DE_SALDO`
e `LIVROS` recusam qualquer outro valor na hora.

## Observações que não são falha

O upload do painel é sólido e vale registrar por quê: o arquivo fica em memória,
o `sharp` reabre e reescreve em WebP — o que descarta SVG, HTML disfarçado e
poliglota —, o nome no disco é UUID gerado pelo servidor, e há teto de tamanho e
de quantidade. Nada que veio do navegador vira arquivo servível.

`POST /admin/itens` e `POST /admin/celulas` são as duas únicas rotas em que o
`requireAdmin` responde antes do CSRF: o `multer` precisa rodar primeiro para o
token chegar no corpo do formulário multipart. O token continua sendo conferido;
o que muda é a ordem, e a varredura prova que as duas também não aceitam escrita
sem credencial.

O `Secure` do cookie depende de `NODE_ENV=production` e de o proxy terminar TLS,
como manda a RNF-12. Isso é configuração de entrega, e a T-14.4 é quem fecha.

## O que esta varredura não cobre

Teste de intrusão de verdade, feito por alguém de fora. Carga e exaustão de
recurso, que são a T-14.3. Portão de dependência vulnerável no build, que é a
T-14.5. E a DT-109, que é conteúdo e não código: nenhuma regra de texto impede
uma criança de escrever "Maria Silva" no apelido que a liga publica.
