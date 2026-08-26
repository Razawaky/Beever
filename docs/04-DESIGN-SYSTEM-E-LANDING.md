## 1. Seu papel

Você é o **designer front-end sênior** do produto: decide direção visual, hierarquia, tipografia, motion e microcopy, e implementa. Você não "aplica um tema": você defende uma identidade.

> **Fonte normativa:** `DESIGN.md` na raiz do projeto (e o sidecar `.impeccable/design.json`) registra o sistema visual implementado — tokens, tipografia, profundidade, formas e componentes. Este documento é o guia de intenção e de conteúdo da landing; onde os dois divergirem, o `DESIGN.md` vence e este arquivo deve ser corrigido.

Três restrições não negociáveis:
1. **A identidade visual já existe.** Mascote, paleta e logo estão definidos. Nada pode sair disso — você trabalha *dentro* da identidade, não em cima dela.
2. **O usuário final tem 6 a 15 anos.** Toda decisão passa pelo teste: "uma criança de 8 anos entende o que fazer aqui em 3 segundos?"
3. **É web multiplataforma.** Celular e computador são os dois alvos de entrega. Mobile-first é a ordem em que o layout é escrito, não permissão para entregar tela que só faz sentido no celular: acima de `md` cada tela precisa de composição própria — segunda coluna, número maior, trilha mais larga — nunca um layout de celular centralizado num fundo vazio.

**Antes de desenhar qualquer tela:** inventarie os assets reais em `src/public/img/` (mascote, logo, ícones, hexágonos). Você desenha com o material que existe. O que faltar, você lista para o usuário providenciar — **não invente asset nem substitua o mascote por emoji ou ícone genérico.**

---

## 2. A identidade

### 2.1 Paleta

| Papel | Hex | Uso |
|---|---|---|
| **Mel** (primária) | `#FFC200` | Ações principais, hexágonos ativos, cabeçalho do app |
| **Néctar** (destaque) | `#FFDE00` | Brilho, estados de sucesso, highlight, luz |
| **Âmbar** (profundidade) | `#F4B73E` | Sombra sólida dos botões, hexágonos inativos, bordas de profundidade |
| **Branco** | `#FFFFFF` | Superfície clara do app |
| **Preto** | `#000000` | Contorno de traço cartoon, texto |

Derivados permitidos (só neutros e semânticos, nunca cor de marca nova):
- Superfície clara do app: `#FFFDF7` (branco levemente quente — puro branco brilha demais ao lado do amarelo)
- Superfície escura da landing: `#111111` (não `#000000` puro — o contorno preto do mascote desapareceria)
- Texto secundário: `#4A4A4A` · Linha divisória: `#E8E2D6`
- Semânticos: acerto `#2E9E4F` · atenção `#E07A1F` · erro `#D93A3A`

### 2.2 Regras de contraste — obrigatórias

- **Amarelo é superfície, nunca cor de texto sobre fundo claro.** Amarelo sobre branco reprova em qualquer nível de WCAG.
- Texto sobre amarelo: **sempre preto ou `#1A1A1A`**.
- Texto sobre `#111111`: branco ou `#FFDE00` (esse par passa AA).
- Verificar todo par com medidor antes de fechar a tela. Mínimo 4,5:1 para texto, 3:1 para ícone informativo e para indicador de foco.
- **As cores semânticas reprovam como texto pequeno** (medido: acerto 3,43:1, atenção 3,01:1, erro 4,55:1 sobre branco — pior ainda sobre cera). Use `text-acerto-texto` (`#268044`), `text-atencao-texto` (`#9E5309`) e `text-erro-texto` (`#C42B2B`) sempre que a cor semântica virar palavra. A cor base fica para preenchimento, ícone, borda e barra.
- **Anel de foco é de dois tons:** anel preto de 2 px colado no elemento + contorno âmbar de 3 px com 2 px de deslocamento. Âmbar sozinho dá 1,77:1 sobre cera e reprova no critério 1.4.11 da WCAG 2.2 — é o anel preto que torna o foco perceptível; o âmbar é o que o torna nosso.

### 2.3 Traço e forma

> **Revisado em 2026-08-17.** A versão anterior desta seção pedia contorno preto de 2 px e sombra sólida (`0 4px 0 #F4B73E`). O usuário decidiu o contrário: **profundidade é sombra difusa suave, sem contorno**. O `DESIGN.md` na raiz é a fonte normativa da física de profundidade; esta seção segue aquela decisão.

- **Nenhum contorno preto** em botões, cards, badges ou hexágonos. O caráter vem da forma, do mel, do mascote e do movimento — não de uma linha. As únicas exceções são o traço que já existe dentro da arte da Beenie e o anel âmbar de foco, que é estado, não borda.
- **Profundidade é sombra difusa**, na escala de 4 degraus do `DESIGN.md`: repouso (card), elevado (hover / painel dominante), painel (o container principal da página), flutuante (toast). Sombra nunca substitui divisória — divisória é `#E8E2D6`.
- **Ordem de empilhamento:** página em cera (`#FFFDF7`) → card branco → sombra. A troca de cor faz a maior parte do trabalho; a sombra só confirma.
- **Cantos muito arredondados:** botões e cards `20px` (`rounded-favo`); pílulas `999px` (`rounded-pilula`); campos e linhas de lista `8px`; hexágonos com vértices levemente arredondados (`stroke-linejoin: round`).
- **Hexágono é a forma-assinatura.** Módulos, avatares, ícones de seção e molduras usam hexágono. Retângulo é só para texto corrido.
- Zero gradiente decorativo. Se precisar de luz, use `#FFDE00` como área sólida.

> Detalhe de ofício: nas seções escuras, o contorno preto do mascote se perde no fundo. Coloque o mascote sempre sobre uma forma clara (hexágono de mel, respingo de luz) ou aplique um contorno externo branco de 3 px — como adesivo. Nunca mascote preto flutuando em fundo preto.

### 2.4 Tipografia

Duas famílias, papéis distintos:

| Papel | Escolha **confirmada** (2026-08-17) |
|---|---|
| **Display** (títulos, números grandes, logo secundário) | **Lilita One** — pôster de desenho antigo, casa com o traço do mascote |
| **Corpo / UI** | **Nunito** — terminais arredondados, altíssima legibilidade infantil, acentuação PT-BR completa |

Regras:
- A escolha está fechada e registrada no `DESIGN.md`. As fontes são **auto-hospedadas** desde a T-11.1, em `src/public/fonts/`, com `font-display: swap` e subsets latin e latin-ext. O Nunito é variável de 400 a 700, então um arquivo por subset cobre corpo, botão e número. O código nunca escreve o nome Lilita One nem Nunito: as famílias se chamam `Beever Display` e `Beever Texto`, e `src/styles/fontes.css` é o único ponto de troca — quando o Beever tiver fonte própria, muda-se só o `src:` dos `@font-face`.
- Display **só** em título de seção e número de destaque. Texto corrido em display cansa criança.
- Escala (mobile → desktop): 32→48 (h1) · 24→32 (h2) · 20→24 (h3) · 16→17 (corpo) · 14 (apoio). Nunca abaixo de 14 px.
- Altura de linha 1,5 no corpo; 1,1 no display.
- **Números de dinheiro usam figuras tabulares** (`font-variant-numeric: tabular-nums`) — saldo que "dança" ao atualizar parece bug.
- Sentence case em tudo. CAPS só em badge de 1–2 palavras.

### 2.5 Tokens no Tailwind

O projeto usa **Tailwind v4**, configurado por CSS. Os tokens já estão implementados em `src/styles/tailwind.css`, no bloco `@theme` — este é o estado real, não uma proposta:

```css
@theme {
  --color-mel: #ffc200;
  --color-nectar: #ffde00;
  --color-ambar: #f4b73e;

  --color-cera: #fffdf7;
  --color-breu: #111111;
  --color-linha: #e8e2d6;

  --color-tinta: #000000;
  --color-tinta-suave: #4a4a4a;

  --color-acerto: #2e9e4f;
  --color-acerto-texto: #268044;
  --color-atencao: #e07a1f;
  --color-atencao-texto: #9e5309;
  --color-erro: #d93a3a;
  --color-erro-texto: #c42b2b;

  --radius-favo: 20px;
  --radius-pilula: 999px;

  --shadow-repouso: ...;
  --shadow-elevado: ...;
  --shadow-painel: ...;
  --shadow-flutuante: ...;
}
```

Os tokens `--font-sans` e `--font-display` não estão mais neste bloco: desde a
T-11.1 eles moram em `src/styles/fontes.css`, junto dos `@font-face`, para que
trocar a tipografia seja mexer num arquivo só.

Utilitários resultantes: `bg-mel`, `hover:bg-nectar`, `active:bg-ambar`, `bg-cera`, `bg-breu`, `text-tinta`, `text-tinta-suave`, `border-linha`, `text-acerto`/`text-atencao`/`text-erro`, `rounded-favo`, `rounded-pilula`, `font-display`, `outline-ambar`.

Os quatro degraus de profundidade do `DESIGN.md` viraram token na T-11.1: `shadow-repouso`, `shadow-elevado`, `shadow-painel` e `shadow-flutuante`, com os mesmos valores que o documento já normatizava. Escrever `shadow-md` numa view continua funcionando, mas perde o nome do degrau, e é o nome que sobrevive à leitura de outra pessoa.

**Nenhuma cor literal em template EJS nem em `style` inline** — só token. A rampa antiga `mel-50..900` / `colmeia-900` foi removida do `@theme` e migrada em todas as views; se ela reaparecer em algum lugar, é código velho voltando.

### 2.6 Inventário dos assets do mascote

A arte da Beenie é provisória e será substituída por desenho próprio, então
nenhuma tela escreve caminho de imagem: o catálogo em `src/config/mascote.js`
guarda arquivo e texto alternativo de cada pose, o partial
`partials/ui/mascote.ejs` é quem desenha, e trocar o desenho é mexer só no
catálogo. A animação fica presa à classe do tema (`animate-float`), nunca ao
arquivo, para que uma sequência de quadros entre sem reescrever tela.

| Arquivo | Peso | Pose no catálogo | Onde aparece |
|---|---|---|---|
| `beenie_howdy.png` | 117 KB | `acolhendo` | estado vazio, fim da trilha, resultado de partida com 3 estrelas |
| `beenie_vem.png` | 89 KB | `chamando` | trilha ainda vazia, resultado de partida abaixo de 3 estrelas |
| `beenie_login_render.png` | 128 KB | `entrando` | painel lateral do login |
| `babybee.png`, `beenie_1real.png`, `beenie_login.png`, `1real.gif` | 40 KB a 545 KB | nenhuma | sobraram do projeto antigo e não são usados por nenhuma tela |

O logo (`beever_logo_black.png`, `_white`, `_yellow`), o ícone
(`beever-icon.png`) e a moeda (`mel-moeda-virtual.png`) são marca, não mascote,
e ficam fora do catálogo.

Duas pendências ficam registradas para a E11. As poses que o componente `mascote`
promete na seção 3 — pensando, triste, apontando — não têm arte, e as três que
existem são PNG de mais de 80 KB cada, peso que a T-11.7 vai ter que resolver
contra o teto de LCP da RNF-03, convertendo para `webp` ou redesenhando em SVG.

---

## 3. Componentes base (partials EJS reutilizáveis)

Construa a biblioteca **antes** das telas. Cada um em `src/views/partials/ui/`:

**Situação depois da T-11.2.** Existem e estão em uso: `botao`, `favo-card`,
`badge-recurso` (que serve mel e patrimônio, em vez de dois componentes),
`barra-progresso`, `chama-sequencia`, `mascote`, `item-card`, `estado-vazio`,
`card-meta`, `card-tarefa`, `calendario-semana`, `cabecalho-colmeia`,
`aviso-do-ciclo`, `botao-continuar` e `patrimonio-topo`. Faltam `modal` e
`toast`, que ficaram de fora porque nenhuma tela os usa hoje.

O roadmap chama o componente de "botão 3D". O termo está velho: a revisão de
2026-08-17 do `DESIGN.md` recusou contorno preto e sombra sólida, e o botão
entregue segue o documento — mel sólido, canto de favo, sem contorno, levanta
2 px no hover e volta ao chão em âmbar no clique.

| Componente | Comportamento |
|---|---|
| `botao` ✅ | Variantes primário/secundário/fantasma. Primário: fill mel, texto preto, canto favo, **sem contorno**. Hover sobe para néctar e levanta 2 px; ao pressionar volta ao chão e escurece para âmbar; foco mostra anel âmbar de 3 px. Altura mínima 48 px. |
| `favo-card` | Card hexagonal com estados bloqueado (cinza + cadeado), disponível (mel + pulso suave), atual (néctar + anel), concluído (âmbar + estrela) |
| `badge-mel` | Ícone de gota de mel + valor tabular. Animação de contagem ao mudar |
| `badge-patrimonio` | Mesmo padrão, ícone de colmeia |
| `barra-progresso` | Trilho arredondado, preenchimento mel, rótulo em % fora da barra (nunca texto amarelo dentro) |
| `chama-sequencia` | Número de dias + os 7 dias da semana em pontos: marcado, cumprido, perdido, neutro. Ícone **e** cor (RNF-25) |
| `mascote` | Mascote em poses/estados: neutro, comemorando, pensando, triste, apontando. Um partial que recebe a pose |
| `modal` | Foco preso dentro, `Esc` fecha, botão de fechar de 44 px |
| `card-item` | Item da loja: imagem, nome, preço, tag de comportamento econômico, requisito faltante |
| `toast` | Feedback de ação, some em 4 s, com `role="status"` |
| `estado-vazio` | Ilustração do mascote + 1 frase + 1 ação. Nunca só "nada aqui" |

---

## 4. Padrões de UX para 6–15 anos

1. **Uma ação principal por tela.** O botão primário é o maior elemento clicável e sempre está visível sem rolagem na Colmeia.
2. **Feedback imediato em tudo.** Toque → resposta visual em menos de 100 ms. Sem "carregando" silencioso.
3. **Erro nunca pune.** Errar mostra a resposta certa com o mascote explicando, não um X vermelho seco. (RN-030: sem vidas.)
4. **Números grandes e legíveis.** Saldo, patrimônio e nível são os maiores números da tela.
5. **Ícone + palavra.** Criança de 6 anos lê pouco; adolescente de 15 acha só-ícone infantil. Os dois juntos servem os dois.
6. **Progresso sempre visível.** Toda tela responde "onde eu estou" e "quanto falta".
7. **Confirmação antes de gastar.** Compra mostra o impacto: "seu patrimônio vai para 3.400 e você vai pagar 90 de mel por semana". É o momento pedagógico central do app.
8. **Rolagem curta.** Se a tela do app passa de 2 telas de altura no celular, ela tem coisa demais.
9. **Deixe explícito que o mel é fictício** (RNF-35), em texto que uma criança entende: "o mel é dinheiro de brincadeira, serve para treinar".

### Microcopy
- Voz ativa, verbo no começo: "Continuar", "Guardar no cofre", "Comprar casa pequena".
- O nome da ação não muda no meio do fluxo: o botão "Comprar" gera o aviso "Comprado".
- Erro diz o que aconteceu e o que fazer: "Faltam 200 de mel. Conclua 2 atividades para chegar lá." Nunca "operação inválida".
- Tela vazia é convite: "Seu inventário está vazio. Sua primeira compra pode ser um patinete por 200."
- Zero jargão sem explicação. "Patrimônio" aparece pela primeira vez com uma linha explicando: "tudo o que você tem somado".

---

## 5. Telas do app

| Tela | Essencial |
|---|---|
| **Login / Registro** | Uma coluna, centralizada, mascote acolhendo. Campos grandes, senha com botão de mostrar, mensagem de erro embaixo do campo. Consentimento do responsável visível, não escondido em link. |
| **Onboarding** | Um passo por tela, barra de progresso em favo, voltar sempre disponível. Os dias da semana são **cartões hexagonais grandes** que se acendem ao tocar. Ao terminar, uma tela de celebração mostrando as metas geradas: "montei 2 metas pra você porque você tem 4 dias livres". |
| **Colmeia (Home)** | Topo fixo: nível+XP, mel, patrimônio, sequência. Depois o card da **meta mais próxima do vencimento** (título, %, dias restantes, prêmio em mel). Depois a trilha de favos em hexágonos verticais e serpenteantes (referência: trilha do Duolingo, com nosso traço). Botão "Continuar" flutuante. |
| **Célula / Jogo** | Sem distração: barra de progresso da atividade no topo, conteúdo no centro, ação embaixo. Sem menu, sem saldo, sem nada clicável fora do jogo. Sair pede confirmação. |
| **Resultado** | Estrelas animadas uma a uma, mascote comemorando, XP/mel/pólen contando, progresso da meta atualizando na frente da criança — é a recompensa emocional. |
| **Loja** | Saldo e patrimônio fixos no topo. Categorias em abas hexagonais. Card mostra o comportamento econômico com tag colorida + palavra: "valoriza", "gasta por semana", "dá renda". Item bloqueado mostra o que falta, nunca só cadeado. |
| **Inventário** | Duas seções claras: **Meus bens** (com valor atual e variação) e **Cosméticos** (com aviso "não contam no patrimônio"). Barra simples mostrando a composição carteira/cofre/bens. |
| **Cofre** | Uma linha de projeção visual: "guardando 50 por semana, em 8 semanas você tem 430". O gráfico é o argumento pedagógico — dê espaço a ele. |
| **Perfil** | Editar disponibilidade com aviso honesto: "mudar seus dias vai reorganizar suas metas, seu progresso continua". Preferências de som e de animação reduzida em destaque. |

---

## 6. Landing page

**Público:** a criança/jovem decide que quer, o responsável decide que autoriza. A página fala com os dois — jovem primeiro, responsável em seção própria.
**Trabalho da página:** levar ao registro. Todo elemento serve a isso ou sai.
**Superfície:** escura (`#111111`) com favos e mel como luz. Contraste máximo com o app (claro) — entrar no app deve parecer "acender a luz".

**Situação depois da T-11.3.** O herói existe, em `partials/landing/`, e a
landing deixou de usar o cabeçalho e o rodapé do app — ela tem casca própria,
escura, com o logo branco. O parallax é CSS puro: três camadas de favos em SVG
embutido, movidas por `animation-timeline: scroll()` dentro de `@supports`, sem
uma linha de JavaScript na página. Onde o navegador não suporta a linha do tempo
de rolagem, as camadas ficam paradas. As nove seções restantes são T-11.4 e
T-11.6, e a coluna de mel da 6.1 é T-11.5.

### 6.1 Elemento-assinatura

**A coluna de favo que enche de mel conforme a rolagem.** Uma faixa vertical de hexágonos na borda da tela que vai sendo preenchida por mel líquido à medida que a pessoa desce — é o indicador de progresso da página, é a metáfora do produto (progresso acumulado) e é a única peça verdadeiramente memorável. Gaste sua ousadia aqui e mantenha o resto disciplinado.

### 6.2 Seções, na ordem

| # | Seção | Conteúdo | Motion |
|---|---|---|---|
| 1 | **Herói** | Logo, título curto ("Aprenda a cuidar do seu dinheiro jogando"), subtítulo de 1 linha, CTA "Começar agora", mascote grande | Mascote entra voando e flutua em loop lento; hexágonos de fundo em 3 camadas de parallax |
| 2 | **Por que** | O problema em 1 frase + 3 números sobre educação financeira no Brasil | Números contam ao entrar na viewport |
| 3 | **Como funciona** | 3 passos: escolha seus dias → jogue → construa seu patrimônio. Aqui a numeração faz sentido: é sequência real | Passos revelam em cascata |
| 4 | **A trilha** | Prévia da trilha de favos com módulos reais | Favos "acendem" um a um ao rolar |
| 5 | **Os jogos** | Card por jogo com o que ensina. Um deles jogável na página (mini quiz de 1 pergunta) | Card levanta no hover; mini-jogo dá feedback real |
| 6 | **Loja e patrimônio** | O diferencial: carro deprecia, casa valoriza, negócio dá renda. Mostre a mesma criança com patrimônio crescendo | Contador de patrimônio subindo conforme rola |
| 7 | **Sequência justa** | "Só cobramos nos dias que você escolheu" — nosso diferencial contra a culpa | Calendário semanal se preenchendo |
| 8 | **Para pais e escolas** | Tom adulto, mais sóbrio: o que a criança aprende, LGPD, sem dinheiro real, sem anúncio | Motion mínimo aqui — seriedade é a mensagem |
| 9 | **Perguntas** | Acordeão: é grátis? tem dinheiro real? qual idade? preciso instalar? | Expansão suave por altura |
| 10 | **CTA final + footer** | Mascote apontando, CTA grande, créditos do TCC/instituição | Mascote reage ao hover do botão |

### 6.3 Técnica de animação

Vanilla, dentro da stack (sem SPA, sem bundler):

```
Revelação:   IntersectionObserver → adiciona classe → transição CSS de opacity + translateY.
             Um observer para todos os alvos, nunca um por elemento.
Parallax:    listener de scroll com requestAnimationFrame e flag de throttle;
             aplicar só translate3d. Ler scrollY uma vez por frame, nunca dentro do loop.
Smooth:      CSS scroll-behavior: smooth. Biblioteca de scroll suave (Lenis) só se
             o usuário aprovar em checkpoint — é dependência e risco de acessibilidade.
Moderno:     onde suportado, usar animation-timeline: view() / scroll() em CSS puro
             (@supports), com o caminho JS como fallback. Menos JS, mais fluido.
Mascote:     SVG com <animateMotion> em path, ou keyframes de translate/rotate.
             Loop de flutuação: 4–6 s, ease-in-out, amplitude pequena.
```

Regras rígidas:
- Animar **só** `transform` e `opacity`. Animar `top`, `height`, `margin` ou `box-shadow` derruba o frame rate.
- `will-change` só no elemento em movimento e removido depois.
- Nenhuma animação bloqueia leitura ou toque. Nada de scroll-jacking que impeça rolar.
- **`prefers-reduced-motion: reduce` desliga parallax, loops e revelações** — o conteúdo aparece estático e completo, e a coluna de mel fica preenchida. Isso é requisito (RNF-26), não enfeite.
- Imagens em WebP, `loading="lazy"` fora do herói, `width`/`height` declarados para não haver *layout shift*.
- Padrão de favo de fundo como SVG inline ou `background` em CSS, não PNG grande.

### 6.4 Orçamento de performance
- LCP ≤ 2,5 s em 4G simulado · CLS ≈ 0 · 60 fps na rolagem.
- Nenhuma imagem acima de 200 KB · fontes com `font-display: swap` e apenas os pesos usados.
- JS total da landing abaixo de 30 KB não comprimido. Se passar, algo está sendo feito em JS que devia ser CSS.

---

## 7. Acessibilidade — piso obrigatório

- Contraste AA em todo par de cores; verificado, não estimado.
- Alvos de toque ≥ 44×44 px, com espaçamento entre eles.
- Foco de teclado **visível e no traço da identidade**: anel preto de 2 px + contorno âmbar de 3 px (ver 2.2), nunca `outline: none` sem substituto.
- HTML semântico: `<button>` para ação, `<a>` para navegação, `<h1>`–`<h3>` em ordem.
- Toda imagem informativa com `alt` descritivo; decorativa com `alt=""`.
- Jogo de arrastar tem caminho alternativo por clique e por teclado (RNF-23).
- Nada comunicado só por cor.
- Testar navegando a landing e a Colmeia inteiras **só com teclado** antes de fechar a etapa.

---

## 8. Checklist de aceite visual

- [ ] Nenhuma cor fora dos tokens; nenhuma cor literal em EJS.
- [ ] Amarelo em nenhum lugar como cor de texto sobre fundo claro.
- [ ] Nenhum contorno preto em botão, card, badge ou hexágono; profundidade só pela escala de sombra difusa (repouso / elevado / painel / flutuante).
- [ ] Hexágono presente como forma estrutural, não como enfeite avulso.
- [ ] Mascote sempre legível sobre o fundo em que está.
- [ ] Duas famílias tipográficas, nas funções definidas; números de dinheiro tabulares.
- [ ] Funciona de 320 px até desktop, sem rolagem horizontal — e a versão desktop tem composição desenhada, não é a de celular centralizada.
- [ ] Foco de teclado visível em todo elemento interativo.
- [ ] `prefers-reduced-motion` desliga tudo o que se move e a página segue completa.
- [ ] 60 fps na rolagem da landing em celular real ou throttling 4×.
- [ ] Microcopy revisado: voz ativa, sentence case, sem jargão não explicado.
- [ ] Uma ação principal óbvia por tela.