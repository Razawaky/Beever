// 1. Configuração das Perguntas
// Aqui você define o que quer perguntar e onde salvar no banco
const steps = [
    {
        id: 'name',
        question: "Como você quer ser chamado?",
        subtitle: "Seu nome ou apelido na colmeia.",
        type: 'text',
        placeholder: "Ex: beeverzinho",
        image: "../src/img/beenie_howdy.png",
        position: "-bottom-32 left-105 -translate-x-1/2",
        buttonText: "Continuar"
    },
    {
        id: 'goal',
        question: "Qual seu objetivo principal?",
        subtitle: "Isso nos ajuda a personalizar as aulas.",
        type: 'select',
        options: [
            { value: 'career', label: 'Impulsionar carreira' },
            { value: 'travel', label: 'Viajar o mundo' },
            { value: 'hobby', label: 'Apenas por hobby' },
            { value: 'school', label: 'Reforço escolar' }
        ],
        image: "../src/img/beenie_1real.png",
        position: "-bottom-35 left-120 -translate-x-1/2",
        buttonText: "Próximo"
    },
    {
        id: 'level',
        question: "Quanto você já sabe?",
        subtitle: "Seja sincero, não vamos julgar!",
        type: 'radio', // Opções de múltipla escolha estilo botão
        options: [
            { value: 'beginner', label: 'Recém chegado na colmeia (Zero)' },
            { value: 'intermediate', label: 'Já sei voar um pouco (Básico)' },
            { value: 'advanced', label: 'Mestre do mel (Avançado)' }
        ],
        image: "../src/img/beenie_vem.png",
        secondaryImage: "../src/img/babybee.png",
        position: "-bottom-30 left-130 -translate-x-1/2",
        buttonText: "Finalizar Cadastro"
    }
];

// 2. Estado da Aplicação
let currentStep = 0;
const userAnswers = {}; // Aqui ficam salvos os dados: { name: "João", goal: "travel" }

// 3. Seletores do DOM
const container = document.getElementById('dynamic-content');
const progressBar = document.getElementById('progress-bar');
const progressText = document.getElementById('progress-text');
const btnNext = document.getElementById('btn-next');
const btnBack = document.getElementById('btn-back');

// 4. Função para Renderizar a Tela Atual
function renderStep() {
    const step = steps[currentStep];

    // Atualiza Barra de Progresso
    const progress = ((currentStep + 1) / steps.length) * 100;
    progressBar.style.width = `${progress}%`;
    progressText.innerText = `${Math.round(progress)}%`;

    // Gera o HTML do Input baseado no tipo
    let inputHTML = '';

    if (step.type === 'text') {
        inputHTML = `
            <input 
                type="text" 
                id="input-field" 
                class="w-full bg-slate-900 border-2 border-slate-700 text-white p-4 rounded-xl focus:border-amber-500 focus:outline-none transition-colors text-lg"
                placeholder="${step.placeholder}"
                value="${userAnswers[step.id] || ''}" 
                autofocus
            >
        `;
    } else if (step.type === 'select') {
        inputHTML = `
            <select id="input-field" class="w-full bg-slate-900 border-2 border-slate-700 text-white p-4 rounded-xl focus:border-amber-500 focus:outline-none text-lg appearance-none cursor-pointer">
                <option value="" disabled selected>Selecione uma opção...</option>
                ${step.options.map(opt => `<option value="${opt.value}" ${userAnswers[step.id] === opt.value ? 'selected' : ''}>${opt.label}</option>`).join('')}
            </select>
        `;
    } else if (step.type === 'radio') {
        inputHTML = `
            <div class="flex flex-col gap-3" id="radio-group">
                ${step.options.map(opt => `
                    <label class="cursor-pointer border-2 border-slate-700 bg-slate-900 p-4 rounded-xl hover:border-amber-500 hover:bg-slate-800 transition-all flex items-center gap-3 group ${userAnswers[step.id] === opt.value ? 'border-amber-500 bg-slate-800' : ''}">
                        <input type="radio" name="radio-option" value="${opt.value}" class="peer hidden" ${userAnswers[step.id] === opt.value ? 'checked' : ''}>
                        <div class="w-5 h-5 rounded-full border-2 border-slate-500 peer-checked:border-amber-500 peer-checked:bg-amber-500"></div>
                        <span class="font-semibold text-slate-300 group-hover:text-white">${opt.label}</span>
                    </label>
                `).join('')}
            </div>
        `;
    }

    // Injeta o HTML
    container.innerHTML = `
        <div class="animate-fade-in-up">

            <div class="absolute ${step.position} h-110 w-max z-[50] pointer-events-none flex flex-col justify-end items-center">
                
                <img src="${step.image}" alt="Beenie" class="h-full w-auto object-contain block"
                style="filter: drop-shadow(2px 2px 0px #0f172b) drop-shadow(-2px -2px 0px #0f172b) drop-shadow(2px -2px 0px #0f172b) drop-shadow(-2px 2px 0px #0f172b);">
                
                ${step.id === 'goal' ? `
                    <img src="../src/img/1real.gif" alt="Moeda de 1 Real" 
                         class="absolute top-50 right-26 -translate-x-1/2 w-14 h-14 animate-bounce"
                         style="filter: drop-shadow(0px 0px 4px #fff785) drop-shadow(0px 0px 12px #fff785) drop-shadow(0px 0px 30px #fff785) drop-shadow(0px 0px 50px #ffa41b);">
                ` : ''}
                     
            </div>

            ${step.secondaryImage ? `
                <img src="${step.secondaryImage}" alt="Bebê Abelha" class="absolute top-55 right-98 w-35 h-auto" style="filter: drop-shadow(2px 2px 0px #0f172b) drop-shadow(-2px -2px 0px #0f172b) drop-shadow(2px -2px 0px #0f172b) drop-shadow(-2px 2px 0px #0f172b);/>
            ` : ''}

            <h2 class="text-3xl font-bold text-white mb-2">${step.question}</h2>
            <p class="text-slate-400 mb-8">${step.subtitle}</p>
            ${inputHTML}
        </div>
    `;

    // Atualiza texto do botão
    btnNext.innerText = step.buttonText;
    
    // Mostra/Esconde botão voltar
    if (currentStep > 0) {
        btnBack.classList.remove('hidden');
    } else {
        btnBack.classList.add('hidden');
    }

    // Re-adiciona listeners para opções de radio (clique na div seleciona)
    if (step.type === 'radio') {
        const labels = container.querySelectorAll('label');
        labels.forEach(label => {
            label.addEventListener('click', () => {
                // Remove estilo de todos
                labels.forEach(l => {
                    l.classList.remove('border-amber-500', 'bg-slate-800');
                    l.querySelector('input').checked = false;
                });
                // Adiciona no clicado
                label.classList.add('border-amber-500', 'bg-slate-800');
                label.querySelector('input').checked = true;
            });
        });
    }
}

// 5. Função de Avançar
function handleNext() {
    const step = steps[currentStep];
    let value = null;

    // Captura o valor dependendo do tipo
    if (step.type === 'text' || step.type === 'select') {
        const input = document.getElementById('input-field');
        if (!input.value) return alert('Por favor, preencha o campo!'); // Validação simples
        value = input.value;
    } else if (step.type === 'radio') {
        const selected = document.querySelector('input[name="radio-option"]:checked');
        if (!selected) return alert('Selecione uma opção!');
        value = selected.value;
    }

    // Salva no objeto global
    userAnswers[step.id] = value;

    // Verifica se acabou
    if (currentStep < steps.length - 1) {
        currentStep++;
        renderStep();
    } else {
        finishOnboarding();
    }
}

// 6. Função de Voltar
function handleBack() {
    if (currentStep > 0) {
        currentStep--;
        renderStep();
    }
}

// 7. Finalização (Salvar no Banco)
function finishOnboarding() {
    btnNext.innerText = "Salvando...";
    btnNext.disabled = true;

    const perfilId = localStorage.getItem("perfilId");

    console.log("Dados finais para enviar ao banco:", userAnswers);

    // SIMULAÇÃO DE ENVIO PARA O BANCO DE DADOS (API)
    setTimeout(() => {
        if (perfilId) {
            localStorage.setItem(`onboarding_feito_perfil_${perfilId}`, "true");
        }
        // Redireciona para a Home / Trilha
        window.location.href = 'home.html'; 
    }, 1500);
}

// Event Listeners
btnNext.addEventListener('click', handleNext);
btnBack.addEventListener('click', handleBack);

// Inicializa
renderStep();

// CSS Extra para animação de entrada (Adicione no seu CSS ou via style tag)
const style = document.createElement('style');
style.innerHTML = `
    @keyframes fadeInUp {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
    }
    .animate-fade-in-up {
        animation: fadeInUp 0.4s ease-out forwards;
    }
`;
document.head.appendChild(style);