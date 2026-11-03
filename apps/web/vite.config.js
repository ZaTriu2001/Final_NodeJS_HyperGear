import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: { dedupe: ['react', 'react-dom'] },
  server: {
    port: process.env.HYPERGEAR_LOCAL ? 8080 : 5173,
    host: '127.0.0.1',
    proxy: {
      '/api': process.env.HYPERGEAR_LOCAL ? 'http://127.0.0.1:3080' : 'http://localhost:8080',
      '/socket.io': { target: process.env.HYPERGEAR_LOCAL ? 'http://127.0.0.1:3080' : 'http://localhost:8080', ws: true },
    },
  },
  root: fileURLToPath(new URL('.', import.meta.url)),
});

