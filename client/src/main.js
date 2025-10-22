import './style.css'
import '../main.css'
import { setupCounter } from './counter.js'

// import Router from './router.js'; 
// // import renderHome from './pages/home.js'; 
// import renderLogin from './pages/login.js';

// // O ID do elemento onde o conteúdo será injetado
// const ROOT_ELEMENT_ID = 'app-content';

// // Instancia o roteador, apontando para o elemento raiz no HTML
// const router = new Router(ROOT_ELEMENT_ID);

// // 2. Definição da Rota "/login"
// router.get('/login', async () => {
//   return renderLogin();
// });

// // Quando a aplicação é carregada pela primeira vez, inicia o roteador.
// // Nota: O constructor do Router já adiciona os listeners de evento.
// document.addEventListener('DOMContentLoaded', () => {
//   router.init();
// });

document.querySelector('#app').innerHTML = `
  <div>
    <div class="grid rid-cols-2 gap-2">
      <button type="button" class="w-80 h-12 text-black !bg-yellow-300 rounded-lg text-sm px-5 py-2.5 text-center me-2 mb-2 ">
        Criar conta
      </button>
      <a href="/login">
        <button type="button" class="inline-flex items-center justify-center w-80 h-12 text-black !bg-yellow-300 hover:bg-yellow-700 rounded-lg text-sm px-5 py-2.5 text-center me-2 mb-2 ">
          Usar conta existente
        </button>
      </a>
    </div>

    <div class="card">
      <button id="counter" type="button"></button>
    </div>
    
  </div>

`

setupCounter(document.querySelector('#counter'))
