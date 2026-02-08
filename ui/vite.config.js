import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  root: __dirname,
  base: './',
  server: {
    port: 5176,
    strictPort: true
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
})