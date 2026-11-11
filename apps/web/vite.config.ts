import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import ui from '@nuxt/ui/vite'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    ui({
      ui: {
        // OOTB semantic hues — blue brand (not green); success stays green for “approved”.
        colors: {
          primary: 'blue',
          secondary: 'sky',
          success: 'green',
          info: 'cyan',
          warning: 'amber',
          error: 'rose',
          neutral: 'zinc',
        },
      },
    }),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    // Fail loudly instead of silently moving to 5174 (breaks FRONT_END_URL / CORS).
    strictPort: true,
  },
})
