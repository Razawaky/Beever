const styles = `
<style>
  @keyframes fly-around {
    0% { transform: translate(0, 0) rotate(0deg); }
    25% { transform: translate(5px, -10px) rotate(5deg); }
    50% { transform: translate(0, -5px) rotate(0deg); }
    75% { transform: translate(-5px, -12px) rotate(-5deg); }
    100% { transform: translate(0, 0) rotate(0deg); }
  }

  .animate-fly {
    animation: fly-around 4s ease-in-out infinite;
  }

  /* Estilo para a transição suave do modal */
  .modal-enter {
    animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  }

  @keyframes popIn {
    from { opacity: 0; transform: scale(0.8) translateY(20px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
  }
</style>
`;

document.head.insertAdjacentHTML('beforeend', styles);

const moedasPerfil = Number(localStorage.getItem("moedas")) || 0;

// --- GERENCIAMENTO DE ESTADO (STATE MANAGEMENT) ---
const state = {
  currentPage: 'home',
  balance: moedasPerfil, //moedas do perfil,
  dailyProgress: 40,
  // Controle do Modal sobre a abelha
  activeModal: null, // null ou { title: string, content: string, type: 'info'|'success'|'locked' }
  weekDays: [
    { day: 'DOM', completed: true, fullDate: 'Domingo - Concluído' },
    { day: 'SEG', completed: true, fullDate: 'Segunda - Concluído' },
    { day: 'TER', completed: true, fullDate: 'Terça - Concluído' },
    { day: 'QUA', completed: true, fullDate: 'Quarta - Concluído' },
    { day: 'QUI', completed: false, current: true, fullDate: 'Quinta - Hoje' },
    { day: 'SEX', completed: false, fullDate: 'Sexta - Bloqueado' },
    { day: 'SÁB', completed: false, fullDate: 'Sábado - Bloqueado' },
  ],
  challenges: [
    {
      id: 1,
      title: 'Mestre das Abelhas',
      description: 'Complete 10 lições sem erros',
      reward: 200,
      progress: 7,
      total: 10,
      color: 'from-purple-500 to-purple-400',
      unlocked: true,
    },
    {
      id: 2,
      title: 'Sequência de Fogo',
      description: 'Mantenha 7 dias seguidos',
      reward: 150,
      progress: 3,
      total: 7,
      color: 'from-orange-500 to-amber-500',
      unlocked: true,
    },
    {
      id: 3,
      title: 'Perfeccionista',
      description: 'Acerte todas as questões',
      reward: 300,
      progress: 0,
      total: 1,
      color: 'from-amber-500 to-yellow-500',
      unlocked: false,
    },
  ],
  shopItems: [
    {
      id: 1,
      name: 'Dica Mágica',
      description: 'Revela a resposta',
      icon: '✨',
      cost: 50,
      color: 'from-yellow-500 to-amber-500',
    },
    {
      id: 2,
      name: 'Escudo Protetor',
      description: 'Protege de 1 erro',
      icon: '🛡️',
      cost: 100,
      color: 'from-purple-500 to-purple-400',
    },
    {
      id: 3,
      name: 'Boost 2x XP',
      description: '30 minutos',
      icon: '⚡',
      cost: 150,
      color: 'from-orange-500 to-amber-500',
    },
  ],
  mascotMessage: 'Vamos aprender juntos! 🐝',
  showMascotMessage: true,
};

// --- SISTEMA DE TOAST (NOTIFICAÇÕES) ---
function showToast(type, title, description) {
  const toastContainer = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = 'toast bg-white shadow-lg rounded-lg p-4 mb-3 border-l-4 border-amber-500 flex flex-col min-w-[250px] animate-fade-in';
  
  const icons = {
    success: '🎉',
    info: '📈',
    warning: '🔒',
    error: '💰'
  };
  
  toast.innerHTML = `
    <div class="font-bold text-gray-900 flex items-center gap-2">${icons[type]} ${title}</div>
    <div class="text-sm text-gray-600 mt-1">${description}</div>
  `;
  
  toastContainer.appendChild(toast);
  
  // Remove o toast após 3 segundos
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// --- COMPONENTES VISUAIS ---

// Componente: Saldo de Mel (Canto superior direito)
function renderHoneyBalance() {
  return `
    <div id="honey-balance" class="fixed top-6 right-6 z-50">
      <div class="bg-linear-to-br from-amber-500 to-orange-500 rounded-3xl px-6 shadow-md cursor-pointer hover:scale-105 transition-transform">
        <div class="flex items-center gap-1">
          <img src="../src/img/Untitled7_20251109214433.png"class="w-16 h-16 object-contain drop-shadow-md"/>
          <div class="text-white">
            <p class="text-2xl font-bold">${state.balance}</p>
          </div>
        </div>
      </div>
      <div id="floating-indicator" class="absolute top-0 right-0 pointer-events-none"></div>
    </div>
  `;
}

// Componente: Desafio Diário (Card grande no topo)
function renderDailyChallenge() {
  return `
    <div class="p-8 bg-white rounded-3xl shadow-sm border border-gray-200/50 hover:shadow-md transition-all">
      <div class="flex items-start justify-between mb-6">
        <div>
          <div class="flex items-center gap-3 mb-2">
            <span class="text-amber-500 text-2xl">⚡</span>
            <h3 class="text-xl font-bold text-gray-800">Desafio Diário</h3>
          </div>
          <p class="text-sm text-gray-600">Complete 5 lições hoje</p>
        </div>
        <div class="bg-yellow-100 rounded-2xl p-3">
          <span class="text-3xl">🏆</span>
        </div>
      </div>

      <div class="space-y-3">
        <div class="flex justify-between text-sm mb-2">
          <span class="text-gray-600 font-medium">Progresso</span>
          <span class="font-bold text-amber-600">${state.dailyProgress}%</span>
        </div>
        
        <div id="daily-progress" class="cursor-pointer hover:scale-[1.02] transition-transform">
          <div class="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div class="h-full bg-linear-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-500" style="width: ${state.dailyProgress}%"></div>
          </div>
        </div>

        <div class="flex justify-between items-center pt-2">
          <span class="text-sm text-gray-500">3 de 5 lições</span>
          <div class="flex items-center gap-1.5 text-amber-600 font-bold bg-amber-50 px-3 py-1 rounded-full">
            <span class="text-sm">+50</span>
            <span class="text-lg">⚡</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Componente: Sequência Semanal (Dias da semana)
function renderWeeklyStreak() {
  return `
    <div class="p-8 bg-white rounded-3xl shadow-sm border border-gray-200/50">
      <div class="mb-6">
        <h3 class="text-xl font-bold text-gray-800 mb-2">Sequência Semanal</h3>
        <p class="text-sm text-gray-600">Mantenha sua sequência ativa! 🔥</p>
      </div>

      <div class="flex gap-4 overflow-x-auto pb-2 scrollbar-hide justify-center">
        ${state.weekDays.map((day, index) => `
          <div class="flex-shrink-0 cursor-pointer flex flex-col items-center gap-3 hover:scale-105 transition-transform" data-day="${index}">
            <div class="relative">
              <svg width="70" height="80" viewBox="0 0 70 80" class="drop-shadow-sm">
                <path
                  d="M35 2 L60 18 L60 54 L35 70 L10 54 L10 18 Z"
                  class="transition-all duration-300 ${
                    day.completed
                      ? 'fill-amber-400 stroke-amber-500'
                      : day.current
                      ? 'fill-yellow-200 stroke-yellow-400'
                      : 'fill-gray-100 stroke-gray-300'
                  }"
                  stroke-width="2"
                />
              </svg>
              <div class="absolute inset-0 flex items-center justify-center">
                ${day.completed ? '<span class="text-3xl">✨</span>' : 
                  day.current ? '<span class="text-orange-500 font-black text-2xl">!</span>' : 
                  '<span class="text-xl text-gray-400">🔒</span>'}
              </div>
            </div>
            <p class="text-xs text-center font-bold uppercase ${
              day.completed || day.current ? 'text-amber-600' : 'text-gray-400'
            }">
              ${day.day}
            </p>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// Componente: Desafios Especiais (Lista vertical)
function renderSpecialChallenges() {
  return `
    <div class="p-8 bg-white rounded-3xl shadow-sm border border-gray-200/50 h-full">
      <div class="flex items-center gap-3 mb-6">
        <span class="text-orange-500 text-2xl">⭐</span>
        <h3 class="text-xl font-bold text-gray-800">Desafios Especiais</h3>
      </div>

      <div class="space-y-4">
        ${state.challenges.map((challenge, index) => {
          const progressPercent = (challenge.progress / challenge.total) * 100;
          return `
            <div 
              class="p-5 rounded-2xl cursor-pointer transition-all hover:scale-[1.02] ${
                challenge.unlocked
                  ? `bg-linear-to-r ${challenge.color} text-white shadow-sm`
                  : 'bg-gray-100 opacity-60'
              }"
              data-challenge="${index}"
            >
              <div class="flex items-start justify-between mb-3">
                <div class="flex items-center gap-3">
                  <div class="${challenge.unlocked ? 'bg-white/25' : 'bg-white/50'} p-2.5 rounded-xl">
                    <span class="text-xl">${challenge.id === 1 ? '👑' : challenge.id === 2 ? '🔥' : '🎯'}</span>
                  </div>
                  <div>
                    <h4 class="font-bold text-base">${challenge.title}</h4>
                    <p class="text-xs mt-0.5 ${challenge.unlocked ? 'text-white/90' : 'text-gray-500'}">
                      ${challenge.description}
                    </p>
                  </div>
                </div>
                <span class="bg-white/25 text-white px-3 py-1 rounded-xl text-sm font-bold">
                  +${challenge.reward}
                </span>
              </div>

              ${challenge.unlocked ? `
                <div class="mt-4">
                  <div class="flex justify-between text-xs mb-2">
                    <span class="font-medium">Progresso</span>
                    <span class="font-bold">${challenge.progress}/${challenge.total}</span>
                  </div>
                  <div class="h-2 bg-white/25 rounded-full overflow-hidden">
                    <div class="h-full bg-white rounded-full transition-all duration-1000" style="width: ${progressPercent}%"></div>
                  </div>
                </div>
              ` : ''}
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

// Componente: Link para a Loja
function renderShopLink() {
  return `
    <div class="p-8 bg-white rounded-3xl shadow-sm border border-gray-200/50 h-full flex flex-col">
      <div class="flex items-center gap-3 mb-4">
        <span class="text-2xl">🎁</span>
        <h3 class="text-xl font-bold text-gray-800">Loja de Recompensas</h3>
      </div>

      <div class="flex-1 flex flex-col items-center justify-center py-8">
        <div class="mb-6">
          <span class="text-8xl">🎁</span>
        </div>

        <p class="text-center text-gray-600 mb-6 text-sm max-w-xs">
          Troque suas Gotas de Mel por recompensas incríveis e power-ups!
        </p>

        <button
          id="goto-shop"
          class="bg-linear-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white gap-2 px-6 py-3 rounded-2xl font-bold transition-all hover:scale-105 flex items-center shadow-sm"
        >
          Visitar Loja
          <span>→</span>
        </button>
      </div>
    </div>
  `;
}

// Componente: Mascote Abelha e Modal (MODIFICADO)
function renderBeeMascot() {
  // Lógica para renderizar ou o Balão Simples ou o Modal
  let bubbleContent = '';

  if (state.activeModal) {
    // Renderiza o MODAL COMPLETO
    const modalColor = state.activeModal.type === 'locked' ? 'text-gray-500 border-gray-300' : 'text-amber-700 border-amber-200';
    const bgHeader = state.activeModal.type === 'locked' ? 'bg-gray-100' : 'bg-amber-50';
    
    bubbleContent = `
      <div class="mb-6 ml-4 modal-enter relative z-50">
        <div class="relative bg-white rounded-2xl shadow-xl border-2 ${modalColor} min-w-[280px] max-w-[320px]">
          <div class="${bgHeader} px-4 py-3 rounded-t-xl border-b border-gray-100 flex justify-between items-center">
            <h4 class="font-bold text-lg">${state.activeModal.title}</h4>
            <button id="close-modal" class="text-gray-400 hover:text-red-500 transition-colors font-bold text-xl">×</button>
          </div>
          
          <div class="px-4 py-4">
            <p class="text-gray-600 text-sm leading-relaxed">${state.activeModal.content}</p>
            
            ${state.activeModal.type !== 'locked' ? `
            <div class="mt-4 flex justify-end">
               <button id="modal-action" class="bg-amber-500 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-amber-600 font-bold shadow-sm">
                 Ver Detalhes
               </button>
            </div>
            ` : ''}
          </div>
          
          <div class="absolute -bottom-3 left-10 w-6 h-6 bg-white border-r-2 border-b-2 ${modalColor} transform rotate-45"></div>
        </div>
      </div>
    `;
  } else if (state.showMascotMessage) {
    // Renderiza a mensagem simples (padrão)
    bubbleContent = `
      <div class="mb-4 ml-2 animate-fade-in">
        <div class="relative bg-white rounded-2xl px-4 py-3 shadow-md border border-gray-200 max-w-[220px]">
          <p class="text-sm font-medium text-gray-700">${state.mascotMessage}</p>
          <div class="absolute -bottom-2 left-8 w-4 h-4 bg-white border-r border-b border-gray-200 transform rotate-45"></div>
        </div>
      </div>
    `;
  }

  // Renderiza a abelha com a classe 'animate-fly' para o movimento solicitado
  return `
    <div class="fixed bottom-8 left-8 z-40 flex flex-col items-start">
      ${bubbleContent}

      <div id="bee-mascot" class="relative cursor-pointer transition-transform animate-fly ml-4">
        <div class="w-24 h-24 bg-linear-to-br from-amber-400 to-orange-400 rounded-full shadow-lg border-4 border-amber-200 relative">
          <div class="absolute top-5 left-2 right-2 h-2.5 bg-gray-800/80 rounded-full"></div>
          <div class="absolute top-11 left-2 right-2 h-2.5 bg-gray-800/80 rounded-full"></div>
          
          <div class="absolute top-7 left-5 w-3.5 h-3.5 bg-white rounded-full">
            <div class="absolute top-1 left-1 w-1.5 h-1.5 bg-gray-800 rounded-full"></div>
          </div>
          <div class="absolute top-7 right-5 w-3.5 h-3.5 bg-white rounded-full">
            <div class="absolute top-1 left-1 w-1.5 h-1.5 bg-gray-800 rounded-full"></div>
          </div>

          <div class="absolute bottom-5 left-1/2 transform -translate-x-1/2 w-8 h-3 border-b-4 border-gray-800/80 rounded-full"></div>

          <div class="absolute -top-4 -right-4 w-10 h-14 bg-white/80 rounded-full transform rotate-45 border border-amber-300 animate-wing-right shadow-sm"></div>
          <div class="absolute -top-4 -left-4 w-10 h-14 bg-white/80 rounded-full transform -rotate-45 border border-amber-300 animate-wing-left shadow-sm"></div>

          <div class="absolute -top-4 left-7 w-1 h-5 bg-gray-800/80 rounded-full">
            <div class="absolute -top-1.5 -left-1.5 w-3 h-3 bg-amber-400 rounded-full border border-gray-800"></div>
          </div>
          <div class="absolute -top-4 right-7 w-1 h-5 bg-gray-800/80 rounded-full">
            <div class="absolute -top-1.5 -left-1.5 w-3 h-3 bg-amber-400 rounded-full border border-gray-800"></div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Componente: Página da Loja
function renderShopPage() {
  return `
  
  
    <div class="min-h-screen bg-[#FBF8F0]">
      <header class="pt-10 pb-8 px-6">
        <div class="container max-w-5xl mx-auto">
          <button id="back-home" class="mb-6 px-4 py-2 hover:bg-white/50 rounded-xl transition-colors flex items-center gap-2 text-gray-700 font-medium">
            <span>←</span> Voltar
          </button>
          <div class="animate-fade-in">
            <h1 class="text-4xl md:text-5xl font-bold text-amber-600 mb-3" style="font-weight: 700;">
              Loja de Recompensas
            </h1>
            <p class="text-base text-gray-600">Troque suas Gotas de Mel por recompensas! 🍯</p>
          </div>
        </div>
      </header>

      ${renderHoneyBalance()}

      <main class="container max-w-5xl mx-auto px-6 pb-24">
        <div class="p-8 bg-white rounded-3xl shadow-sm border border-gray-200/50">
          <div class="flex items-center gap-3 mb-6">
            <span class="text-2xl">🎁</span>
            <h3 class="text-xl font-bold text-gray-800">Loja de Recompensas</h3>
          </div>

          <div class="space-y-4">
            ${state.shopItems.map((item, index) => {
              const canAfford = state.balance >= item.cost;
              return `
                <div class="p-5 rounded-2xl bg-gray-50 border border-gray-200 hover:border-amber-300 transition-all">
                  <div class="flex items-center justify-between mb-4">
                    <div class="flex items-center gap-4">
                      <div class="p-3 rounded-xl bg-linear-to-br ${item.color} shadow-sm">
                        <span class="text-2xl">${item.icon}</span>
                      </div>
                      <div>
                        <h4 class="font-bold text-gray-800 text-base">${item.name}</h4>
                        <p class="text-sm text-gray-600 mt-0.5">${item.description}</p>
                      </div>
                    </div>
                    <div class="text-right">
                      <div class="flex items-center gap-1">
                        <span class="font-bold text-lg ${canAfford ? 'text-amber-600' : 'text-red-500'}">
                          ${item.cost}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    class="w-full px-4 py-3 rounded-xl font-bold transition-all ${
                      canAfford
                        ? 'bg-linear-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-sm'
                        : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    }"
                    data-shop-item="${index}"
                    ${!canAfford ? 'disabled' : ''}
                  >
                    ${canAfford ? 'Comprar' : 'Insuficiente'}
                  </button>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </main>
    </div>
  `;
}

// Componente: Página Inicial (Container)
function renderHomePage() {
  return `
    <div class="min-h-screen bg-[#FBF8F0]">
      <header class="pt-12 pb-8 px-4 text-center relative">
        
        <button 
          id="exit-app" 
          class="absolute top-10 left-6 p-3 bg-white rounded-full shadow-md text-gray-500 hover:text-amber-600 hover:bg-amber-50 hover:scale-110 transition-all border border-gray-200"
          aria-label="Voltar"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 12H5"></path>
            <path d="M12 19l-7-7 7-7"></path>
          </svg>
        </button>

        <div class="animate-fade-in">
          <h1 class="text-5xl md:text-6xl font-bold text-amber-600 mb-3" style="font-weight: 700;">
            Beever
          </h1>
          <p class="text-base text-gray-600 font-medium">Desafios Gamificados 🐝</p>
        </div>
      </header>

      ${renderHoneyBalance()}

      <main class="container max-w-5xl mx-auto px-6 pb-24 space-y-6">
        <div class="animate-fade-in">${renderDailyChallenge()}</div>
        <div class="animate-fade-in">${renderWeeklyStreak()}</div>
        <div class="grid md:grid-cols-2 gap-6 animate-fade-in">
          ${renderSpecialChallenges()}
          ${renderShopLink()}
        </div>
      </main>

      ${renderBeeMascot()}
    </div>
  `;
}

// --- FUNÇÃO PRINCIPAL DE RENDERIZAÇÃO ---
function render() {
  const app = document.getElementById('app');
  
  // Renderiza a página baseada no estado
  if (state.currentPage === 'home') {
    app.innerHTML = renderHomePage();
    attachHomeEventListeners();
  } else if (state.currentPage === 'shop') {
    app.innerHTML = renderShopPage();
    attachShopEventListeners();
  }
  
  // Garante que o container de Toast existe
  if (!document.getElementById('toast-container')) {
    const toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.className = 'fixed top-6 right-6 z-[60] flex flex-col items-end pointer-events-none';
    document.body.appendChild(toastContainer);
  }
}

// --- LISTENERS DE EVENTOS DA HOME ---
function attachHomeEventListeners() {
  // Clique no Progresso Diário
  const dailyProgress = document.getElementById('daily-progress');
  if (dailyProgress) {
    dailyProgress.addEventListener('click', () => {
      if (state.dailyProgress < 100) {
        const oldBalance = state.balance;
        state.dailyProgress = Math.min(state.dailyProgress + 15, 100);
        
        if (state.dailyProgress >= 100) {
          state.balance += 50;
          showToast('success', 'Desafio Diário Completo!', 'Você ganhou 50 Gotas de Mel!');
          animateBalanceIncrease(oldBalance, state.balance);
        } else {
          showToast('info', `Progresso: ${state.dailyProgress}%`, 'Continue assim!');
        }
        
        render();
      }
    });
  }

  // --- LÓGICA DO MODAL NOS DIAS DA SEMANA ---
  document.querySelectorAll('[data-day]').forEach((dayEl, index) => {
    dayEl.addEventListener('click', () => {
      const day = state.weekDays[index];
      
      // Define o conteúdo do Modal
      if (day.completed) {
        state.activeModal = {
          title: `✅ ${day.day} Completado!`,
          content: `Parabéns! Você completou todas as atividades de ${day.fullDate}. Continue assim para manter sua sequência!`,
          type: 'success'
        };
      } else if (day.current) {
        state.activeModal = {
          title: `📅 Desafio de Hoje`,
          content: `Hoje é o dia! Complete as tarefas de ${day.fullDate} para ganhar pontos extras e mel.`,
          type: 'info'
        };
      } else {
        state.activeModal = {
          title: `🔒 Bloqueado`,
          content: `O dia ${day.day} ainda não está disponível. Complete os dias anteriores primeiro.`,
          type: 'locked'
        };
      }
      
      // Re-renderiza para mostrar o modal
      render();
    });
  });

  // --- LÓGICA DO MODAL NOS DESAFIOS ESPECIAIS ---
  document.querySelectorAll('[data-challenge]').forEach((challengeEl, index) => {
    challengeEl.addEventListener('click', () => {
      const challenge = state.challenges[index];
      
      // Define o conteúdo do Modal
      if (challenge.unlocked) {
        state.activeModal = {
          title: `🎯 ${challenge.title}`,
          content: `${challenge.description}. Seu progresso atual é de ${challenge.progress} de ${challenge.total}. Recompensa: ${challenge.reward} de Mel.`,
          type: 'info'
        };
      } else {
        state.activeModal = {
          title: `🔒 Desafio Bloqueado`,
          content: `Este desafio ainda não está disponível. Complete mais lições para desbloquear o nível "${challenge.title}".`,
          type: 'locked'
        };
      }
      
      // Re-renderiza
      render();
    });
  });

  // Botão para fechar o Modal
  const closeModalBtn = document.getElementById('close-modal');
  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', (e) => {
      e.stopPropagation(); // Evita clicar na abelha junto
      state.activeModal = null;
      render();
    });
  }

  // Link para a Loja
const gotoShop = document.getElementById('goto-shop');
  if (gotoShop) {
    gotoShop.addEventListener('click', () => {
      // Redireciona para o arquivo externo
      window.location.href = '/pages/shop.html';
    });
  }

// --- NOVO: BOTÃO VOLTAR (SAIR) DA HOME ---
  const exitBtn = document.getElementById('exit-app');
  if (exitBtn) {
    exitBtn.addEventListener('click', () => {
      // Ação do botão de voltar da tela de desafios.
      // Pode ser um history.back() ou redirecionar para um login/index
      // Exemplo:
      if (window.history.length > 1) {
        window.history.back();
      } else {
        console.log("Botão voltar clicado (nenhum histórico anterior)");
        // Opcional: window.location.href = 'index.html';
      }
    });
  }

  // Clique na Mascote Abelha
  const beeMascot = document.getElementById('bee-mascot');
  if (beeMascot) {
    beeMascot.addEventListener('click', () => {
      // Se tiver modal aberto, fecha. Se não, alterna a mensagem simples
      if (state.activeModal) {
        state.activeModal = null;
      } else {
        state.showMascotMessage = !state.showMascotMessage;
      }
      render();
    });
  }
}

// --- LISTENERS DA LOJA ---
function attachShopEventListeners() {
  const backHome = document.getElementById('back-home');
  if (backHome) {
    backHome.addEventListener('click', () => {
      state.currentPage = 'home';
      render();
    });
  }

  document.querySelectorAll('[data-shop-item]').forEach((itemEl, index) => {
    itemEl.addEventListener('click', () => {
      const item = state.shopItems[index];
      if (state.balance >= item.cost) {
        const oldBalance = state.balance;
        state.balance -= item.cost;
        showToast('success', `✨ ${item.name} comprado!`, `Você gastou ${item.cost} Gotas de Mel`);
        animateBalanceDecrease(oldBalance, state.balance);
        render();
      } else {
        showToast('error', '💰 Gotas insuficientes', `Você precisa de ${item.cost - state.balance} Gotas a mais`);
      }
    });
  });
}

// --- ANIMAÇÕES DE SALDO ---
function animateBalanceIncrease(from, to) {
  const indicator = document.getElementById('floating-indicator');
  if (indicator) {
    const diff = to - from;
    indicator.innerHTML = `<div class="floating-indicator text-2xl font-bold text-yellow-500 transition-all duration-1000 transform translate-y-[-20px] opacity-0">+${diff}</div>`;
    // Força reflow para animação CSS funcionar se fosse classe, mas aqui estamos injetando HTML direto
    // Uma abordagem melhor seria adicionar classe de animação
    setTimeout(() => {
      indicator.innerHTML = '';
    }, 1500);
  }
}

function animateBalanceDecrease(from, to) {
  const balanceEl = document.querySelector('#honey-balance .text-2xl.font-bold');
  if (balanceEl) {
    balanceEl.textContent = to;
    balanceEl.classList.add('text-red-500');
    setTimeout(() => balanceEl.classList.remove('text-red-500'), 500);
  }
}

// Inicializa a Aplicação
document.addEventListener('DOMContentLoaded', () => {
  render();
});