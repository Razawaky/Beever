document.addEventListener("DOMContentLoaded", () => {
    const perfil = localStorage.getItem("nomePerfil");
    const moedas = localStorage.getItem("moedas");

    if (perfil) {
        document.getElementById("nomePerfil").textContent = perfil;
    }

    if (moedas) {
        document.getElementById("moedas").textContent = `${moedas}`;
    }
});