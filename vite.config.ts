import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Plugin to stub bcryptjs in production builds (not used when backend API is enabled)
const stubBcryptjs = () => ({
  name: 'stub-bcryptjs',
  resolveId(id: string) {
    if (id === 'bcryptjs') {
      return id; // Return the id to mark it as resolved
    }
  },
  load(id: string) {
    if (id === 'bcryptjs') {
      // Return a stub module that throws an error if used
      return `
        export default {
          hash: async () => {
            throw new Error('bcryptjs is not available in production builds. Browser auth service should not be used when VITE_USE_BACKEND_API=true.');
          },
          compare: async () => {
            throw new Error('bcryptjs is not available in production builds. Browser auth service should not be used when VITE_USE_BACKEND_API=true.');
          }
        };
        export const hash = async () => {
          throw new Error('bcryptjs is not available in production builds.');
        };
        export const compare = async () => {
          throw new Error('bcryptjs is not available in production builds.');
        };
      `;
    }
  },
});

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), stubBcryptjs()],
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
    },
    rollupOptions: {
      // bcryptjs is stubbed by the plugin, so don't mark as external
    },
  }
})








