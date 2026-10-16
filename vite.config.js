import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Em desenvolvimento, /api/cnpj/:cnpj é repassado direto para a BrasilAPI.
// Na Vercel, a mesma rota é atendida pela função em api/cnpj/[cnpj].js.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api/cnpj': {
        target: 'https://brasilapi.com.br',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/cnpj/, '/api/cnpj/v1'),
      },
    },
  },
});
