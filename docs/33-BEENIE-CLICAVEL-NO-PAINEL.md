# Beenie clicável no painel

**Data:** 2026-10-12 · **Escopo:** registrar a interação da mascote na Colmeia (tela
`/painel`): o que foi acrescentado, onde e por quê. São alterações locais, ainda
não commitadas.

## O que a tela faz agora

A Beenie aparece **fixa na tela** (não sai da vista quando a página rola), **por
cima de todo o resto**, e é **clicável**. A cada clique ela troca de expressão:
sorteia uma das oito imagens de reação, **nunca repetindo a que já está na tela**.
A troca é só visual — nada é gravado nem enviado ao servidor.

## O que foi adicionado

- **Sete imagens de reação novas** em `src/public/img/`: `beenie_click_a`,
  `beenie_click_oopsy`, `beenie_click_smiley`, `beenie_click_speak`,
  `beenie_click_stars`, `beenie_click_uhhhhh` e `beenie_click_yeah` (todas
  `.webp`), somando-se à `beenie_click_default` que já existia. Todas com a mesma
  medida (275×412).
- **Oito poses novas** no catálogo do mascote e uma **lista de revezamento**
  (`POSES_DO_CLIQUE`), que é a fonte única de quais reações entram na troca.
- **Um script de página** (`painel.js`) com o sorteio, o pré-carregamento das
  imagens e a troca do `src` da mascote.
- **Uma animação de balanço** no lugar (`animate-balanceio`), com desligamento
  para quem pede menos movimento.

## Onde cada peça mora

| O que | Onde |
|---|---|
| Imagens das reações | `src/public/img/beenie_click_*.webp` |
| Poses e lista de revezamento | `src/config/mascote.js` (`MASCOTES`, `POSES_DO_CLIQUE`) |
| Lista exposta para as views | `src/app.js` (`app.locals.posesDoClique`) |
| Botão, atributo com a lista e `id` da imagem | `src/views/pages/painel.ejs` |
| Sorteio sem repetição e pré-carga | `src/public/js/painel.js` (novo) |
| Registro do script na página | `src/controllers/paginaController.js` (handler `painel`) |
| Animação de balanço e reduced-motion | `src/styles/tema.css` |

## Decisões que valem lembrar

- **A view não escreve caminho de imagem.** Os caminhos descem no atributo
  `data-beenie-imagens` do botão, montados a partir do catálogo — o script no
  navegador só lê essa lista e troca o `src`.
- **Sem script embutido na página.** A CSP do projeto (`src/app.js`) só permite
  script próprio, então o comportamento vive em `/js/painel.js`, registrado pelo
  controller via `scripts: [...]` e carregado pelo `layout.ejs`.
- **Respeita `prefers-reduced-motion`.** A animação nova entrou no bloco do
  `tema.css` que já desliga os outros laços decorativos; com "menos distração"
  ligado, a mascote (imagem decorativa) é escondida pela regra existente da
  acessibilidade.
- **Fica por cima de tudo** (`z-50`, acima do `z-40` do painel de
  acessibilidade) e usa `fixed`, para continuar visível sem rolagem.
- **Também foram corrigidas as medidas** do `clicavel` no catálogo, que estavam
  280×430 enquanto os arquivos novos são 275×412.

## Como conferir

- `npm run lint` limpo e a suíte unitária verde (o catálogo tem teste próprio:
  toda pose aponta para arquivo existente e tem `alt`).
- A tela `/painel` continua renderizando normalmente.
- Não houve classe Tailwind nova em uso que exigisse `npm run css:build`; se
  novas classes de tamanho/posição entrarem, o build passa a ser necessário.

## Observações em aberto

- Os **nomes das poses e os textos `alt`** foram escritos a partir do nome dos
  arquivos, sem inspeção visual das imagens; se alguma carinha não corresponder,
  é só ajustar o catálogo (no painel elas são decorativas).
- A posição atual (`right-4 bottom-4`) **encosta no botão de acessibilidade**,
  que fica no mesmo canto com `z-40`. Se a intenção for não cobrir nada, o canto
  precisa mudar — a posição é uma única classe no `painel.ejs`.
- O botão só reage ao **clique**; teclado (Enter/Espaço) aciona o mesmo evento
  por ser um `<button>` de verdade.
