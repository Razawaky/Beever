// Import styles
import '../main.css';

// Shop Data
const CATEGORIES = [
  {
    id: "power-ups",
    name: "Power-ups",
    items: [
      { id: "shield-1", name: "Escudo", description: "Proteção básica", icon: "🛡️", price: 50 },
      { id: "heart-1", name: "Vida Extra", description: "+1 vida", icon: "❤️", price: 40 },
      { id: "zap-1", name: "Energia", description: "Dobro de velocidade", icon: "⚡", price: 45 },
      { id: "sword-1", name: "Espada", description: "Ataque melhorado", icon: "⚔️", price: 75 },
      { id: "shield-2", name: "Super Escudo", description: "Proteção máxima", icon: "🛡️", price: 100 },
      { id: "flame-1", name: "Chama", description: "Poder de fogo", icon: "🔥", price: 85 },
    ],
  },
  {
    id: "cosmetics",
    name: "Cosméticos",
    items: [
      { id: "gem-1", name: "Gema Azul", description: "Brilho especial", icon: "💎", price: 30 },
      { id: "star-1", name: "Estrela", description: "Efeito estelar", icon: "⭐", price: 60 },
      { id: "sparkles-1", name: "Brilhos", description: "Partículas mágicas", icon: "✨", price: 35 },
      { id: "crown-1", name: "Coroa", description: "Realeza", icon: "👑", price: 120 },
      { id: "gem-2", name: "Gema Rosa", description: "Aura especial", icon: "💎", price: 40 },
      { id: "sparkles-2", name: "Aura", description: "Efeito de aura", icon: "✨", price: 55 },
    ],
  },
  {
    id: "bundles",
    name: "Pacotes",
    items: [
      { id: "bundle-1", name: "Pacote Iniciante", description: "Kit básico completo", icon: "🏆", price: 150 },
      { id: "bundle-2", name: "Pacote Pro", description: "Para jogadores avançados", icon: "🏆", price: 300 },
      { id: "bundle-3", name: "Pacote Estrela", description: "Coleção premium", icon: "⭐", price: 250 },
      { id: "bundle-4", name: "Mega Pacote", description: "Tudo que você precisa", icon: "👑", price: 500 },
      { id: "bundle-5", name: "Pacote Sortudo", description: "Itens aleatórios", icon: "💎", price: 200 },
      { id: "bundle-6", name: "Pacote Guerreiro", description: "Arsenal completo", icon: "⚔️", price: 350 },
    ],
  },
];

// State Management
const state = {
  balance: 999,
  inventory: [],
  selectedItems: new Set(),
  currentCategoryIndex: 0,
  showPurchaseModal: false,
  showSuccessModal: false,
  showInventoryModal: false,
};

const STORAGE_KEY = "gamified-shop-user";

// Load state from localStorage
function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      state.balance = parsed.balance || 999;
      state.inventory = parsed.inventory || [];
    } catch (error) {
      console.error("Error loading state:", error);
    }
  }
}

// Save state to localStorage
function saveState() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      balance: state.balance,
      inventory: state.inventory,
    })
  );
}

// Get current category
function getCurrentCategory() {
  return CATEGORIES[state.currentCategoryIndex];
}

// Get selected items with full details
function getSelectedItems() {
  const category = getCurrentCategory();
  return category.items.filter((item) => state.selectedItems.has(item.id));
}

// Calculate total price
function calculateTotal() {
  return getSelectedItems().reduce((sum, item) => sum + item.price, 0);
}

// Render shop grid
function renderShopGrid() {
  const grid = document.getElementById("shop-grid");
  const category = getCurrentCategory();
  
  grid.innerHTML = category.items
    .map((item) => {
      const isSelected = state.selectedItems.has(item.id);
      const isOwned = state.inventory.includes(item.id);
      
      return `
        <button 
          class="relative aspect-square bg-white rounded-2xl flex flex-col items-center justify-center gap-2 p-3 transition-all duration-200 ease-out ${
            isOwned
              ? "opacity-50 cursor-not-allowed grayscale"
              : "hover:scale-105 active:scale-95"
          } ${
            isSelected && !isOwned
              ? "selected-glow scale-105"
              : "shadow-game hover:shadow-game-hover"
          }"
          data-item-id="${item.id}"
          ${isOwned ? "disabled" : ""}
        >
          ${
            isSelected && !isOwned
              ? `<div class="absolute -top-2 -right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center shadow-lg animate-scale-in z-10">
                  <svg class="w-4 h-4 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="3">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>`
              : ""
          }
          <div class="w-12 h-12 rounded-xl flex items-center justify-center item-card-icon ${
            isSelected && !isOwned ? "bg-yellow-100" : "bg-purple-100"
          } transition-colors text-3xl">
            ${item.icon}
          </div>
          <span class="text-xs font-bold item-card-price ${
            isOwned ? "text-green-500" : "text-gray-800"
          }">
            ${isOwned ? "Adquirido" : `$${item.price}`}
          </span>
        </button>
      `;
    })
    .join("");
  
  // Add click listeners
  grid.querySelectorAll("button[data-item-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const itemId = btn.dataset.itemId;
      if (!state.inventory.includes(itemId)) {
        toggleItemSelection(itemId);
      }
    });
  });
}

// Toggle item selection
function toggleItemSelection(itemId) {
  if (state.selectedItems.has(itemId)) {
    state.selectedItems.delete(itemId);
  } else {
    state.selectedItems.add(itemId);
  }
  updateUI();
}

// Update UI
function updateUI() {
  // Update balance
  document.getElementById("balance").textContent = state.balance;
  
  // Update category name
  document.getElementById("category-name").textContent = getCurrentCategory().name;
  
  // Update cart summary
  const total = calculateTotal();
  const count = state.selectedItems.size;
  const cartSummary = document.getElementById("cart-summary");
  const confirmBtn = document.getElementById("confirm-btn");
  
  if (count > 0) {
    cartSummary.classList.remove("hidden");
    cartSummary.classList.add("flex", "animate-bounce-in");
    document.getElementById("cart-total").textContent = `$${total}`;
    document.getElementById("cart-count").textContent = count;
    confirmBtn.disabled = false;
  } else {
    cartSummary.classList.add("hidden");
    cartSummary.classList.remove("flex");
    confirmBtn.disabled = true;
  }
  
  // Update inventory badge
  const inventoryBadge = document.getElementById("inventory-badge");
  if (state.inventory.length > 0) {
    inventoryBadge.textContent = state.inventory.length;
    inventoryBadge.classList.remove("hidden");
    inventoryBadge.classList.add("flex");
  } else {
    inventoryBadge.classList.add("hidden");
  }
  
  // Render grid
  renderShopGrid();
}

// Navigate categories
function navigateCategory(direction) {
  if (direction === "prev") {
    state.currentCategoryIndex =
      state.currentCategoryIndex === 0
        ? CATEGORIES.length - 1
        : state.currentCategoryIndex - 1;
  } else {
    state.currentCategoryIndex =
      (state.currentCategoryIndex + 1) % CATEGORIES.length;
  }
  state.selectedItems.clear();
  updateUI();
}

// Show purchase modal
function showPurchaseModal() {
  if (state.selectedItems.size === 0) return;
  
  const modal = document.getElementById("purchase-modal");
  const content = document.getElementById("modal-content");
  const selectedItems = getSelectedItems();
  const total = calculateTotal();
  const hasEnoughBalance = state.balance >= total;
  
  content.innerHTML = `
    <button class="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors" onclick="closePurchaseModal()">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
    
    <h2 class="text-2xl font-bold text-gray-800 mb-4">Confirmar Compra</h2>
    
    <div class="space-y-3 mb-6 max-h-64 overflow-y-auto">
      ${selectedItems
        .map(
          (item) => `
        <div class="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
          <div class="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center text-2xl">
            ${item.icon}
          </div>
          <div class="flex-1">
            <p class="font-semibold text-gray-800">${item.name}</p>
            <p class="text-sm text-gray-500">${item.description}</p>
          </div>
          <p class="font-bold text-primary">$${item.price}</p>
        </div>
      `
        )
        .join("")}
    </div>
    
    <div class="space-y-2 mb-6 p-4 bg-gray-50 rounded-xl">
      <div class="flex justify-between text-sm">
        <span class="text-gray-600">Saldo Atual:</span>
        <span class="font-bold">$${state.balance}</span>
      </div>
      <div class="flex justify-between text-sm">
        <span class="text-gray-600">Total:</span>
        <span class="font-bold text-primary">$${total}</span>
      </div>
      <div class="border-t border-gray-200 pt-2 mt-2">
        <div class="flex justify-between">
          <span class="font-bold">Saldo Final:</span>
          <span class="font-bold ${
            hasEnoughBalance ? "text-green-500" : "text-red-500"
          }">
            $${state.balance - total}
          </span>
        </div>
      </div>
    </div>
    
    ${
      !hasEnoughBalance
        ? `<div class="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
            <p class="text-sm text-red-600 font-semibold text-center">Saldo insuficiente!</p>
          </div>`
        : ""
    }
    
    <div class="flex gap-3">
      <button class="flex-1 h-12 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold rounded-xl transition-colors" onclick="closePurchaseModal()">
        Cancelar
      </button>
      <button class="flex-1 h-12 bg-primary hover:bg-yellow-500 text-gray-800 font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed" onclick="confirmPurchase()" ${
        !hasEnoughBalance ? "disabled" : ""
      }>
        <span class="flex items-center justify-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="3">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Comprar
        </span>
      </button>
    </div>
  `;
  
  modal.classList.remove("hidden");
  modal.classList.add("flex", "animate-fade-in");
}

// Show success modal
function showSuccessModal() {
  const content = document.getElementById("modal-content");
  const purchasedItems = getSelectedItems();
  
  content.innerHTML = `
    <div class="text-center animate-scale-in">
      <h2 class="text-3xl font-bold text-primary mb-6">Compra Realizada! 🎉</h2>
      
      <p class="text-gray-600 mb-6">Você adquiriu:</p>
      
      <div class="flex justify-center gap-4 mb-8 flex-wrap">
        ${purchasedItems
          .map(
            (item) => `
          <div class="w-20 h-20 rounded-2xl bg-yellow-100 flex items-center justify-center animate-bounce-in text-4xl">
            ${item.icon}
          </div>
        `
          )
          .join("")}
      </div>
      
      <button class="w-full h-12 bg-primary hover:bg-yellow-500 text-gray-800 font-bold rounded-xl transition-colors" onclick="closeSuccessModal()">
        Legal!
      </button>
    </div>
  `;
}

// Confirm purchase
function confirmPurchase() {
  const total = calculateTotal();
  
  // Deduct balance
  state.balance -= total;
  
  // Add items to inventory
  state.inventory.push(...Array.from(state.selectedItems));
  
  // Save state
  saveState();
  
  // Show success modal
  showSuccessModal();
}

// Close modals
function closePurchaseModal() {
  const modal = document.getElementById("purchase-modal");
  modal.classList.add("hidden");
  modal.classList.remove("flex");
}

function closeSuccessModal() {
  closePurchaseModal();
  state.selectedItems.clear();
  updateUI();
}

// Show inventory modal
function showInventoryModal() {
  const modal = document.getElementById("inventory-modal");
  const content = document.getElementById("inventory-content");
  
  // Get full item details from inventory IDs
  const inventoryItems = [];
  CATEGORIES.forEach((category) => {
    category.items.forEach((item) => {
      if (state.inventory.includes(item.id)) {
        inventoryItems.push(item);
      }
    });
  });
  
  content.innerHTML = `
    <button class="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors" onclick="closeInventoryModal()">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
    
    <h2 class="text-2xl font-bold text-gray-800 mb-6">Meu Inventário</h2>
    
    ${
      inventoryItems.length === 0
        ? `
      <div class="py-12 text-center">
        <div class="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gray-100 flex items-center justify-center text-4xl">
          📦
        </div>
        <p class="text-gray-600 text-lg mb-2">Sua mochila está vazia!</p>
        <p class="text-sm text-gray-500">Compre itens na loja para vê-los aqui</p>
      </div>
    `
        : `
      <div class="max-h-96 overflow-y-auto mb-6">
        <div class="grid grid-cols-3 gap-3">
          ${inventoryItems
            .map(
              (item) => `
            <div class="aspect-square bg-gray-50 rounded-2xl flex flex-col items-center justify-center gap-2 p-3">
              <div class="w-10 h-10 rounded-xl bg-yellow-100 flex items-center justify-center text-2xl">
                ${item.icon}
              </div>
              <span class="text-xs font-semibold text-gray-800 text-center line-clamp-2">
                ${item.name}
              </span>
            </div>
          `
            )
            .join("")}
        </div>
      </div>
    `
    }
    
    <button class="w-full h-12 bg-primary hover:bg-yellow-500 text-gray-800 font-bold rounded-xl transition-colors" onclick="closeInventoryModal()">
      Fechar
    </button>
  `;
  
  modal.classList.remove("hidden");
  modal.classList.add("flex", "animate-fade-in");
}

function closeInventoryModal() {
  const modal = document.getElementById("inventory-modal");
  modal.classList.add("hidden");
  modal.classList.remove("flex");
}

// Make functions global for onclick handlers
window.closePurchaseModal = closePurchaseModal;
window.closeSuccessModal = closeSuccessModal;
window.confirmPurchase = confirmPurchase;
window.showInventoryModal = showInventoryModal;
window.closeInventoryModal = closeInventoryModal;

// Initialize app
function init() {
  loadState();
  updateUI();
  
  // Event listeners
  document.getElementById("prev-category").addEventListener("click", () => navigateCategory("prev"));
  document.getElementById("next-category").addEventListener("click", () => navigateCategory("next"));
  document.getElementById("confirm-btn").addEventListener("click", showPurchaseModal);
  document.getElementById("inventory-btn").addEventListener("click", showInventoryModal);
  
  // Close modals on backdrop click
  document.getElementById("modal-backdrop").addEventListener("click", closePurchaseModal);
  document.getElementById("inventory-backdrop").addEventListener("click", closeInventoryModal);
}

// Start app when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}