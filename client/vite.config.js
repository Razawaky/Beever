// vite.config.js
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    tailwindcss(),
    // ... outros plugins
  ],
  
  // 🐛 SOLUÇÃO: Adicione esta seção
  optimizeDeps: {
    // Exclui os pacotes problemáticos da pré-otimização do Vite/esbuild
    exclude: [
      'tailwindcss',
      '@tailwindcss/oxide',
      'lightningcss'
    ],
  },
})