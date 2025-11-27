// Importe a função. Verifique se o caminho './sidebar.js' está correto baseada na sua pasta
import { renderSidebar } from "./components/sidebar.js"; 
import { renderWorldButton } from "./components/worldbutton.js"; 
import { renderQuestCard } from "./components/questcard.js"; 

// 1. Dados dos Níveis
const levelsData = [
  { id: 1, status: "completed" },
  { id: 2, status: "active" },
  { id: 3, status: "locked" },
  { id: 4, status: "locked" },
  { id: 5, status: "locked" },
  { id: 6, status: "locked" },
  { id: 7, status: "locked" },
];

const zigzagPattern = ["center", "left", "center", "right"];

function initHome() {
  const pathContainer = document.getElementById("path-container");
  const sidebarContainer = document.getElementById("sidebar");
  const questCardContainer = document.getElementById("questcard");

  // --- 1. Renderizar Sidebar ---
  if (sidebarContainer) {
      sidebarContainer.innerHTML = renderSidebar();
  }

  // --- 2. Renderizar QuestCard (AGORA COM O COMPONENTE REAL) ---
  if (questCardContainer) {
      // Chamada da função real para injetar o HTML dinâmico
      questCardContainer.innerHTML = renderQuestCard();
  }

  // 3. Renderizar o Caminho (Path)
  let htmlContent = "";

  levelsData.forEach((level, index) => {
    const posIndex = index % zigzagPattern.length; 
    const position = zigzagPattern[posIndex];

    htmlContent += renderWorldButton({
      id: level.id,
      status: level.status,
      position: position
    });
  });

  pathContainer.innerHTML = htmlContent;

  // =========================================================
  // 4. CONFIGURAÇÃO DE REDIRECIONAMENTO PARA MANUTENÇÃO (NOVA ADIÇÃO) ⚙️
  // =========================================================

  // Seleciona todos os elementos <button> na página
  const botoesDeJogo = document.querySelectorAll('button');

  // Adiciona o ouvinte de clique a cada botão
  botoesDeJogo.forEach(botao => {
      botao.addEventListener('click', function(event) {
          // Impede a ação padrão do botão (por exemplo, se estivesse dentro de um formulário)
          event.preventDefault(); 
          
          // Redireciona para a página de manutenção
          // (Assume que 'manutencao.html' está no mesmo diretório do seu index.html)
          window.location.href = 'manutencao.html';
      });
  });
}

document.addEventListener("DOMContentLoaded", initHome);