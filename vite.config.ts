import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true
  },
  optimizeDeps: {
    include: ['sql.js']
  },
  assetsInclude: ['**/*.wasm'],
  build: {
    commonjsOptions: {
      include: [/sql.js/, /node_modules/],
      transformMixedEsModules: true
    }
  }
})








