import react from '@vitejs/plugin-react'
import path from 'node:path'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    port: 5185,
    proxy: {
      '/api': 'http://127.0.0.1:8792'
    }
  },
  plugins: [react()]
});
