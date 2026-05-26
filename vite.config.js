import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 3000,
    allowedHosts: ['therahand.info'],
    proxy: {
      '/v0': {
        target: 'http://localhost:3010',
        changeOrigin: true,
        secure: false,
      },
      '/exercises': {
        target: 'http://localhost:3010',
        changeOrigin: true,
        secure: false,
      },
      '/sessions': {
        target: 'http://localhost:3010',
        changeOrigin: true,
        secure: false,
      },
    }
  },
  optimizeDeps: {
    include: [
      '@react-three/drei',
      'stats.js'
    ],
    force: true
  },
  resolve: {
    dedupe: ['react', 'react-dom']
  }
})

