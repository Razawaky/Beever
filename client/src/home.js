// pages/gateway.js
import { renderWorldButton } from "./components/worldbutton";

// 1. Dados dos Níveis (Isso viria do seu Backend futuramente)
const levelsData = [
  { id: 1, status: "completed" },
  { id: 2, status: "completed" },
  { id: 3, status: "active" },     // Onde o usuário parou
  { id: 4, status: "locked" },
  { id: 5, status: "locked" },
  { id: 6, status: "locked" },
  { id: 7, status: "locked" }, // Baú de tesouro poderia ser aqui
];

// 2. Padrão de Zig-Zag (Centro -> Esquerda -> Centro -> Direita)
const zigzagPattern = ["center", "left", "center", "right"];

function initHome() {
  const pathContainer = document.getElementById("path-container");
  const sidebarContainer = document.getElementById("sidebar");
  const questCardContainer = document.getElementById("questcard");

  // Renderizar Sidebar e QuestCard (Simulação)
  sidebarContainer.innerHTML = `<div class="p-4 text-white">🐝 Sidebar</div>`; 
  questCardContainer.innerHTML = `<div class="bg-slate-800 p-4 rounded-xl text-white shadow-xl border border-slate-700">🎯 Missão Diária: Colete 5 potes de mel</div>`;

  // 3. Renderizar o Caminho (Path)
  let htmlContent = "";

  levelsData.forEach((level, index) => {
    // Calcula a posição baseada no índice usando o padrão ZigZag
    // O operador % (módulo) faz o loop infinito no array de padrões: 0, 1, 2, 3, 0, 1...
    const posIndex = index % zigzagPattern.length; 
    const position = zigzagPattern[posIndex];

    htmlContent += renderWorldButton({
      id: level.id,
      status: level.status,
      position: position
    });
  });

  // Injetar no HTML
  pathContainer.innerHTML = htmlContent;
}

// Inicializar quando o DOM carregar
document.addEventListener("DOMContentLoaded", initHome);