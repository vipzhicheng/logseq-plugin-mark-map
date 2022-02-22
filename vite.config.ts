import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue'
// import cdnExternals from 'vite-plugin-cdn-externals'

export default defineConfig({
  base: './',
  mode: 'development',
  build: {
    target: 'esnext',
    minify: false
  },
  plugins: [vue()]
})
