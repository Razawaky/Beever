// ============================
// CARREGAR PERFIS
// ============================

document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("token");
  const userId = localStorage.getItem("userId");

  if (!token || !userId) {
    alert("Login necessário!");
    window.location.href = "login.html";
    return;
  }

  carregarPerfis();
});

// ----------------------------

async function carregarPerfis() {
  const userId = localStorage.getItem("userId");
  const lista = document.getElementById("listaPerfis");

  lista.innerHTML = "<p>Carregando...</p>";

  try {
    const res = await fetch(`http://localhost:3000/perfil/${userId}`, {
      credentials: "include"
    });

    if (!res.ok) {
      lista.innerHTML = "<p>Nenhum perfil encontrado</p>";
      return;
    }

    const perfis = await res.json();
    lista.innerHTML = "";

    perfis.forEach(perfil => {
  const wrapper = document.createElement("div");
  wrapper.className = "relative p-4 bg-gray-200 rounded-xl flex justify-between items-center hover:bg-gray-300 cursor-pointer";

  // conteúdo principal
  const info = document.createElement("div");
  info.className = "flex flex-col";
  info.innerHTML = `
    <span class="text-lg font-medium">${perfil.nome_perfil}</span>
    <span class="text-sm text-gray-600">Moedas: ${perfil.moedas}</span>
  `;

  // clique no perfil (wrapper) vai pra escolherPerfil
  wrapper.addEventListener("click", () => escolherPerfil(perfil));

  // botão menu
  const menuBtn = document.createElement("button");
  menuBtn.innerHTML = "⋮";
  menuBtn.className = "text-xl px-2 py-1 rounded hover:bg-gray-400 select-none";

  // menu suspenso
  const menu = document.createElement("div");
  menu.className = "menu-perfil absolute right-4 top-12 bg-white border shadow-lg rounded-xl p-2 hidden";
  menu.innerHTML = `
    <button class="text-red-600 hover:bg-red-100 w-full text-left px-3 py-2 rounded">Excluir perfil</button>
  `;

  // abrir/fechar menu
  menuBtn.addEventListener("click", (e) => {
    e.stopPropagation(); // impede abrir o perfil
    menu.classList.toggle("hidden");
  });

  // ação de excluir
  menu.querySelector("button").addEventListener("click", (e) => {
    e.stopPropagation(); // não dispara clique do wrapper
    excluirPerfil(perfil.id);
  });

  wrapper.appendChild(info);
  wrapper.appendChild(menuBtn);
  wrapper.appendChild(menu);
  lista.appendChild(wrapper);
});


  } catch (error) {
    console.error(error);
    lista.innerHTML = "<p>Erro ao carregar perfis</p>";
  }
}

//EXCLUIR PERFIL
async function excluirPerfil(perfilId) {
  const userId = localStorage.getItem("userId");

  if (!confirm("Tem certeza que deseja excluir este perfil?")) return;

  try {
    const res = await fetch(`http://localhost:3000/perfil/${userId}/${perfilId}`, {
      method: "DELETE",
      credentials: "include"
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Erro ao excluir perfil");
      return;
    }

    alert("Perfil excluído!");
    carregarPerfis();

  } catch (error) {
    console.error(error);
    alert("Erro ao excluir perfil");
  }
}


// ============================
// LOGIN DO PERFIL
// ============================

async function escolherPerfil(perfil) {
  const senha = prompt(`Digite a senha do perfil "${perfil.nome_perfil}":`);

  if (!senha) return;

  const userId = localStorage.getItem("userId");

  try {
    const res = await fetch(`http://localhost:3000/perfil/${userId}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        nome_perfil: perfil.nome_perfil,
        senha_perfil: senha
      })
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Senha incorreta");
      return;
    }

    // Salva perfil logado
    localStorage.setItem("perfilId", data.id);
    localStorage.setItem("nomePerfil", data.nome_perfil);
    localStorage.setItem("moedas", data.moedas || 0);

    window.location.href = "home.html";

  } catch (error) {
    console.error(error);
    alert("Erro ao autenticar perfil");
  }
}

// ============================
// MODAL — abrir e fechar
// ============================

const modal = document.getElementById("modalCriarPerfil");
document.getElementById("btnCriar").addEventListener("click", () => modal.classList.remove("hidden"));
document.getElementById("btnCancelar").addEventListener("click", () => modal.classList.add("hidden"));

// ============================
// CRIAR NOVO PERFIL
// ============================

document.getElementById("btnSalvar").addEventListener("click", async () => {
  const nome = document.getElementById("nomePerfil").value.trim();
  const senha = document.getElementById("senhaPerfil").value.trim();
  const dataNasc = document.getElementById("dataNasc").value;

  const userId = localStorage.getItem("userId");

  if (!nome || !senha || !dataNasc) {
    alert("Preencha todos os campos!");
    return;
  }

  try {
    const res = await fetch(`http://localhost:3000/perfil/${userId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        nome_perfil: nome,
        senha_perfil: senha,
        data_nasc: dataNasc,
        avatar_img: null
      })
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Erro ao criar perfil");
      return;
    }

    alert("Perfil criado com sucesso!");

    // Fechar modal
    modal.classList.add("hidden");

    // Atualizar lista
    carregarPerfis();

  } catch (error) {
    console.error(error);
    alert("Erro ao criar perfil");
  }
});
