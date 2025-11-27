export function renderSidebar() {
  return `
   <div class="h-full px-3 py-4 overflow-y-auto bg-slate-900 border-r border-slate-800">
      <ul class="space-y-2 font-medium">
         <li>
            <a href="#" class="flex items-center p-2 text-white rounded-lg hover:bg-slate-800 group">
               <img src="../src/img/beever-icon.png" class="w-8 h-8" alt="Beever Logo">
               <span class="ms-3 font-bold text-amber-500">Beever</span>
            </a>
         </li>
         
         <li class="my-4 border-t border-slate-700"></li>

         <li>
            <a href="home" class="flex items-center p-2 text-slate-300 rounded-lg hover:bg-slate-800 hover:text-white group transition-colors">
               <svg class="shrink-0 w-5 h-5 text-slate-500 transition duration-75 group-hover:text-amber-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 18 18">
                  <path d="M6.143 0H1.857A1.857 1.857 0 0 0 0 1.857v4.286C0 7.169.831 8 1.857 8h4.286A1.857 1.857 0 0 0 8 6.143V1.857A1.857 1.857 0 0 0 6.143 0Zm10 0h-4.286A1.857 1.857 0 0 0 10 1.857v4.286C10 7.169 10.831 8 11.857 8h4.286A1.857 1.857 0 0 0 18 6.143V1.857A1.857 1.857 0 0 0 16.143 0Zm-10 10H1.857A1.857 1.857 0 0 0 0 11.857v4.286C0 17.169.831 18 1.857 18h4.286A1.857 1.857 0 0 0 8 16.143v-4.286A1.857 1.857 0 0 0 6.143 10Zm10 0h-4.286A1.857 1.857 0 0 0 10 11.857v4.286c0 1.026.831 1.857 1.857 1.857h4.286A1.857 1.857 0 0 0 18 16.143v-4.286A1.857 1.857 0 0 0 16.143 10Z"/>
               </svg>
               <span class="flex-1 ms-3 whitespace-nowrap">Home</span>
            </a>
         </li>
         
         <li>
            <a href="profile" class="flex items-center p-2 text-slate-300 rounded-lg hover:bg-slate-800 hover:text-white group transition-colors">
               <svg class="shrink-0 w-5 h-5 text-slate-500 transition duration-75 group-hover:text-amber-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
                  <path d="m17.418 3.623-.018-.008a6.713 6.713 0 0 0-2.4-.569V2h1a1 1 0 1 0 0-2h-2a1 1 0 0 0-1 1v2H9.89A6.977 6.977 0 0 1 12 8v5h-2V8A5 5 0 1 0 0 8v6a1 1 0 0 0 1 1h8v4a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-4h6a1 1 0 0 0 1-1V8a5 5 0 0 0-2.582-4.377ZM6 12H4a1 1 0 0 1 0-2h2a1 1 0 0 1 0 2Z"/>
               </svg>
               <span class="flex-1 ms-3 whitespace-nowrap">Perfil</span>
               <span class="inline-flex items-center justify-center w-3 h-3 p-3 ms-3 text-sm font-medium text-amber-800 bg-amber-200 rounded-full">3</span>
            </a>
         </li>

         <li>
            <a href="desafios" class="flex items-center p-2 text-slate-300 rounded-lg hover:bg-slate-800 hover:text-white group transition-colors">
               <svg class="shrink-0 w-5 h-5 text-slate-500 transition duration-75 group-hover:text-amber-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 18">
                  <path d="M14 2a3.963 3.963 0 0 0-1.4.267 6.439 6.439 0 0 1-1.331 6.638A4 4 0 1 0 14 2Zm1 9h-1.264A6.957 6.957 0 0 1 15 15v2a2.97 2.97 0 0 1-.184 1H19a1 1 0 0 0 1-1v-1a5.006 5.006 0 0 0-5-5ZM6.5 9a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9ZM8 10H5a5.006 5.006 0 0 0-5 5v2a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-2a5.006 5.006 0 0 0-5-5Z"/>
               </svg>
               <span class="flex-1 ms-3 whitespace-nowrap">Desafios</span>
            </a>
         </li>

         <li>
            <a href="shop" class="flex items-center p-2 text-slate-300 rounded-lg hover:bg-slate-800 hover:text-white group transition-colors">
               <svg class="shrink-0 w-5 h-5 text-slate-500 transition duration-75 group-hover:text-amber-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 18 20">
                  <path d="M17 5.923A1 1 0 0 0 16 5h-3V4a4 4 0 1 0-8 0v1H2a1 1 0 0 0-1 .923L.086 17.846A2 2 0 0 0 2.08 20h13.84a2 2 0 0 0 1.994-2.153L17 5.923ZM7 9a1 1 0 0 1-2 0V7h2v2Zm0-5a2 2 0 1 1 4 0v1H7V4Zm6 5a1 1 0 1 1-2 0V7h2v2Z"/>
               </svg>
               <span class="flex-1 ms-3 whitespace-nowrap">Mercado</span>
            </a>
         </li>

         <li class="mt-auto">
            <a href="login" class="flex items-center p-2 text-slate-400 rounded-lg hover:bg-red-900/20 hover:text-red-400 group transition-colors">
               <svg class="shrink-0 w-5 h-5 text-slate-500 transition duration-75 group-hover:text-red-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 18 16">
                  <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M1 8h11m0 0L8 4m4 4-4 4m4-11h3a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-3"/>
               </svg>
               <span class="flex-1 ms-3 whitespace-nowrap">Sair</span>
            </a>
         </li>
      </ul>
   </div>
  `;
}