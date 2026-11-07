import { defineConfig } from 'vite'
import { mdxPlugin } from './build/plugin'

export default defineConfig({
  base: './',
  plugins: [mdxPlugin()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    target: 'es2022',
    // three.js 单独成块（按需加载），它自己就有 600 kB，这条阈值是给它让路的。
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks: { gsap: ['gsap'] },
      },
    },
  },
})
