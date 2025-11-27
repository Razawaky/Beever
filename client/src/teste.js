  
// Learning path data
const pathData = [
  { level: 1, type: 'complete', position: 'center', progress: 100 },
  { level: 2, type: 'complete', position: 'left', progress: 100 },
  { level: 3, type: 'complete', position: 'center', progress: 100 },
  { level: 4, type: 'active', position: 'right', progress: 75 },
  { level: 5, type: 'locked', position: 'center', progress: 0 },
  { level: 6, type: 'locked', position: 'left', progress: 0 },
  { type: 'treasure', position: 'center', progress: 0 },
  { level: 7, type: 'locked', position: 'right', progress: 0 },
  { level: 8, type: 'locked', position: 'center', progress: 0 },
];

// Theme toggle functionality
const themeToggle = document.getElementById('theme-toggle');
const sunIcon = document.getElementById('sun-icon');
const moonIcon = document.getElementById('moon-icon');
const html = document.documentElement;

function updateThemeIcons() {
  const isDark = html.classList.contains('dark');
  if (isDark) {
    sunIcon.classList.remove('hidden');
    moonIcon.classList.add('hidden');
  } else {
    sunIcon.classList.add('hidden');
    moonIcon.classList.remove('hidden');
  }
}

themeToggle.addEventListener('click', () => {
  html.classList.toggle('dark');
  updateThemeIcons();
});

// Initialize theme icons
updateThemeIcons();

// Create SVG progress ring
function createProgressRing(progress) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return `
    <svg class="absolute -m-3 pointer-events-none" width="120" height="120" viewBox="0 0 120 120">
      <circle
        cx="60"
        cy="60"
        r="${radius}"
        stroke="currentColor"
        stroke-width="2"
        fill="none"
        class="text-muted/20"
      />
      <circle
        cx="60"
        cy="60"
        r="${radius}"
        stroke="currentColor"
        stroke-width="2"
        fill="none"
        stroke-dasharray="${circumference}"
        stroke-dashoffset="${offset}"
        transform="rotate(-90 60 60)"
        class="text-primary transition-all duration-500"
      />
    </svg>
  `;
}

// Create path node
function createNode(data, index) {
  const { level, type, position, progress } = data;
  
  const positionClass = 
    position === 'left' ? '-translate-x-16' :
    position === 'right' ? 'translate-x-16' :
    '';

  const showProgress = type === 'complete' && progress > 0;
  const isTreasure = type === 'treasure';
  
  let stateClass = '';
  let icon = '';
  
  if (type === 'active') {
    stateClass = 'node-active';
    icon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
  } else if (type === 'complete') {
    stateClass = 'node-complete';
    icon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
  } else if (type === 'treasure') {
    stateClass = 'node-treasure';
    icon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>`;
  } else {
    stateClass = 'node-locked';
    icon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`;
  }

  const nodeHTML = `
    <div class="relative flex justify-center items-center">
      ${showProgress ? createProgressRing(progress) : ''}
      <button 
        class="hexagon ${stateClass} w-16 h-16 flex items-center justify-center transition-all hover-lift relative ${positionClass}"
        ${type === 'locked' ? 'disabled' : ''}
        aria-label="${isTreasure ? 'Treasure chest' : `Level ${level} - ${type}`}"
      >
        ${icon}
      </button>
      ${showProgress ? `
        <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div class="text-xs font-bold text-white mt-8">
            ${progress}%
          </div>
        </div>
      ` : ''}
      ${type === 'active' ? `
        <div class="absolute -right-10 top-1/2 -translate-y-1/2 animate-float">
          <div class="bee-icon">
            <div class="bee-body"></div>
            <div class="bee-wing bee-wing-left"></div>
            <div class="bee-wing bee-wing-right"></div>
          </div>
        </div>
      ` : ''}
    </div>
  `;

  // Create connector if not the first node
  if (index > 0) {
    const prevPosition = pathData[index - 1].position;
    const connector = createConnector(prevPosition, position);
    return connector + nodeHTML;
  }

  return nodeHTML;
}

// Create path connector
function createConnector(fromPos, toPos) {
  let path = '';
  
  if (fromPos === 'center' && toPos === 'left') {
    path = 'M 0,-24 Q -32,-12 -64,0';
  } else if (fromPos === 'left' && toPos === 'center') {
    path = 'M -64,-24 Q -32,-12 0,0';
  } else if (fromPos === 'center' && toPos === 'right') {
    path = 'M 0,-24 Q 32,-12 64,0';
  } else if (fromPos === 'right' && toPos === 'center') {
    path = 'M 64,-24 Q 32,-12 0,0';
  } else {
    path = 'M 0,-24 L 0,0';
  }

  return `
    <div class="flex justify-center -my-6">
      <svg width="128" height="48" viewBox="-64 -24 128 48" class="overflow-visible">
        <path 
          d="${path}" 
          stroke="currentColor" 
          stroke-width="3" 
          stroke-dasharray="6 4"
          fill="none" 
          class="text-secondary"
        />
      </svg>
    </div>
  `;
}

// Render learning path
function renderLearningPath() {
  const container = document.getElementById('learning-path');
  const html = pathData.map((data, index) => createNode(data, index)).join('');
  container.innerHTML = html;
}

// Initialize
renderLearningPath();
