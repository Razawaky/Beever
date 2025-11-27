// Seleciona o formulário de login
const formLogin = document.getElementById("form-login");

if (formLogin) {
  formLogin.addEventListener("submit", async (event) => {
    event.preventDefault();

    // Pega valores dos inputs
    const email = document.getElementById("email").value.trim();
    const senha = document.getElementById("senha").value.trim();

    // Monta o JSON para enviar
    const loginData = {
      email: email,
      senha: senha
    };

    try {
      // Faz requisição para o backend
      const response = await fetch("http://localhost:3000/sessao/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(loginData),
      });

      const data = await response.json();

      // Verifica status da resposta
      if (!response.ok) {
        alert(data.mensagem || "Usuário ou senha incorretos.");
        return;
      }

      // Se logou com sucesso
      alert("Login realizado com sucesso!");

      // Armazena token e nome do usuário (se quiser separar depois, só tirar o nome)
      localStorage.setItem("token", data.token);

        if (data.id) {
            localStorage.setItem("userId", data.id);
        }


        // Se o backend mandar nome, salva também
        if (data.nome) {
            localStorage.setItem("nomeUsuario", data.nome);
        }

      // Redireciona para página principal
      window.location.href = "perfis.html";

    } catch (error) {
      console.error("Erro no login:", error);
      alert("Erro ao conectar com o servidor.");
    }
  });
}
