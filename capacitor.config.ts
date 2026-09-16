import type { CapacitorConfig } from '@capacitor/cli'

/**
 * Capacitor 容器配置
 *
 * 安卓壳只是一个 WebView 宿主，真正的业务代码全部来自 webDir 指向的 dist/。
 * 这个目录同时也是 Windows 版（installer/build-sea.mjs）的输入，
 * 因此两个平台天然消费同一份产物。
 */
const config: CapacitorConfig = {
  appId: 'com.koipoppy.chillpass',
  appName: 'ChillPass',
  webDir: 'dist',
  android: {
    // 页面源为 https://localhost，与 index.html 里 CSP 的 'self' 一致
    allowMixedContent: false,
  },
}

export default config
