## 1. Visão do produto

Plataforma web gamificada que ensina educação financeira a crianças e jovens de **6 a 15 anos**, transformando conceitos abstratos (poupar, orçar, juros, ativo x passivo, patrimônio) em um loop de jogo com progressão visível.

**Loop central:** Atividades/Jogos → XP / Pontos / Mel → Loja → Inventário → Patrimônio → novas fases liberadas.

**Diferencial declarado:** não é só quiz com pontos. É uma **simulação de vida financeira**: o que a criança compra tem consequência — carro deprecia e custa manutenção, casa valoriza, negócio gera renda. O patrimônio dela é o placar real.

### 1.1 Faixas de idade (perfis de dificuldade)

| Faixa | Nome interno | Idade | Características de conteúdo |
|---|---|---|---|
| A | Explorador | 6–8 | Texto mínimo, muito ícone/áudio, moeda inteira, sem manutenção de itens, sem penalidade |
| B | Aprendiz | 9–11 | Orçamento simples, poupança com meta, primeiras noções de juros |
| C | Investidor | 12–15 | Juros compostos, ativo x passivo, renda passiva, planejamento de longo prazo |

A faixa é definida no onboarding e altera: quantidade de texto, dificuldade das atividades, mecânicas ativas e valores de recompensa.

### 1.2 Glossário (nomenclatura do produto — usar na UI e nos comentários)

| Termo UI | Conceito técnico |
|---|---|
| **Colmeia** | Home / hub do usuário |
| **Favo** | Módulo/mundo de conteúdo (bloco hexagonal) |
| **Célula** | Atividade/lição individual dentro do favo |
| **Mel** | Moeda gasta na loja (`coins`) |
| **Pólen** | Pontos de progresso de tarefas e metas (`points`) |
| **Néctar/XP** | Experiência que sobe o nível (`xp`) |
| **Sequência** | Streak, contada só nos dias escolhidos |
| **Cofre** | Poupança simulada com rendimento |
| **Patrimônio** | Carteira + Cofre + valor atual dos bens |

---

## 2. Benchmark — o que copiamos e o que adaptamos

### 2.1 Duolingo (referência principal — mecânica de engajamento)

| Mecânica Duolingo | No Beever | Prioridade |
|---|---|---|
| Trilha linear de lições com unidades | Trilha de **favos** (hexágonos) com **células** sequenciais | MVP |
| XP por lição, nível do usuário | XP + nível com barra de progresso | MVP |
| Meta diária ajustável (10/20/50 XP) | Meta diária derivada do onboarding, ajustável | MVP |
| Streak (dias consecutivos) | **Sequência apenas nos dias marcados** (adaptação nossa) | MVP |
| Streak freeze comprável | Item "Escudo de Sequência" na loja | MVP |
| Gems/lingots + loja | **Mel** + loja de patrimônio | MVP |
| Vidas/corações que travam a lição | **Substituído por sistema de estrelas** (ver RN-030) | MVP |
| Feedback imediato com som e animação | Feedback imediato + animação do mascote | MVP |
| Tela de celebração ao fim da lição | Tela de resultado: estrelas, XP, mel, pólen | MVP |
| Conquistas/badges | Conquistas por marco | P1 |
| Ligas semanais com promoção/rebaixamento | Liga semanal por pólen, sem rebaixamento humilhante | P1 |
| Revisão de erros / prática espaçada | "Revisar erros" gera célula de revisão | P1 |
| Notificações de lembrete | Lembrete só nos dias marcados | P2 |
| Personalização do mascote | Cosméticos do mascote na loja | P1 |
| Freemium / assinatura | **Fora de escopo** (TCC, sem monetização) | — |

### 2.2 Apps de educação financeira (referência secundária — mecânica pedagógica)

| Mecânica de mercado (Greenlight, GoHenry, Zogo, Mydoh, RoosterMoney) | No Beever | Prioridade |
|---|---|---|
| Cofrinhos com meta e prazo ("savings goals") | **Cofre** com meta, prazo e rendimento simulado | MVP |
| Divisão Gastar / Guardar / Doar | Divisão de mel em Carteira / Cofre / Doação | P1 |
| Tarefas que geram mesada | **Tarefas** (Task) que geram mel/pólen | MVP |
| Micro-lições + quiz valendo recompensa (Zogo) | Células curtas (2–4 min) valendo mel | MVP |
| Visualizador de juros compostos | Jogo "Cofre do Tempo" + gráfico simples | MVP |
| Simulador de orçamento mensal | Jogo "Monte o Orçamento" | MVP |
| Comparação de preços / custo-benefício | Jogo "Mercado Esperto" | P1 |
| Educação sobre investimento sem dinheiro real | Itens que geram renda passiva na loja | MVP |
| Painel do responsável | Fora do MVP, **modelado no banco** para depois | P2 |
| Cartão/dinheiro real | **Fora de escopo permanente** (simulação apenas) | — |

### 2.3 Inovação do Beever (o que justifica o TCC)

1. **Patrimônio como placar.** O jogador não persegue pontos — persegue patrimônio. O placar de sucesso é o mesmo indicador que um adulto usa.
2. **Consequência econômica nos itens.** Carro deprecia e cobra manutenção. Casa valoriza. Barraquinha de limonada gera renda. A criança descobre sozinha a diferença entre **ativo** e **passivo** ao ver o saldo mudar.
3. **Metas adaptadas à disponibilidade real.** Menos dias livres = menos metas, mais longas e mais valiosas. Mais dias = mais metas curtas. O app se ajusta à vida da criança, não o contrário.
4. **Sequência justa.** A sequência só é avaliada nos dias em que o usuário disse que poderia entrar. Elimina a culpa que faz criança abandonar app.
5. **Progressão por patrimônio.** Alguns favos exigem patrimônio mínimo ou item específico — poupar é pré-requisito para avançar, não um botão opcional.

---

## 3. Regras de Negócio (RN)

### 3.1 Recompensas

- **RN-001** Existem três recompensas independentes que **nunca** se convertem entre si: **XP** (nível), **Pólen/pontos** (progresso de tarefas e metas) e **Mel/moedas** (poder de compra).
- **RN-002** XP nunca é gasto nem perdido; apenas acumula.
- **RN-003** O nível é derivado do XP acumulado por tabela versionada em banco (`levels`), não por fórmula no código. Referência inicial: nível *n* exige `100 * n^1.5` XP arredondado para a dezena.
- **RN-004** Mel nunca fica negativo. Toda operação de débito valida saldo antes e é atômica (transação).
- **RN-005** Valores monetários do jogo são inteiros (unidades de mel). Nunca `FLOAT`.
- **RN-006** Todo valor de recompensa vem de configuração em banco (por tipo de atividade e faixa de idade), nunca *hardcoded* no service.
- **RN-007** O cálculo de recompensa acontece **exclusivamente no servidor**, a partir do que foi registrado na `game_session`. O cliente envia respostas, nunca pontuação.
- **RN-008** Repetir uma célula já concluída: XP reduzido a 25% e **zero mel**. Impede farming.
- **RN-009** Cada conclusão de sessão de jogo carrega um token único; a mesma sessão nunca credita duas vezes (idempotência).
- **RN-010** Toda alteração de XP, pólen, mel, compra e ação administrativa gera linha em `audit_logs` com ator, ação, estado antes/depois e timestamp.

### 3.2 Onboarding e metas

- **RN-011** O onboarding coleta, nesta ordem: apelido → faixa de idade → **dias da semana disponíveis** → tempo por sessão (5/10/20/30/45 min) → objetivo inicial ("quero comprar algo", "quero aprender a guardar", "quero entender juros") → escolha do mascote/cor.
  - *Alterações registradas na T-04.3:* as durações de sessão eram 5, 10 e 20 minutos; 30 e 45 entraram por decisão de produto, para o jogador mais velho que quer uma sessão de estudo inteira em vez de duas visitas ao app. A migration `012_session_minutes_opcoes.sql` abriu o CHECK do banco.
  - *Ressalva de implementação, decidida no laudo da T-04.1:* a **faixa de idade não é passo do wizard** — ela é derivada da data de nascimento no cadastro, porque decide regra econômica (RN-038) e segmentação de conteúdo (RN-029) e não pode ser autodeclarada. O **nível inicial** é passo, embora esta regra não o preveja, porque define o ponto de partida do XP.
- **RN-012** O onboarding é obrigatório e bloqueante: usuário sem onboarding completo é redirecionado para ele em qualquer rota autenticada.
- **RN-013** A disponibilidade é editável depois no perfil. Ao editar, as metas ativas são **recalculadas sem perder progresso já feito**.
- **RN-014** Geração de metas conforme dias marcados (`GoalPlannerService`):

| Dias/semana | Metas ativas | Prazo | Dificuldade | Multiplicador de recompensa |
|---|---|---|---|---|
| 1–2 | 1 | 28 dias | Alta | 2.0× |
| 3–4 | 2 | 14 dias | Média | 1.5× |
| 5–7 | 3 | 7 dias | Simples | 1.0× |

- **RN-015** Tipos de meta possíveis: acumular X de mel; alcançar patrimônio X; concluir um favo; concluir N células; manter sequência de N dias; guardar X no cofre; atingir nível N. O planner sorteia respeitando o que o usuário já desbloqueou (nunca gera meta impossível).
- **RN-016** Meta concluída → recompensa creditada uma única vez + registro de auditoria + nova meta gerada no lugar.
- **RN-017** Meta vencida **não** é punida: entra em estado `expirada` e o app oferece renovar com prazo estendido e recompensa reduzida em 50%. Nunca remove XP, mel ou patrimônio.
- **RN-018** Sempre existe pelo menos 1 meta ativa enquanto houver conteúdo disponível.

### 3.3 Sequência (streak)

- **RN-019** A sequência avança quando o usuário concluir **pelo menos uma célula** em um dia marcado como disponível.
- **RN-020** Dia não marcado: atividade conta XP/mel normalmente, mas **não avança nem quebra** a sequência (dia neutro).
- **RN-021** A sequência quebra apenas quando um dia marcado passa sem nenhuma célula concluída — e a verificação roda na primeira requisição do usuário após a virada do dia (sem depender de cron no MVP).
- **RN-022** "Escudo de Sequência" comprado no inventário é consumido automaticamente para proteger um dia marcado perdido (máximo 2 acumulados).
- **RN-023** Marcos de sequência (7, 14, 30, 60, 100 dias) rendem mel bônus + conquista.
- **RN-024** Fuso horário do usuário definido no perfil; a virada do dia usa esse fuso, não o do servidor.

### 3.4 Conteúdo e progressão

- **RN-025** Hierarquia: **Favo** (módulo) → **Célula** (atividade) → conteúdo/jogo.
- **RN-026** Células são sequenciais dentro do favo: a próxima libera ao concluir a anterior com mínimo de 1 estrela.
- **RN-027** O favo seguinte libera ao concluir **80%** das células do favo atual.
- **RN-028** Um favo pode ter requisito extra de desbloqueio: patrimônio mínimo ou item específico do inventário (ver RN-045).
- **RN-029** Toda célula pertence a uma faixa de idade; o usuário só vê conteúdo da sua faixa e das anteriores.
- **RN-030** **Sem sistema de vidas.** A avaliação é por estrelas: 3 estrelas (0–1 erro), 2 estrelas (2–3 erros), 1 estrela (4+ erros, mas concluiu). Recompensa proporcional às estrelas. A criança nunca é bloqueada por errar.
- **RN-031** Erros são registrados por célula e alimentam uma célula de "Revisar erros" (P1).

### 3.5 Loja, inventário e patrimônio

- **RN-032** Compra debita mel, grava `price_at_purchase` (nunca recalcula pelo preço atual do item) e cria registro em `inventory`.
- **RN-033** Item pode ter requisito de compra: nível mínimo, favo concluído ou item pré-requisito (ex.: só compra "Garagem" quem tem "Casa").
- **RN-034** Todo item tem **categoria** e **comportamento econômico**:

| Comportamento | Efeito por ciclo | Exemplo |
|---|---|---|
| `neutro` | nada | Cosmético, skin |
| `valoriza` | +% no valor atual | Casa, terreno |
| `deprecia` | −% no valor atual, com piso | Carro, celular, videogame |
| `custo_fixo` | cobra mel do saldo | Carro (combustível), casa (contas) |
| `gera_renda` | credita mel no saldo | Barraquinha, colmeia de mel, loja de mel |

- **RN-035** Um item pode combinar comportamentos (carro = `deprecia` + `custo_fixo`).
- **RN-036** O **ciclo econômico** é semanal e processado de forma *lazy*: ao entrar, o sistema calcula quantos ciclos passaram desde o último processamento e aplica todos de uma vez, com log. (Evita depender de cron no MVP e mantém o app stateless.)
- **RN-037** Se o saldo não cobre o custo fixo, o item entra em `inadimplente`. Após 2 ciclos inadimplente, é **vendido automaticamente por 50%** do valor atual, com aviso na Colmeia explicando o porquê. Nunca dívida negativa.
- **RN-038** Faixa A (6–8 anos): `custo_fixo`, depreciação e inadimplência **desligados**. Só `neutro`, `valoriza` e `gera_renda`.
- **RN-039** `Patrimônio = mel na carteira + saldo do cofre + soma do valor atual dos itens do inventário`. Calculado por service (auditável), exibido na Loja, na Colmeia e no Inventário.
- **RN-040** Venda voluntária de item devolve 60% do valor atual — a criança sente o custo de decisão errada sem ser punida demais.
- **RN-041** Item cosmético não entra no patrimônio (é consumo, não bem). Deve ficar explícito na UI: "isso não aumenta seu patrimônio".

### 3.6 Cofre (poupança simulada)

- **RN-042** O usuário deposita mel no cofre; o cofre rende **2% por ciclo semanal** (configurável em banco).
- **RN-043** Saque é livre, mas o mel sacado **não rende no ciclo do saque** — ensina paciência sem travar o jogador.
- **RN-044** Cofre pode ter meta com prazo; ao bater a meta, bônus de mel.
- **RN-045** Alguns favos avançados exigem patrimônio mínimo (RN-028), o que na prática exige uso do cofre.

### 3.7 Tarefas

- **RN-046** Tarefas são compromissos curtos fora da trilha (ex.: "conclua 3 células hoje", "deposite 50 no cofre") que rendem **pólen** e mel pequeno.
- **RN-047** Tarefas diárias são geradas nos dias marcados; tarefas semanais na virada da semana. Nunca mais de 3 ativas simultaneamente.

### 3.8 Conta, perfil e administração

- **RN-048** Registro exige apelido, e-mail (do responsável, quando menor) e senha de no mínimo 8 caracteres com letras e números.
- **RN-049** Não coletamos nome completo, endereço, telefone, foto real nem localização. Apelido + avatar apenas. (LGPD, dado de criança.)
- **RN-050** Perfil é 1:1 com usuário e guarda: faixa de idade, avatar, fuso, disponibilidade, preferências de som/animação.
- **RN-051** Admin é identificado por tabela própria via join — **nunca** por coluna `role` no usuário.
- **RN-052** Admin pode: criar/editar favos, células, itens e preços; ver métricas agregadas; **nunca** alterar saldo de usuário sem registro de auditoria com justificativa.
- **RN-053** Exclusão de conta remove dados pessoais e mantém apenas registros agregados anonimizados.

---

## 4. Requisitos Funcionais (RF)

Prioridade: **M** = MVP (obrigatório para o TCC) · **P1** = depois do MVP · **P2** = desejável.

### 4.1 Autenticação — RF-AUT
| ID | Requisito | Pri |
|---|---|---|
| RF-AUT-01 | Registro com apelido, e-mail e senha, validando força mínima e e-mail único | M |
| RF-AUT-02 | Login com sessão persistida em MySQL e cookie httpOnly/secure/sameSite | M |
| RF-AUT-03 | Logout invalidando a sessão no servidor | M |
| RF-AUT-04 | Rate limiting nas rotas de login e registro | M |
| RF-AUT-05 | Middleware que bloqueia rotas privadas e redireciona para login | M |
| RF-AUT-06 | Recuperação de senha por e-mail com token expirável | P1 |

### 4.2 Onboarding — RF-ONB
| ID | Requisito | Pri |
|---|---|---|
| RF-ONB-01 | Fluxo em etapas com barra de progresso e possibilidade de voltar | M |
| RF-ONB-02 | Seleção de faixa de idade | M |
| RF-ONB-03 | Seleção dos dias da semana disponíveis (mín. 1) | M |
| RF-ONB-04 | Seleção de tempo por sessão | M |
| RF-ONB-05 | Seleção de objetivo inicial | M |
| RF-ONB-06 | Escolha de avatar/cor do mascote | M |
| RF-ONB-07 | Geração automática de metas conforme RN-014 ao concluir | M |
| RF-ONB-08 | Bloqueio de acesso ao app até concluir o onboarding | M |
| RF-ONB-09 | Edição posterior da disponibilidade com recálculo de metas | M |
| RF-ONB-10 | Célula de diagnóstico opcional que ajusta o favo inicial | P2 |

### 4.3 Colmeia / Home — RF-HOM
| ID | Requisito | Pri |
|---|---|---|
| RF-HOM-01 | Nível atual + barra de XP (atual/próximo nível) | M |
| RF-HOM-02 | Saldo de mel e valor do patrimônio | M |
| RF-HOM-03 | Sequência atual com indicação dos dias marcados da semana | M |
| RF-HOM-04 | **Meta com vencimento mais próximo**: título, % de conclusão, dias restantes e **quanto de mel ganha ao concluir** | M |
| RF-HOM-05 | Lista das outras metas ativas, resumida | M |
| RF-HOM-06 | Trilha de favos em hexágonos com estado (bloqueado / atual / concluído) | M |
| RF-HOM-07 | Botão de ação principal "Continuar" que leva à próxima célula pendente | M |
| RF-HOM-08 | Tarefas do dia | M |
| RF-HOM-09 | Aviso de evento econômico do ciclo (rendimento do cofre, custo cobrado, renda recebida, item vendido) | M |
| RF-HOM-10 | Conquistas recentes | P1 |
| RF-HOM-11 | Posição na liga semanal | P1 |

### 4.4 Conteúdo e trilha — RF-CON
| ID | Requisito | Pri |
|---|---|---|
| RF-CON-01 | Listar favos com progresso e requisitos de desbloqueio visíveis | M |
| RF-CON-02 | Listar células do favo com estado e estrelas obtidas | M |
| RF-CON-03 | Abrir célula respeitando pré-requisitos (RN-026/027/028) | M |
| RF-CON-04 | Registrar progresso por célula (tentativas, erros, estrelas, tempo) | M |
| RF-CON-05 | Tela de resultado com estrelas, XP, mel, pólen e animação do mascote | M |
| RF-CON-06 | Filtrar conteúdo por faixa de idade | M |
| RF-CON-07 | Célula de revisão gerada a partir dos erros | P1 |

### 4.5 Jogos interativos — RF-JOG
Todos em JS puro na página, cálculo validado no servidor.

| ID | Jogo | O que ensina | Pri |
|---|---|---|---|
| RF-JOG-01 | **Quiz do Favo** — múltipla escolha com feedback imediato | Conceitos base | M |
| RF-JOG-02 | **Arraste e Classifique** — arrastar cartas para caixas (necessidade x desejo, receita x despesa, ativo x passivo) | Categorização financeira | M |
| RF-JOG-03 | **Monte o Orçamento** — distribuir uma mesada entre categorias respeitando regras | Orçamento e trade-off | M |
| RF-JOG-04 | **Cofre do Tempo** — decidir quanto guardar e ver o rendimento crescer em gráfico | Juros compostos | M |
| RF-JOG-05 | **Mercado Esperto** — escolher o melhor custo-benefício comparando preço/quantidade | Consumo consciente | P1 |
| RF-JOG-06 | **Ordene a Prioridade** — ranquear gastos por urgência/importância | Priorização | P1 |
| RF-JOG-07 | Estado de jogo salvo para retomar sessão interrompida | P1 |
| RF-JOG-08 | Contrato único de resultado de jogo (`GameSession`) usado por todos os jogos | M |

### 4.6 Metas — RF-MET
| ID | Requisito | Pri |
|---|---|---|
| RF-MET-01 | Gerar metas conforme disponibilidade (RN-014) | M |
| RF-MET-02 | Listar metas ativas com % e prazo | M |
| RF-MET-03 | Atualizar progresso automaticamente a cada evento relevante | M |
| RF-MET-04 | Creditar recompensa ao concluir, uma única vez | M |
| RF-MET-05 | Marcar meta como expirada e oferecer renovação (RN-017) | M |
| RF-MET-06 | Recalcular metas quando a disponibilidade muda | M |
| RF-MET-07 | Histórico de metas concluídas | P1 |

### 4.7 Sequência — RF-SEQ
| ID | Requisito | Pri |
|---|---|---|
| RF-SEQ-01 | Avaliar e atualizar sequência conforme RN-019 a RN-021 | M |
| RF-SEQ-02 | Exibir calendário semanal com dias marcados, cumpridos e perdidos | M |
| RF-SEQ-03 | Consumir Escudo de Sequência automaticamente | M |
| RF-SEQ-04 | Bônus e conquista nos marcos | M |

### 4.8 Loja — RF-LOJ
| ID | Requisito | Pri |
|---|---|---|
| RF-LOJ-01 | Exibir, sempre visível no topo: **saldo de mel** e **valor do patrimônio** | M |
| RF-LOJ-02 | Catálogo por categoria (Moradia, Transporte, Tecnologia, Negócios, Cosméticos, Utilitários) | M |
| RF-LOJ-03 | Card do item com preço, categoria, comportamento econômico explicado em linguagem infantil e requisitos | M |
| RF-LOJ-04 | Comprar item com validação de saldo e requisitos, em transação | M |
| RF-LOJ-05 | Confirmação antes da compra mostrando o impacto ("seu patrimônio vai para X, você vai pagar Y por semana") | M |
| RF-LOJ-06 | Bloquear item indisponível mostrando o que falta | M |
| RF-LOJ-07 | Upgrades de item (Casa pequena → média → grande) com desconto pelo item anterior | M |
| RF-LOJ-08 | Vender item do inventário por 60% (RN-040) | P1 |
| RF-LOJ-09 | Vitrine de destaque e "quase dá pra comprar" (item mais próximo do saldo) | P1 |

### 4.9 Inventário e patrimônio — RF-INV
| ID | Requisito | Pri |
|---|---|---|
| RF-INV-01 | Listar itens do usuário com valor pago, valor atual e variação | M |
| RF-INV-02 | Separar visualmente: Bens (entram no patrimônio) x Cosméticos (não entram) | M |
| RF-INV-03 | Mostrar itens que geram renda e itens que custam por ciclo | M |
| RF-INV-04 | Composição do patrimônio (carteira / cofre / bens) com gráfico simples | M |
| RF-INV-05 | Equipar cosmético no mascote | P1 |
| RF-INV-06 | Histórico de evolução do patrimônio | P1 |

### 4.10 Cofre — RF-COF
| ID | Requisito | Pri |
|---|---|---|
| RF-COF-01 | Depositar e sacar mel | M |
| RF-COF-02 | Aplicar rendimento por ciclo com extrato | M |
| RF-COF-03 | Criar meta de cofre com valor e prazo | M |
| RF-COF-04 | Projeção visual ("se você guardar X por semana, em N semanas terá Y") | M |

### 4.11 Tarefas — RF-TAR
| ID | Requisito | Pri |
|---|---|---|
| RF-TAR-01 | Gerar tarefas diárias nos dias marcados e semanais na virada | M |
| RF-TAR-02 | Listar, atualizar progresso e concluir com recompensa | M |

### 4.12 Perfil — RF-PER
| ID | Requisito | Pri |
|---|---|---|
| RF-PER-01 | Ver e editar apelido, avatar, fuso e disponibilidade | M |
| RF-PER-02 | Estatísticas: nível, XP total, células concluídas, maior sequência, patrimônio | M |
| RF-PER-03 | Preferências de som e de animação reduzida | M |
| RF-PER-04 | Excluir conta | P1 |

### 4.13 Conquistas e liga — RF-GAM
| ID | Requisito | Pri |
|---|---|---|
| RF-GAM-01 | Conquistas por marco (sequência, patrimônio, favos, jogos, poupança) | P1 |
| RF-GAM-02 | Liga semanal por pólen, com grupos e sem rebaixamento punitivo | P1 |
| RF-GAM-03 | Ranking apenas por apelido, nunca dado pessoal | P1 |

### 4.14 Administração — RF-ADM
| ID | Requisito | Pri |
|---|---|---|
| RF-ADM-01 | Login administrativo separado, verificado por join na tabela de admin | M |
| RF-ADM-02 | CRUD de favos, células e conteúdo | M |
| RF-ADM-03 | CRUD de itens, preços e comportamento econômico | M |
| RF-ADM-04 | Métricas agregadas: usuários ativos, células concluídas, itens mais comprados, retenção por dia marcado | P1 |
| RF-ADM-05 | Consulta ao log de auditoria com filtros | M |

### 4.15 Landing page — RF-LAN
| ID | Requisito | Pri |
|---|---|---|
| RF-LAN-01 | Página pública com identidade visual, seções em favo e animação de scroll | M |
| RF-LAN-02 | CTA principal para registro em todas as seções relevantes | M |
| RF-LAN-03 | Seções: herói, problema, como funciona, trilha, jogos, loja/patrimônio, sequência, para pais e escolas, FAQ, CTA final | M |
| RF-LAN-04 | Responsiva mobile-first e acessível | M |
| RF-LAN-05 | Respeita `prefers-reduced-motion` | M |

---

## 5. Requisitos Não Funcionais (RNF)

### 5.1 Desempenho
- **RNF-01** Resposta de página ≤ 2 s; interação de jogo ≤ 1 s.
- **RNF-02** Suportar no mínimo 30 usuários simultâneos com pool bem configurado.
- **RNF-03** LCP da landing ≤ 2,5 s em 4G simulado; animações a 60 fps usando apenas `transform` e `opacity`.
- **RNF-04** Nenhuma consulta N+1 nas telas de Colmeia, Loja e Inventário; usar joins ou consultas agregadas.

### 5.2 Segurança
- **RNF-05** Somente prepared statements.
- **RNF-06** Validação de entrada em todas as rotas (express-validator ou Joi).
- **RNF-07** Escape automático de EJS (`<%= %>`) para todo conteúdo de usuário.
- **RNF-08** CSRF em todas as rotas que alteram estado.
- **RNF-09** Rate limiting em autenticação, compra e conclusão de jogo.
- **RNF-10** Senha em bcrypt com cost ≥ 10; mínimo 8 caracteres com letras e números.
- **RNF-11** `helmet` com CSP; sem `unsafe-inline` no JS de produção.
- **RNF-12** Cookies httpOnly, secure, sameSite; TLS no reverse proxy.
- **RNF-13** Segredos apenas por variável de ambiente; `.env.example` versionado.
- **RNF-14** `npm audit` falha o pipeline em vulnerabilidade alta.

### 5.3 Confiabilidade e dados
- **RNF-15** Operações com saldo em transação; rollback em qualquer falha.
- **RNF-16** Idempotência garantida em crédito de recompensa e compra.
- **RNF-17** Auditoria imutável (append-only) com antes/depois.
- **RNF-18** Toda mudança de schema é migration versionada, nunca ALTER manual.
- **RNF-19** Backup do banco documentado (script + periodicidade) antes da entrega.

### 5.4 Usabilidade e acessibilidade
- **RNF-20** Mobile-first; funcional de 320 px a desktop.
- **RNF-21** Contraste mínimo AA (4,5:1 para texto). **Amarelo nunca como cor de texto sobre branco.**
- **RNF-22** Alvos de toque ≥ 44×44 px.
- **RNF-23** Navegação por teclado com foco visível; jogos de arrastar têm alternativa por clique/teclado.
- **RNF-24** Linguagem adequada à faixa: frases curtas, voz ativa, sem jargão financeiro sem explicação.
- **RNF-25** Nada depende só de cor para transmitir informação (usar ícone + texto).
- **RNF-26** `prefers-reduced-motion` desliga parallax e animações não essenciais.

### 5.5 Manutenibilidade
- **RNF-27** Camadas respeitadas sem exceção; zero SQL fora de repository.
- **RNF-28** Cobertura de testes: 100% dos services de cálculo, rotas críticas com integração.
- **RNF-29** Log estruturado (pino ou winston) com níveis; zero `console.log` em produção.
- **RNF-30** Código em JS puro ES6+, sem TypeScript no backend atual.
- **RNF-31** Commits Conventional Commits em português.
- **RNF-32** Documentação atualizada na mesma tarefa que muda o comportamento.

### 5.6 Legal / ética (obrigatório no TCC)
- **RNF-33** Coleta mínima de dados de menores conforme LGPD (Art. 14): apelido e avatar, sem dado sensível.
- **RNF-34** Consentimento de responsável no registro de menor (checkbox + e-mail do responsável no MVP).
- **RNF-35** Nenhuma transação com dinheiro real; deixar explícito na UI que a moeda é fictícia.
- **RNF-36** Sem publicidade, sem mecânica de gasto real, sem loot box aleatória paga.

### 5.7 Portabilidade e implantação
- **RNF-37** Docker multi-stage + docker-compose para dev.
- **RNF-38** App stateless (sessão em MySQL, nada em memória) para escalar horizontalmente depois.
- **RNF-39** Controllers com negociação de conteúdo (HTML ou JSON) para reuso futuro por SPA/mobile.
- **RNF-40** CI: lint + testes no PR; build e push de imagem no merge para main.

---

## 6. Catálogo inicial da Loja

Valores em mel, para calibrar depois com playtest. `V` = valoriza, `D` = deprecia, `C` = custo fixo por ciclo, `R` = gera renda, `N` = neutro.

### Moradia (valoriza — ensina bem durável)
| Item | Preço | Comportamento | Requisito |
|---|---|---|---|
| Cantinho na colmeia | 300 | V +0,5%/ciclo | — |
| Quarto próprio | 900 | V +0,7% · C 10 | Cantinho |
| Casa pequena | 2.500 | V +1% · C 30 | Nível 5 |
| Casa média | 6.000 | V +1% · C 60 | Casa pequena |
| Casa grande | 15.000 | V +1,2% · C 120 | Casa média |
| Terreno | 4.000 | V +1,5% | Nível 8 |

### Transporte (deprecia + custo — ensina passivo)
| Item | Preço | Comportamento | Requisito |
|---|---|---|---|
| Patinete | 200 | D −1% (piso 50%) | — |
| Bicicleta | 500 | D −1% · C 5 | — |
| Skate elétrico | 1.200 | D −2% · C 15 | Nível 4 |
| Moto | 3.500 | D −2% · C 40 | Nível 6 |
| Carro popular | 8.000 | D −2,5% (piso 40%) · C 90 | Nível 8 + Garagem |
| Carro esportivo | 20.000 | D −3% · C 200 | Nível 12 |
| Garagem | 1.000 | V +0,3% | Casa pequena |

### Tecnologia (deprecia rápido — ensina custo de desejo)
| Item | Preço | Comportamento |
|---|---|---|
| Fone de ouvido | 150 | D −2% |
| Celular | 1.500 | D −4% (piso 20%) |
| Tablet | 2.000 | D −3,5% |
| Videogame | 2.800 | D −3% · C 20 (assinatura) |
| Notebook | 4.500 | D −3% |

### Negócios (gera renda — ensina ativo)
| Item | Preço | Comportamento | Requisito |
|---|---|---|---|
| Barraquinha de limonada | 800 | R +40/ciclo | Nível 3 |
| Caixa de abelhas | 2.000 | R +120/ciclo · C 20 | Nível 5 |
| Loja de mel | 6.500 | R +450/ciclo · C 80 | Caixa de abelhas |
| Horta comunitária | 3.000 | R +200/ciclo · C 40 | Terreno |
| Cofrinho reforçado | 1.200 | Rendimento do cofre +1 p.p. | Nível 4 |

### Cosméticos (neutro — **não entra no patrimônio**)
Chapéu de explorador · Óculos escuros · Capa de herói · Asas brilhantes · Antenas coloridas · Skin dourada do mascote · Tema da colmeia (dia/noite/floresta) · Moldura de avatar · Emote de comemoração · Trilha sonora alternativa. Faixa 150–1.200.

### Utilitários (consumível)
| Item | Preço | Efeito |
|---|---|---|
| Escudo de Sequência | 400 | Protege 1 dia marcado perdido (máx. 2) |
| Mel Dobrado (24 h) | 500 | 2× mel por conclusão |
| Dica Extra | 100 | Elimina 1 alternativa errada no quiz |
| Passe de Revisão | 250 | Repete célula com mel valendo novamente (1×) |

---

## 7. Rastreabilidade

Toda tarefa do roadmap referencia os RF/RNF/RN que atende. Ao concluir uma etapa, o agente atualiza uma tabela `docs/RASTREABILIDADE.md` com: ID do requisito → arquivos → testes que o cobrem. Isso é material direto da defesa do TCC.