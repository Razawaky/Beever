export function renderQuestCard() {
    return `
  
      <div class="daily-quest-card max-w-sm p-4 
                  bg-amber-400
                  rounded-2xl 
                  shadow-lg shadow-amber-600/30 
                  border border-amber-500 
                  text-black">  
      
        <div class="flex justify-between items-center mb-3">
            <h2 class="font-semibold text-lg text-black">Missão Diária</h2>
            <a href="../../pages/desafios" class="text-sm font-medium text-black hover:underline">Visualizar</a>
        </div>
  
        <div class="flex items-center space-x-3 mb-3">
            <div class="bg-amber-300 p-2 rounded-full shadow-md">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="w-6 h-6 fill-black">
                  <path d="M320 496C342.1 496 360 513.9 360 536C360 558.1 342.1 576 320 576C297.9 576 280 558.1 280 536C280 513.9 297.9 496 320 496zM320 64C346.5 64 368 85.5 368 112C368 112.6 368 113.1 368 113.7L352 417.7C351.1 434.7 337 448 320 448C303 448 289 434.7 288 417.7L272 113.7C272 113.1 272 112.6 272 112C272 85.5 293.5 64 320 64z"/>
              </svg>
            </div>
  
            <div>
                <p class="font-semibold text-black">Completar missões</p>
                <p class="text-xs text-black/70">25 XP</p>
            </div>
        </div>
  
        <div class="relative w-full h-3 bg-amber-200 rounded-full overflow-hidden mb-2">
            <div class="absolute top-0 left-0 h-full bg-amber-600 rounded-full w-1/2 transition-all duration-500"></div>
        </div>
  
        <p class="text-xs text-right text-black/80">3 / 5 completo</p> 
  
      </div>
  
    `;
  }
  