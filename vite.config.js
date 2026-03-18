import { defineConfig } from 'vite'

export default defineConfig({
  // Important for GitHub Pages (your repo is deployed under /warpdiff/)
  base: '/warpdiff/',
  
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true
  },
  
  server: {
    open: true  // auto-open browser on npm run dev
  }
})
