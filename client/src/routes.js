class Router {
    constructor(rootElementId) {
        this.routes = [];
        this.rootElement = document.getElementById(rootElementId);
        
        this.addEventListeners();
    }

    get(uri, callback) {
        if (!uri || !callback) {
            throw new Error('A rota (URI) e o callback são obrigatórios.');
        }

        this.routes.push({
            uri,
            callback
        });
    }

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

        if (!matched) {
            if (this.rootElement) {
                this.rootElement.innerHTML = '<h1>404</h1><p>Página não encontrada.</p>';
            }
        }
    }

    navigateTo(uri) {
        if (uri !== window.location.pathname) {
            history.pushState(null, null, uri);
            this.init(); // Rerenderiza o conteúdo
        }
    }

    addEventListeners() {
        document.addEventListener("click", e => {
            const target = e.target.closest('a');
            
            if (target && target.host === window.location.host) {
                e.preventDefault(); 
                this.navigateTo(target.pathname);
            }
        });

        window.addEventListener('popstate', () => this.init());
    }
}

export default Router;