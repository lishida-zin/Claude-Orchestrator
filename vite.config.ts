import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'
import path from 'path'
import fs from 'fs'

// preload.cjs を dist-electron にコピーするプラグイン
const copyPreload = () => ({
  name: 'copy-preload',
  buildStart() {
    const src = path.resolve(__dirname, 'electron/preload.cjs')
    const dest = path.resolve(__dirname, 'dist-electron/preload.cjs')
    const destDir = path.dirname(dest)
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true })
    }
    fs.copyFileSync(src, dest)
  }
})

export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        entry: 'electron/main.ts',
        vite: {
          build: {
            outDir: 'dist-electron',
            rollupOptions: {
              external: ['node-pty'],
              output: {
                format: 'es',
                entryFileNames: '[name].mjs'
              }
            }
          },
          plugins: [copyPreload()]
        }
      }
    ]),
    renderer()
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  build: {
    outDir: 'dist'
  }
})
