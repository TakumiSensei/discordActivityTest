import {defineConfig} from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  envDir: '../',
  server: {
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      '.trycloudflare.com', // Allow all Cloudflare Tunnel hosts
      'sk-spreading-details-improving.trycloudflare.com' // Specific host if needed
    ],
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
    hmr: {
      clientPort: 443,
    },
  },
});
