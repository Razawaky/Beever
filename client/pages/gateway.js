// Importa os componentes para renderização
import { renderSidebar } from '../src/components/sidebar.js';
import { renderWorldButton } from '../src/components/worldbutton.js';
import { renderQuestCard } from '../src/components/questcard.js';


// Função pra renderizar qualquer componente
function renderComponent(selector, renderFunction, count = 1) {
  const container = document.querySelector(selector);
  if (!container) return; // se não existe, ignora

  // Repete quantas vezes for pedido
  for (let i = 0; i < count; i++) {
    container.insertAdjacentHTML('beforeend', renderFunction());
  }
}

renderComponent('#sidebar', renderSidebar);          // sidebar 
renderComponent('#worldbutton', renderWorldButton, 5);  // botão
renderComponent('#questcard', renderQuestCard, 1);   // cards

