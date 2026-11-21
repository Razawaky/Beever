# O Quarto do Beenie — protótipo

Demo isolada em Phaser para validar o quarto em quatro ângulos com a arte nova
em PNG. Ela não abre partidas, não credita moedas reais e não altera nenhuma rota
do Beever.

- URL local: `/demo/quarto-beenie/`
- URL de inspeção: `/demo/quarto-beenie/?teste=1`
- Versão anterior: `/demo/favo-click/`
- Documento técnico: [`docs/34-DEMO-QUARTO-BEENIE.md`](../../../../docs/34-DEMO-QUARTO-BEENIE.md)

## Fluxo

1. **Vídeo HTML** — `intro.mp4`/`intro.webm` com poster, áudio e botão para
   pular. O autoplay com som tenta acontecer sozinho; se o navegador bloquear,
   o botão “Reproduzir com áudio” faz isso após o clique. Em
   `prefers-reduced-motion`, o vídeo não inicia sozinho.
2. **Boot** — o Phaser só é criado depois do vídeo; a cena carrega os retratos do
   Beenie, a moeda, as quatro paredes, os overlays de itens e os ícones de
   `img/jogo/icones/`.
3. **Quarto** — quatro paredes, rotação por setas/botões e seis atividades.
   As paredes são PNGs 600 × 600 que ocupam o palco inteiro. No canto superior
   esquerdo, um hexágono escuro preso à borda do canvas fica vazio quando a mão
   está livre e mostra o ícone do item carregado. A porta da Frente fica sempre
   disponível para sair.
4. **Atividades** — o jogador carrega **um item por vez**:
   - **Cama (Direita)** — pegue os dois travesseiros (um está na Frente e outro
     na Direita) e a coberta, um de cada vez, e clique na cama após cada item.
   - **Quadro (Direita)** — clique para endireitar.
   - **Baú (Esquerda)** — começa aberto; pegue os brinquedos e clique no baú.
   - **Armário (Esquerda)** — começa aberto; pegue as três roupas espalhadas
     pela Frente, Trás e Esquerda e clique no armário.
   - **Mesa (Trás)** — pegue o livro e clique na mesa.
   - **Janela (Trás)** — clique na cortina para abrir. O contorno do hover é o
     da cortina, não o da janela.
   - **Porta (Frente)** — clique a qualquer momento para sair e ver o resultado.
     O mel recebido é a soma das atividades concluídas, então dá para sair sem
     arrumar nada, com parte do quarto pronta ou com tudo pronto.
   - Os fiapos são decoração sobre os objetos: os do baú e da cama permanecem,
     mas os dos brinquedos e do travesseiro somem quando o item é pego.
5. **Fim** — ao sair pela porta, a cena mostra o que foi concluído, o que ficou
   pendente e o mel proporcional. O botão "Jogar de novo" reinicia sem passar
   pelo vídeo; "Rever introdução" recarrega a página.

## Arquivos

| Arquivo | Papel |
| --- | --- |
| `index.html` | Página, camada de vídeo, status acessível e explicação da arquitetura. |
| `demo.css` | Estilo isolado da demo; não entra no bundle do app. |
| `main.js` | Handoff vídeo → Phaser, configuração do jogo e botões da página. |
| `cenas/CenaBoot.js` | Preload dos retratos, moeda, paredes, itens e ícones. |
| `cenas/CenaQuarto.js` | Rotação, diálogo, hotspots, hexágono da mão e regras de pegar/guardar. |
| `cenas/CenaFim.js` | Resumo das atividades e reinício. |
| `desenho.js` | Composição das paredes em camadas condicionais (base + itens). |
| `dadosDoQuarto.js` | Registros de imagens, ícones, paredes, visuais, hotspots, recompensas e mensagens. |
| `estadoDoJogo.js` | Estado compartilhado: parede atual, atividades, itens, item na mão e mel fictício. |
| `interface.js` | Ponte para `#status` e `#instrucoes`; o cabeçalho acima do palco é só o título. |

As imagens do quarto ficam em `src/public/img/jogo/`, organizadas por subpastas.
Depois da inversão dos lados, a arte `D_*` (armário e baú) aparece na parede
Esquerda, e a arte `E_*` (cama e quadro) aparece na parede Direita.

- **Frente** (`paredes/frente/`): `F_parede.webp`, `F_porta.webp`, `F_roupa.webp`, `F_travesseiro.webp`;
- **Trás** (`paredes/`): `T_parede.webp`, `T_janela.webp`, `T_cortina_fechada.webp`, `T_cortina_aberta.webp`,
  `T_mesa.webp`, `T_livro_jogado.webp`, `T_livro_fechado.webp`, `T_roupa.webp`;
- **Direita — arte E** (`paredes/esquerda/`): `E_parede.webp`, `E_cama_vazia.webp`, `E_travesseiro.webp`,
  `E_travesseiro1_arrumado.webp`, `E_travesseiro2_arrumado.webp`,
  `E_coberta.webp`, `E_coberta_arrumada.webp`, `E_quadro_torto.webp`,
  `E_quadro.webp`, `E_fiapo_cama.webp`, `E_fiapo_travesseiro.webp`;
- **Esquerda — arte D** (`paredes/direita/`): `D_parede.webp`, `D_armario_aberto.webp`, `D_armario_fechado.webp`,
  `D_roupa.webp`, `D_bau_aberto.webp`, `D_bau_fechado.webp`,
  `D_brinquedos.webp`, `D_fiapo_bau.webp`, `D_fiapo_brinquedos.webp`.
- **Ícones da mão** (`icones/`): `brinquedos_icon.webp`, `coberta_icon.webp`,
  `livro_icon.webp`, `travesseiro1_icon.webp`,
  `travesseiro2_icon.webp`, `F_roupa_icon.webp`,
  `T_roupa_icon.webp` e `D_roupa_icon.webp`. Quadro e cortina são
  ações de clique, não itens carregáveis, e não têm ícone.

Os retratos da Beenie usados no jogo ficam em `src/public/img/jogo/beenie/`, as notas de resultado em `src/public/img/score/` e os cliques/avatares em `src/public/img/clicks/beenie/`.

## Decisões

- As imagens têm 600 × 600 e o palco tem 600 × 600. A arte ocupa a tela inteira.
- O hexágono da mão vive fora das paredes: é um favo escuro com moldura de mel
  cujo centro fica no canto superior esquerdo. O raio passa das bordas superior
  e esquerda, então o canvas recorta o desenho e só os lados internos aparecem,
  como se o favo nascesse da moldura do jogo. O ícone aparece no centro dele só
  enquanto houver um item carregado; a relação item → ícone está em
  `ICONES_DOS_ITENS`.
- `dadosDoQuarto.js` é a fonte da verdade para imagens, posições, camadas e
  textos. A cena não conhece "cama" ou "baú"; ela só interpreta
  `tipo: inspecao | pegar | guardar | tarefa | sair`.
- A porta não é uma atividade: ela encerra a visita a qualquer momento. O mel
  final é a soma das atividades concluídas, então não há bônus obrigatório por
  completar as seis. A cena final lista concluídas e pendentes.
- Cada parede tem uma lista de `visuais` com condição (`item-nao-colocado`,
  `item-colocado`, `tarefa-aberta`, `tarefa-concluida`). Isso permite trocar a
  cama vazia pela cama com dois travesseiros e coberta sem duplicar a lógica na
  cena.
- `decorativo: true` marca camadas que são só desenho, como os fiapos: elas não
  entram no estado, não ganham contorno e não têm hotspot. Ficam logo depois do
  objeto correspondente, por cima dele. Os fiapos de brinquedos e de travesseiro
  somem quando o item é pego; os de baú e cama permanecem.
- `estadoDoJogo.js` impõe a regra de capacidade: `pegar()` recusa um segundo
  item enquanto `carregando` não estiver vazio. A cena apenas mostra a mensagem.
- O baú e o armário começam abertos e terminam fechados. A janela começa com a
  cortina fechada; o quadro começa torto. Nada disso precisa de minigame.
- As recompensas são apenas locais (`estadoDoJogo.js`). Em uma integração real,
  o servidor deve calcular e creditar a recompensa; o cliente não pode ser a
  autoridade.

## Como adicionar conteúdo

### Uma parede

1. Acrescente o fundo em `IMAGENS_DO_QUARTO`, em `dadosDoQuarto.js`.
2. Acrescente um item em `PAREDES` com `id`, `nome`, `titulo`, `dica`, `fundo`,
   `visuais` e `hotspots`.
3. Se a ordem das paredes mudar, ajuste `girar()`/`mostrarParede()` apenas se
   a lógica de rotação precisar de algo diferente de avançar/voltar.

### Um item ou hotspot

Adicione um objeto em `hotspots` com:

- `id`, `rotulo`, `x`, `y`, `w`, `h`;
- `tipo`: `inspecao`, `pegar`, `guardar`, `tarefa` ou `sair`;
- `item` quando for `pegar`;
- `aceita` e `completaCom` quando for `guardar`;
- `tarefa` quando concluir uma atividade;
- `visual`: id da camada em `visuais` usada no contorno do hover;
- `emocao` e `mensagem` para o diálogo.

Para a camada correspondente, adicione um objeto em `visuais` com `id`,
`imagem` e, quando necessário, `quando`, `item` ou `tarefa`.

### Uma atividade nova

1. Inclua o `id` em `IDS_DAS_TAREFAS` em `estadoDoJogo.js`.
2. Se a atividade tiver item de cenário, inclua o `id` em `IDS_DOS_ITENS` e o
   ícone correspondente em `ICONES_DOS_ITENS` em `dadosDoQuarto.js`.
3. Adicione o hotspot e a camada de conclusão em `dadosDoQuarto.js`.
4. Escolha entre `tipo: 'tarefa'` (um clique conclui) e `tipo: 'guardar'`
   (exige um item na mão e pode exigir mais de um). Atividades de clique puro,
   como quadro e cortina, não precisam de ícone.

## Teste manual

1. Abra `/demo/quarto-beenie/`.
2. Deixe o vídeo terminar ou clique em "Pular introdução".
3. Gire as quatro paredes com `←`/`→` ou com os botões laterais. O hexágono
   escuro no canto superior esquerdo, preso à borda do canvas, deve começar
   vazio e continuar no lugar nas quatro paredes.
4. Na parede Direita, pegue os dois travesseiros (um na Frente e outro na
   Direita) e a coberta, clicando na cama após cada item; clique no quadro para
   endireitar.
5. Na parede Esquerda, pegue os brinquedos, clique no baú, pegue a roupa da
   Esquerda e clique no armário.
6. Na parede Frente, pegue a roupa da Frente e o travesseiro da Frente, um de
   cada vez, e guarde no armário/cama.
7. Na parede Trás, pegue a roupa de trás e guarde no armário, clique na
   cortina, pegue o livro e clique na mesa.
8. Confira os fiapos: o do baú e o da cama permanecem; o dos brinquedos some
   ao pegar os brinquedos e o do travesseiro some ao pegar o travesseiro da
   Direita. Nenhum deles responde ao clique.
9. Ao pegar um item, confira que o ícone dele aparece no hexágono; ao guardar, o
   hexágono volta a ficar vazio. Tente pegar um segundo item antes de guardar o
   primeiro: a demo deve recusar, explicar que só cabe um item por vez e manter
   o ícone do primeiro item.
10. Clique na porta logo no começo: o resultado deve mostrar "Você saiu do
    quarto", 0 mel e 0/6 atividades.
11. Use "Jogar de novo", conclua parte das atividades e clique na porta: o
    resultado deve mostrar "Quarto parcialmente arrumado!", o mel apenas das
    concluídas e as listas de concluídas/pendentes.
12. Repita concluindo tudo e clique na porta: "Quarto arrumado!", 39 mel e 6/6.

Para inspecionar o estado no console, abra `?teste=1`. O objeto exposto é
`globalThis.__beeverDemoQuarto = { jogo, estado }`.

## Integração futura

- Trocar o vídeo mantendo os nomes `intro.mp4` e `intro.webm` e a faixa de áudio.
- Substituir a arte PNG mantendo as mesmas dimensões ou atualizando `ARTE` e os
  hotspots em `dadosDoQuarto.js`.
- Levar a recompensa para o backend e remover o valor local do cliente.
- Se o quarto virar parte do jogo real, transformar `estadoDoJogo.js` em um
  adaptador do estado do servidor, sem acoplar as cenas diretamente à API.
