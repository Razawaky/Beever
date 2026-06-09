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
        secondaryImage: "../src/img/babybee.png", // CORRIGIDO AQUI
        position: "-bottom-30 left-130 -translate-x-1/2",
        buttonText: "Finalizar Cadastro"
    }
];

// 2. Estado da Aplicação (Memória temporária)
let currentStep = 0;
const userAnswers = {};

// 3. Elementos do DOM
const container = document.getElementById('dynamic-content');
const btnNext = document.getElementById('btn-next');
const btnBack = document.getElementById('btn-back');
const progressBar = document.getElementById('progress-bar');
const progressText = document.getElementById('progress-text');

// Preenche o input do nome com o que veio do banco/localStorage se existir
if (localStorage.getItem("nomePerfil")) {
    userAnswers['name'] = localStorage.getItem("nomePerfil");
}

// 4. Função Principal de Renderização
function renderStep() {
    const step = steps[currentStep];

    // Atualiza Botões
    btnNext.innerText = step.buttonText || "Continuar";
    if (currentStep === 0) {
        btnBack.classList.add('hidden');
    } else {
        btnBack.classList.remove('hidden');
    }

    // Atualiza Barra de Progresso
    const progress = Math.round(((currentStep) / steps.length) * 100);
    progressBar.style.width = `${progress}%`;
    progressText.innerText = `${progress}%`;

    // Gera o HTML do Input específico da etapa
    let inputHTML = '';

    if (step.type === 'text') {
        const valueAntigo = userAnswers[step.id] || '';
        inputHTML = `
            <input type="text" id="input-${step.id}" 
                   class="w-full p-4 bg-slate-700 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 transition-colors font-medium text-lg shadow-inner"
                   placeholder="${step.placeholder}"
                   value="${valueAntigo}"
                   autocomplete="off">
        `;
    } else if (step.type === 'select') {
        const valueAntigo = userAnswers[step.id] || '';
        inputHTML = `
            <select id="input-${step.id}" 
                    class="w-full p-4 bg-slate-700 border border-slate-600 rounded-xl text-white focus:outline-none focus:border-amber-500 transition-colors font-medium text-lg appearance-none cursor-pointer shadow-inner">
                <option value="" disabled ${valueAntigo === '' ? 'selected' : ''}>Selecione uma opção...</option>
                ${step.options.map(opt => `
                    <option value="${opt.value}" ${valueAntigo === opt.value ? 'selected' : ''}>${opt.label}</option>
                `).join('')}
            </select>
        `;
    } else if (step.type === 'radio') {
        const valueAntigo = userAnswers[step.id] || '';
        inputHTML = `
            <div class="grid gap-3">
                ${step.options.map(opt => `
                    <label class="flex items-center gap-4 p-4 bg-slate-700/50 border-2 ${valueAntigo === opt.value ? 'border-amber-500 bg-slate-700' : 'border-slate-600'} rounded-xl cursor-pointer hover:bg-slate-700 hover:border-slate-500 transition-all group">
                        <input type="radio" name="${step.id}" value="${opt.value}" ${valueAntigo === opt.value ? 'checked' : ''} class="hidden">
                        <div class="w-5 h-5 rounded-full border-2 ${valueAntigo === opt.value ? 'border-amber-500 bg-amber-500' : 'border-slate-400'} flex items-center justify-center transition-all group-hover:border-amber-500">
                            <div class="w-2 h-2 rounded-full bg-slate-900 ${valueAntigo === opt.value ? 'block' : 'hidden'}"></div>
                        </div>
                        <span class="font-medium text-slate-200 group-hover:text-white transition-colors">${opt.label}</span>
                    </label>
                `).join('')}
            </div>
        `;
    }

    // Injeta o HTML na tela
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
                <img src="${step.secondaryImage}" alt="Bebê Abelha" class="absolute top-55 right-98 w-35 h-auto" 
                     style="filter: drop-shadow(2px 2px 0px #0f172b) drop-shadow(-2px -2px 0px #0f172b) drop-shadow(2px -2px 0px #0f172b) drop-shadow(-2px 2px 0px #0f172b);">
            ` : ''}

            <h2 class="text-3xl font-bold text-white mb-2">${step.question}</h2>
            <p class="text-slate-400 mb-8">${step.subtitle}</p>
            ${inputHTML}
        </div>
    `;

    // Adiciona listener para atualizar a borda dos cards de rádio ao clicar
    if (step.type === 'radio') {
        const labels = container.querySelectorAll('label');
        labels.forEach(label => {
            label.addEventListener('click', () => {
                labels.forEach(l => l.classList.remove('border-amber-500', 'bg-slate-700'));
                label.classList.add('border-amber-500', 'bg-slate-700');
                const radio = label.querySelector('input[type="radio"]');
                radio.checked = true;
                
                // Marca visualmente a bolinha customizada
                labels.forEach(l => {
                    const dot = l.querySelector('.w-5 .bg-slate-900');
                    const wrapperDot = l.querySelector('.w-5');
                    dot.classList.add('hidden');
                    wrapperDot.classList.remove('border-amber-500', 'bg-amber-500');
                    wrapperDot.classList.add('border-slate-400');
                });
                label.querySelector('.w-5 .bg-slate-900').classList.remove('hidden');
                const currentWrapperDot = label.querySelector('.w-5');
                currentWrapperDot.classList.remove('border-slate-400');
                currentWrapperDot.classList.add('border-amber-500', 'bg-amber-500');
            });
        });
    }
}

// 5. Validação e Captura da Resposta
function handleNext() {
    const step = steps[currentStep];
    let value = '';

    if (step.type === 'text' || step.type === 'select') {
        value = document.getElementById(`input-${step.id}`).value.trim();
    } else if (step.type === 'radio') {
        const selected = container.querySelector(`input[name="${step.id}"]:checked`);
        if (selected) value = selected.value;
    }

    // Validação simples: não deixa avançar vazio
    if (!value) {
        alert("Por favor, responda para continuar!");
        return;
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
async function finishOnboarding() {
    btnNext.innerText = "Salvando...";
    btnNext.disabled = true;

    const userId = localStorage.getItem("userId");
    const perfilId = localStorage.getItem("perfilId");

    if (!userId || !perfilId) {
        alert("Sessão expirada ou perfil inválido. Volte à tela de seleção de perfis.");
        window.location.href = 'perfis.html';
        return;
    }

    const dados = {
        nome_perfil: userAnswers['name'],
        objetivo: userAnswers['goal'],
        nivel: userAnswers['level']
    };

    try {
        const response = await fetch(`http://localhost:3000/perfil/${userId}/${perfilId}/onboarding`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(dados),
            credentials: 'include'
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Erro desconhecido ao salvar dados.');
        }

        localStorage.setItem(`onboarding_feito_perfil_${perfilId}`, "true");
        localStorage.setItem("nomePerfil", dados.nome_perfil);

        // Barra de progresso cheia antes de sair
        progressBar.style.width = `100%`;
        progressText.innerText = `100%`;

        setTimeout(() => {
            window.location.href = 'home.html';
        }, 800);

    } catch (error) {
        console.error("Erro ao enviar onboarding:", error);
        alert(`Não foi possível salvar suas respostas: ${error.message}`);
        
        btnNext.innerText = "Finalizar Cadastro";
        btnNext.disabled = false;
    }
}

// Event Listeners
btnNext.addEventListener('click', handleNext);
btnBack.addEventListener('click', handleBack);

// Inicializa
renderStep();

// CSS Extra para animação de entrada
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