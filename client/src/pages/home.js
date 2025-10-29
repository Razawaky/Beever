import '../../main.css'
import { renderSidebar } from '../components/sidebar'

document.querySelector('#app').innerHTML = `
  <div class="bg-slate-900 text-white min-h-screen flex font-poppins">
    ${renderSidebar()}

    <!-- MAIN CONTENT -->
    <main class="flex-1 p-8  p-8 sm:pl-70 pl-0 transition-all duration-300"> <!-- 👈 esse pl-64 é o segredo -->
      <section class="bg-gray-800 p-6 rounded-2xl shadow-md mb-8">
        <h3 class="text-yellow-400 font-bold text-xl">Missões do Dia</h3>
        <div class="mt-4 w-full bg-gray-700 rounded-full h-3 overflow-hidden">
          <div id="xp-bar" class="bg-yellow-400 h-3 w-[40%] transition-all duration-500"></div>
        </div>
        <p class="mt-3 text-sm text-gray-300">Ganhe 10 XP completando as tarefas!</p>
      </section>

      <section class="bg-gray-800 p-6 rounded-2xl shadow-md">
        <h3 class="text-yellow-400 font-bold text-xl">Status</h3>
        <p class="mt-2 text-gray-300">Você está no nível <span class="text-yellow-400 font-bold">5</span></p>
      </section>
    </main>

  </div>
`
