// src/components/WorldButton.js

export function renderWorldButton({ id, status, position }) {
  // Define cores baseadas no status
  let bgClass = "bg-slate-700 cursor-not-allowed opacity-60"; // Bloqueado (padrão)
  let shadowClass = "shadow-[0_4px_0_#334155]";
  let icon = `<i class="fa-solid fa-lock text-slate-400"></i>`; // Ícone de cadeado
  let text = "";

  if (status === "active") {
    bgClass = "bg-amber-400 hover:bg-amber-300 cursor-pointer animate-float";
    shadowClass = "shadow-[0_6px_0_#b45309]"; // Sombra escura de mel
    icon = `<i class="fa-solid fa-play text-white text-2xl"></i>`;
    text = `<div class="absolute -top-12 bg-white text-slate-900 font-bold px-3 py-1 rounded-xl shadow-lg text-sm animate-bounce">Start!</div>`;
  } else if (status === "completed") {
    bgClass = "bg-amber-500 hover:bg-amber-400 cursor-pointer";
    shadowClass = "shadow-[0_6px_0_#b45309]";
    icon = `<i class="fa-solid fa-check text-white text-3xl"></i>`;
  }

  // Lógica de Posicionamento (Zig-zag)
  // 'left' empurra pra esquerda, 'right' pra direita, 'center' fica no meio
  let positionClass = "";
  if (position === "left") positionClass = "-translate-x-16";
  if (position === "right") positionClass = "translate-x-16";

  return `
    <div class="relative flex justify-center py-4 ${positionClass}">
      ${text}
      <button
        onclick="window.location.href='/game?level=${id}'"
        class="hexagon-shape w-24 h-24 ${bgClass} ${shadowClass} 
        flex items-center justify-center transition-all duration-200 active:translate-y-2 active:shadow-none relative z-10"
        ${status === 'locked' ? 'disabled' : ''}
      >
        <div class="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent pointer-events-none"></div>
        ${icon}
      </button>
      
      <span class="absolute -bottom-2 text-slate-500 font-bold text-sm bg-slate-900 px-2 rounded">
        ${id}
      </span>
    </div>
  `;
}