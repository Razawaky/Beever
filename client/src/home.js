// Importe a função. Verifique se o caminho './sidebar.js' está correto baseada na sua pasta
import { renderSidebar } from "./components/sidebar.js"; 
import { renderWorldButton } from "./components/worldbutton.js"; // Supondo que precise do .js no final se for ESM nativo

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

  // --- IMPLEMENTAÇÃO DA SIDEBAR AQUI ---
  // Apenas chamamos a função que retorna a string HTML
  if (sidebarContainer) {
      sidebarContainer.innerHTML = renderSidebar();
  }

  // Renderizar QuestCard (Simulação)
  questCardContainer.innerHTML = `<div class="bg-slate-800 p-4 rounded-xl text-white shadow-xl border border-slate-700">🎯 Missão Diária: Colete 5 potes de mel</div>`;

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
}

document.addEventListener("DOMContentLoaded", initHome);