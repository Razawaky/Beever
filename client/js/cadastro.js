document.addEventListener("DOMContentLoaded", () => {
    const form = document.querySelector("form");

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const nome = document.getElementById("name").value;
        const email = document.getElementById("email").value;
        const senha = document.getElementById("senha").value;
        const confirmarSenha = document.getElementById("confirmarSenha").value;
        const data_nasc = document.getElementById("data_nasc").value;

        // validação simples
        if (senha !== confirmarSenha) {
            alert("As senhas não coincidem!");
            return;
        }


        const body = { nome, email, senha, data_nasc, tipo_usuario:"Comum" };

        try {
            const res = await fetch("http://localhost:3000/users", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(body)
            });

            const data = await res.json();

            if (!res.ok) {
                alert("Erro: " + data.error);
                return;
            }

            alert("Usuário criado com sucesso!");

            // faz login automático
            const loginRes = await fetch("http://localhost:3000/sessao/login", {
                method: "POST",
                credentials: "include",  // precisa disso para enviar cookie
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, senha })
            });

            const loginData = await loginRes.json();

            if (!loginRes.ok) {
                alert("Usuário criado, mas houve erro ao logar automaticamente.");
                return;
            }

            // redireciona
            window.location.href = "perfis.html";

        } catch (err) {
            console.error(err);
            alert("Erro ao conectar ao servidor");
        }
    });
});
