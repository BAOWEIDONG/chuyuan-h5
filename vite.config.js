import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { copyFileSync } from 'node:fs'

// base 可用环境变量覆盖，GitHub Pages 项目站默认 /chuyuan-h5/
// hash 路由下刷新不会 404，404.html 只是兜底（防止深链被直接访问时白屏）
function spaFallback() {
  return {
    name: 'spa-404-fallback',
    closeBundle() {
      try {
        copyFileSync('dist/index.html', 'dist/404.html')
      } catch (e) {
        // 首次构建前 index.html 可能尚未产出
      }
    }
  }
}

export default defineConfig({
  base: process.env.BASE_PATH || '/chuyuan-h5/',
  plugins: [vue(), spaFallback()],
  build: { outDir: 'dist', assetsDir: 'assets' },
  test: { environment: 'jsdom', globals: true, include: ['tests/**/*.spec.js'], testTimeout: 30000 }
})
