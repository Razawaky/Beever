# Trabalhos Futuros

**Data:** 2026-09-09 · **Tarefa:** T-15.6 · **Etapa:** E15 (Documentação do TCC)

Este documento descreve as linhas de evolução viáveis para o Beeyond,
cada uma sustentada pelas decisões arquiteturais já tomadas (seção 11 de
`docs/23-ARQUITETURA-DO-SISTEMA.md`). Nenhuma exige reescrita do backend:
os controllers já respondem JSON (RNF-39), a sessão é stateless (RNF-38) e
o banco é o único estado persistente.

---

## 1. SPA (Single Page Application)

**Contexto.** A aplicação hoje usa EJS renderizado no servidor. Cada
navegação é uma requisição completa, e o JavaScript existe só como ilhas
nos jogos e na landing. Essa escolha foi correta para o MVP — primeira
pintura sem `bundle`, escape por padrão, custo zero de build — mas o
projeto atingiu trinta telas, e a experiência de navegação entre elas
poderia ser mais fluida.

**O que já existe.** Todos os controllers executam `req.accepts(['html',
'json'])` e devolvem JSON quando o cliente pede. A RNF-39 formaliza esse
padrão. Isso significa que uma SPA pode consumir a API inteira sem
modificação no backend — a camada de视图 (views EJS) passa a ser
desnecessária, mas a camada de negócio (services + repositories) fica
intocada.

**Caminho proposto.**

- Framework leve (Preact, Solid ou Svelte) com build por Vite, mantendo o
  orçamento de JavaScript que a landing já impõe.
- Rotas SPA com histories; o token de sessão continua no cookie
  `httpOnly`, sem token JWT.
- Os jogos interativos, que já são JavaScript puro em arquivos externos,
  migrariam para componentes do framework sem mudança de validador.
- As views EJS seriam mantidas como fallback para clientes sem JavaScript
  (progressive enhancement), e removidas depois de validação em produção.

**Impacto.** Redução de latência percebida entre telas (sem
`full-page reload`), melhor experiência no celular com rede instável, e
o projeto passa a ter um front-end que atrai contribuidores familiarizados
com frameworks modernos.

---

## 2. Aplicativo Mobile Nativo

**Contexto.** O Beever é um app para crianças, e crianças usam
tablets e celulares. A landing já é mobile-first (RF-LAN-04) e a
experiência funciona em navegador, mas um app nativo traz coisas que o
navegador não entrega: notificações push para lembrar a criança de
entrar nos dias marcados, acesso offline parcial (conteúdo da célula
já baixado), e instalação na tela inicial como qualquer app de jogo.

**O que já existe.** O backend é stateless (RNF-38) e fala JSON. A
sessão mora no MySQL, não em memória. Dois dispositivos podem estar
logados ao mesmo tempo. Isso significa que um app mobile é um novo
cliente da mesma API — não um sistema novo.

**Caminho proposto.**

- Capacitor ou React Native (Expo) sobre a API existente.
- Notificações push para: lembrete de tarefas do dia, aviso de ciclo
  econômico processado, resultado da liga semanal e conquista
  desbloqueada.
- Cache local do conteúdo da célula para jogos offline; o resultado
  é enviado ao servidor quando a conexão volta, usando o mecanismo
  de idempotência que já existe (T-06.6).
- Sincronização de estado entre dispositivos via socket ou polling
  leve, aproveitando que o saldo é sempre calculado a partir do
  livro.

**Impacto.** Maior retenção (notificações), experiência nativa em
dispositivos que a maioria das crianças usa, e o projeto ganha um
capítulo adicional no TCC sobre portabilidade multiplataforma.

---

## 3. Painel do Responsável

**Contexto.** A RNF-34 já captura o e-mail do responsável no
registro de menor, e o banco modela `guardian_consents` desde a E03.
Hoje esse dado é gravado e nunca mais lido. Um painel do responsável
permitiria que o pai ou a mãe acompanhasse o progresso da criança sem
precisar logar na conta dela — que é o comportamento atual e inadequado
para o contexto de LGPD e de uso familiar.

**O que já existe.** O schema já prevê o vínculo (`guardian_consents`
com `user_id` e `guardian_email`). A Colmeia entrega nove blocos de
dados (T-10.1) que poderiam ser reutilizados com filtro por filho. A
política de privacidade em `/privacidade` já lista os dados coletados
e promete direitos do Art. 18.

**Caminho proposto.**

- Login separado para o responsável, com token próprio (não a sessão
  da criança).
- Dashboard com: progresso da trilha (favos concluídos e estrelas),
  histórico de sequência, saldo e patrimônio, tarefas cumpridas na
  semana e conquistas desbloqueadas.
- Controle de tempo de uso (a `schedules` e `session_limits` já
  existem no banco) e possibilidade de ajustar a disponibilidade
  sem logar como a criança.
- Relatório semanal em PDF gerado no servidor (SVG do gráfico de
  patrimônio + tabela de atividades), enviado por e-mail se o
  responsável optar.

**Impacto.** Fecha o ciclo de LGPD (transparência + controle do
responsável), abre o uso familiar (uma assinatura, múltiplos filhos),
e é um diferencial competitivo frente a apps de educação financeira
que tratam a criança como usuário único.

---

## 4. IA de Recomendação de Conteúdo

**Contexto.** Hoje a célula é sorteada entre as ativas do favo
(T-12.5), sem considerar o desempenho recente da criança. Uma criança
que erra muito quiz de matemática recebe a mesma probabilidade de
quiz de ciências. Recomendação de conteúdo é a camada que transforma
sorteio em personalização.

**O que já existe.** O banco acumula dados ricos: tentativas por
célula com estrelas e erros (`cell_progress`), histórico de sessões
com duração e pontuação (`game_sessions`), patrimônio e comportamento
econômico, conquistas e sequência. O `contentService` já sabe o que
está disponível e o que a criança pode abrir. O que falta é um
serviço que olhe para o histórico e sugira a próxima atividade.

**Caminho proposto.**

- Regras simples primeiro: reforçar o tipo de jogo em que a criança
  foi pior (menor média de estrelas nas últimas 5 sessões), variar
  o tipo de jogo para evitar monotonia, e priorizar células cujo
  conteúdo尚未 foi jogado quando há acervo disponível.
- Regras derivadas: se a criança consistently erra perguntas sobre
  um tema específico (inferido do `content`), sugerir células com
  conteúdo mais fácil do mesmo tema antes de avançar.
- Um endpoint `/recomendacao` que o cliente (SPA ou mobile) consulta
  antes de abrir a próxima célula, mantendo o sorteio como fallback
  quando o serviço está indisponível.
- Validação por teste A/B: metade dos usuários recebe recomendação,
  metade recebe sorteio; a métrica é melhoria na média de estrelas
  e na retenção semanal.

**Impacto.** Transforma o Beever de app com conteúdo estático para
aprendizagem adaptativa, que é o estado da arte em educação
gamificada. O backend de recompensa e progresso não muda — a IA é
uma camada consultiva que lê os mesmos livros e devolve uma
sugestão.

---

## 5. Recuperação de Senha (RF-AUT-06)

**Contexto.** A RF-AUT-06 é o único requisito P1 sem código nem
tarefa no roadmap (ver `docs/RASTREABILIDADE.md`, linha 33). Exige
serviço de e-mail, que o projeto não tem hoje. Não é blocks para a
defesa, mas é uma lacuna que qualquer usuário real encontraria no
primeiro esquecimento de senha.

**O que já existe.** O registro já grava e-mail do responsável para
menores (RNF-34). A política de privacidade em `/privacidade` lista
os dados coletados. A tabela `users` tem `email` (único) e
`password_hash`.

**Caminho proposto.**

- Tabela `password_reset_tokens` com `user_id`, `token` (hash),
  `expires_at` e `used_at`.
- Endpoint `POST /recuperar-senha` que gera token, envia e-mail com
  link e rate-limita por IP (o mesmo `ip_hash` da auditoria).
- Endpoint `POST /redefinir-senha` que valida token, exige senha
  nova com as mesmas regras do registro, e invalida todas as sessões
  ativas do usuário.
- Serviço de e-mail: nodemailer com SMTP transacional (Brevo, Mailgun
  ou SES), com variável de ambiente para credenciais e fallback para
  log em desenvolvimento.

**Impacto.** Fecha o último P1 aberto, elimina a necessidade de
reset manual de senha pelo administrador, e abre o caminho para
notificações por e-mail (ciclo processado, resultado da liga) que
os trabalhos futuros acima mencionam.

---

## Referências

- `docs/23-ARQUITETURA-DO-SISTEMA.md` — seção 2 (por que camadas),
  seção 4 (por que EJS) e seção 11 (por que escala sem reescrever)
- `docs/01-REQUISITOS-E-REGRAS.md` — RF-AUT-06 (linha 193),
  RF-LAN-04 (linha 337), RNF-39 (linha 395)
- `docs/RASTREABILIDADE.md` — linha 33 (RF-AUT-06 como candidata)
- `docs/ESTADO-DO-PROJETO.md` — seção 6 (decisões travadas)
- `docs/02-ROADMAP-ETAPAS.md` — E16 (ajustes antes da defesa)
