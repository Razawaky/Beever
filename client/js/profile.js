document.addEventListener("DOMContentLoaded", () => {
    const user = localStorage.getItem("nomeUsuario");
    const perfil = localStorage.getItem("nomePerfil");
    const moedas = localStorage.getItem("moedas");

    if (user) {
        document.getElementById("nomeUser").textContent = user;
    } else {
        console.log("Nenhum nome encontrado no localStorage");
    }

    if (perfil) {
        document.getElementById("nomePerfil").textContent = perfil;
    }

    if (moedas) {
        document.getElementById("moedas").textContent = `💰 ${moedas} moedas`;
    }
});