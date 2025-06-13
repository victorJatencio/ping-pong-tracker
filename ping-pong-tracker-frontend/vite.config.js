import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  css: {
    preprocessorOptions: {
      scss: {
        // If you need to add global imports or variables
        // additionalData: `@import "./src/styles/_variables.scss";`
        quietDeps: true // This will silence warnings from dependencies
      }
    }
  }
})
