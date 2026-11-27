# O Quarto do Beenie — protótipo

Demo isolada em Phaser para validar a arquitetura do quarto em quatro ângulos.
Ela não abre partidas, não credita moedas reais e não altera nenhuma rota do
Beever.

- URL local: `/demo/quarto-beenie/`
- URL de inspeção: `/demo/quarto-beenie/?teste=1`
- Versão anterior: `/demo/favo-click/`

## Fluxo

1. **Vídeo HTML** — `intro.mp4`/`intro.webm` com poster, autoplay silencioso e
   botão para pular. Em `prefers-reduced-motion`, o vídeo não inicia sozinho.
2. **Boot** — o Phaser só é criado depois do vídeo; a cena carrega o Beenie e a
   moeda de mel.
3. **Quarto** — quatro paredes, rotação por setas/botões e hotspots.
4. **Minigame** — cena do cofre lançada por cima do quarto pausado.
5. **Fim** — resumo local e reinício sem passar pelo vídeo de novo. O botão
   "Rever introdução" recarrega a página.

## Arquivos

| Arquivo | Papel |
| --- | --- |
| `index.html` | Página, camada de vídeo, status acessível e explicação da arquitetura. |
| `demo.css` | Estilo isolado da demo; não entra no bundle do app. |
| `main.js` | Handoff vídeo → Phaser, configuração do jogo e botões da página. |
| `cenas/CenaBoot.js` | Preload dos retratos e da moeda. |
| `cenas/CenaQuarto.js` | Rotação, HUD, diálogo, hotspots e integração com o minigame. |
| `cenas/CenaMinigame.js` | Três rodadas de clique-e-segure; devolve o resultado por evento. |
| `cenas/CenaFim.js` | Resumo das tarefas e reinício. |
| `desenho.js` | Desenho vetorial das quatro paredes e helpers visuais. |
| `dadosDoQuarto.js` | Dados das paredes, hotspots, recompensas e mensagens. |
| `estadoDoJogo.js` | Estado compartilhado: parede atual, tarefas e mel fictício. |
| `interface.js` | Ponte pequena para `#status` e `#instrucoes`. |

## Decisões

- O vídeo fica no HTML, não no canvas. Isso mantém autoplay, poster, legenda e
  botão de pular previsíveis.
- `dadosDoQuarto.js` é a fonte da verdade para posições e textos. A cena não
  conhece "cama" ou "cofre"; ela só interpreta `tipo: tarefa | inspecao |
  minigame`.
- O minigame não importa a cena do quarto. Ele emite
  `minigame:resultado` em `game.events`; o quarto decide como aplicar o valor.
- O quarto é pausado durante o minigame e retomado antes da cena do cofre
  fechar, para o jogador voltar exatamente ao mesmo ângulo.
- As recompensas são apenas locais (`estadoDoJogo.js`). Em uma integração real,
  o servidor deve calcular e creditar a recompensa; o cliente não pode ser a
  autoridade.

## Como adicionar conteúdo

### Uma parede

1. Acrescente um item em `PAREDES` com `id`, `nome`, `titulo`, `dica` e
   `hotspots`.
2. Crie o desenho correspondente em `desenho.js` e registre-o em
   `desenharParede`.
3. Se a ordem das paredes mudar, ajuste `girar()`/`mostrarParede()` apenas se
   a lógica de rotação precisar de algo diferente de avançar/voltar.

### Um hotspot

Adicione um objeto em `hotspots` com:

- `id`, `rotulo`, `x`, `y`, `w`, `h`;
- `tipo`: `tarefa`, `inspecao` ou `minigame`;
- `tarefa` e `moedas` quando for uma tarefa;
- `emocao` e `mensagem` para o diálogo.

As coordenadas usam o palco de `960 × 600`. O rótulo aparece no hover; no
celular, a mensagem também é publicada em `#status` para leitura fora do canvas.

## Teste manual

1. Abra `/demo/quarto-beenie/`.
2. Deixe o vídeo terminar ou clique em "Pular introdução".
3. Gire as quatro paredes com `←`/`→` ou com os botões laterais.
4. Conclua as sete tarefas: cama, três brinquedos, livros, roupa e cofre.
5. No cofre, clique e segure (ou mantenha `Espaço`) e solte na faixa verde.
6. Feche o resultado, conclua a última tarefa e use "Jogar de novo".

Para inspecionar o estado no console, abra `?teste=1`. O objeto exposto é
`globalThis.__beeverDemoQuarto = { jogo, estado }`.

## Integração futura

- Trocar os placeholders de vídeo mantendo os nomes `intro.mp4` e `intro.webm`.
- Substituir o desenho vetorial por arte final, mantendo as mesmas coordenadas
  de hotspot ou atualizando `dadosDoQuarto.js`.
- Levar a recompensa para o backend e remover o valor local do cliente.
- Se o quarto virar parte do jogo real, transformar `estadoDoJogo.js` em um
  adaptador do estado do servidor, sem acoplar as cenas diretamente à API.
