import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import { VitePWA } from 'vite-plugin-pwa'
export default defineConfig(() => {
  const pwaPlugins = VitePWA({
    registerType: 'prompt',
    includeAssets: ['favicon.svg'],
    manifest: {
      name: 'PDF 拆分工具',
      short_name: 'PDF 拆分',
      description: 'PDF 全程在裝置中處理的隱私優先拆分工具',
      theme_color: '#08783f',
      background_color: '#f7f9fb',
      display: 'standalone',
      start_url: './',
      scope: './',
      icons: [
        { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
        { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
        { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    workbox: {
      globPatterns: ['**/*.{js,mjs,css,html,svg,png,woff2}'],
      maximumFileSizeToCacheInBytes: 2 * 1024 * 1024,
      cleanupOutdatedCaches: true,
    },
  })

  return {
    base: './',
    resolve: { alias: { '@': '/src' } },
    build: { chunkSizeWarningLimit: 500 },
    plugins: [
      react(),
      ...pwaPlugins,
    ],
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: './src/test/setup.ts',
      exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
    },
  }
})
