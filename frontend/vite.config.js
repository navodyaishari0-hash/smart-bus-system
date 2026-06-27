import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [tailwindcss(), react()],
  server: {
    host: true,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        timeout: 120000,
        configure: (proxy) => {
          proxy.on('error', (err, req, res) => {
            if (res.writeHead) {
              try {
                res.writeHead(502, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Backend unavailable. Is the server running on port 5000?' }));
              } catch (_) { /* ignore */ }
            }
          });
        }
      },
      '/socket.io': {
        target: 'http://localhost:5000',
        ws: true,
        changeOrigin: true
      }
    }
  }
})
