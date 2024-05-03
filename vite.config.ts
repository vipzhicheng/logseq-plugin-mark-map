import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
// import cdnExternals from 'vite-plugin-cdn-externals'
import path from 'path'

export default defineConfig({
  base: './',
  // mode: 'development',
  build: {
    target: 'esnext',
    // sourcemap: true,
    minify: 'esbuild',
    chunkSizeWarningLimit: 1024,
    rollupOptions: {
      output: {
        manualChunks: {
          logseq: ['@logseq/libs'],
          markmap: [
            'markmap-view',
            'markmap-lib',
            'markmap-common',
            'markmap-toolbar',
          ],
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  plugins: [vue()],
})
