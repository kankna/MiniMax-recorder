import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // GitHub Pages 部署在 /<repo>/ 子路径下，所有资源用相对路径
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: null,
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        id: 'recorder',
        name: '私人档案 · Recorder',
        short_name: '档案',
        description: '速记 → 日志 → 知识，三层私人记录系统。数据存在本机，随时导出为 Markdown。',
        lang: 'zh-CN',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#F6F3EC',
        theme_color: '#F6F3EC',
        categories: ['productivity', 'utilities'],
        icons: [
          { src: './icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: './icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: './icons/maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: './icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        share_target: {
          action: './share',
          method: 'GET',
          params: { title: 'title', text: 'text', url: 'url' },
        },
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // 分享进来的地址（/share?text=…）也由 index.html 接管，
        // 这样即便 Service Worker 还没装上，也有 404.html 兜底
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        clientsClaim: false,
      },
      devOptions: { enabled: false },
    }),
  ],
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 900,
  },
});
