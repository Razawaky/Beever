// src/router.js

/**
 * Classe Router (Roteador) para gerenciar a navegação em uma SPA (Single-Page Application).
 */
class Router {
    constructor(rootElementId) {
        this.routes = [];
        this.rootElement = document.getElementById(rootElementId);
        
        // Liga os listeners de evento ao ser instanciada
        this.addEventListeners();
    }

    // 1. Método para registrar uma nova rota
    get(uri, callback) {
        if (!uri || !callback) {
            throw new Error('A rota (URI) e o callback são obrigatórios.');
        }

        this.routes.push({
            uri,
            callback
        });
    }

    // 2. Método principal para processar e renderizar a rota atual
    async init() {
        const currentPath = window.location.pathname;
        let matched = false;

        // Procura uma rota correspondente
        for (const route of this.routes) {
            if (route.uri === currentPath) {
                // Chama a função de callback e espera por ela
                const content = await route.callback();
                
                // Renderiza o conteúdo (supomos que o callback retorna o HTML)
                if (this.rootElement) {
                    this.rootElement.innerHTML = content;
                } else {
                    console.error(`Elemento raiz com ID '${this.rootElementId}' não encontrado.`);
                }
                
                matched = true;
                break;
            }
        }

        // 3. Trata o erro 404
        if (!matched) {
            if (this.rootElement) {
                this.rootElement.innerHTML = '<h1>404</h1><p>Página não encontrada.</p>';
            }
        }
    }

    // 4. Navega alterando o histórico (History API)
    navigateTo(uri) {
        if (uri !== window.location.pathname) {
            history.pushState(null, null, uri);
            this.init(); // Rerenderiza o conteúdo
        }
    }

    // 5. Adiciona listeners para cliques e para os botões Voltar/Avançar
    addEventListeners() {
        // A) Listener de Clique (para interceptar navegação de <a>)
        document.addEventListener("click", e => {
            // Verifica se o clique foi em um <a> e se é um link interno
            const target = e.target.closest('a');
            
            // target.host === window.location.host garante que não interceptamos links externos
            if (target && target.host === window.location.host) {
                e.preventDefault(); // Impede o recarregamento da página!
                this.navigateTo(target.pathname);
            }
        });

        // B) Listener de popstate (para botões Voltar/Avançar do navegador)
        window.addEventListener('popstate', () => this.init());
    }
}

// Exporta a classe Router para que ela possa ser instanciada no main.js
export default Router;