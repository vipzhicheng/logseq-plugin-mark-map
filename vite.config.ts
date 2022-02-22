import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue'
// import cdnExternals from 'vite-plugin-cdn-externals'

export default defineConfig({
  base: './',
  mode: 'development',
  build: {
    target: 'esnext',
    minify: 'esbuild',
    chunkSizeWarningLimit: 1024,
    rollupOptions: {
      output: {
        manualChunks: {
          markmap: ['markmap-view', 'markmap-lib', 'markmap-common', 'markmap-toolbar']
        }

      }
    }
  },
  plugins: [vue()]
})
