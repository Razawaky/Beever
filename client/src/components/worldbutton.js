export function renderWorldButton() {
  return `
    <button
      class="relative w-24 h-24 rounded-full bg-linear-to-b from-blue-400 to-blue-600 
      shadow-[0_6px_0_#1e3a8a] overflow-hidden
      hover:translate-y-0.5 hover:shadow-[0_3px_0_#1e3a8a]
      active:translate-y-1 active:shadow-[0_1px_0_#1e3a8a]
      transition-all duration-300 cursor-pointer"
    >
      <span
        class="absolute inset-0 before:content-[''] before:absolute before:top-0 before:left-0
                before:w-[60%] before:h-full before:bg-linear-to-r
                before:from-transparent before:via-white/30 before:to-transparent
                before:skew-x-12 before:translate-x-[-150%] hover:before:translate-x-[150%]
                before:transition-transform before:duration-700"
      ></span>
      <div class="flex justify-center items-center h-full text-white text-3xl">
        <i class="fa-solid fa-check"></i>
      </div>
    </button>
  `;
}