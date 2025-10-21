import './style.css'
import '../main.css'
import { setupCounter } from './counter.js'

document.querySelector('#app').innerHTML = `
  <div>
    <div class="grid rid-cols-2 gap-2">
      <button type="button" class="w-80 h-12 text-black !bg-yellow-300 rounded-lg text-sm px-5 py-2.5 text-center me-2 mb-2 ">
        Criar conta
      </button>
      <a href="/pages/login.html">
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
