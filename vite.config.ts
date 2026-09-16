import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { readFileSync } from 'fs'

// 版本号单一来源：Windows 安装包与安卓热更新包都取这里，两端不会脱节
const pkg = JSON.parse(readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8'))

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@components': path.resolve(__dirname, 'src/components'),
      '@stores': path.resolve(__dirname, 'src/stores'),
      '@i18n': path.resolve(__dirname, 'src/i18n/index'),
      '@services': path.resolve(__dirname, 'src/services'),
      '@types': path.resolve(__dirname, 'src/types'),
      '@utils': path.resolve(__dirname, 'src/utils'),
      '@styles': path.resolve(__dirname, 'src/styles')
    }
  },
  base: './',
  server: {
    watch: {
      // Windows 环境下默认文件监听可能漏事件，导致 HMR/刷新拿到过期模块，改用轮询
      usePolling: true,
      interval: 300
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
})
