import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import { VitePWA } from 'vite-plugin-pwa'
import type { Plugin } from 'vite'
import { sites } from './build/sites-vite-plugin'

const workerConfig = {
  main: './worker/index.ts',
  compatibility_date: '2026-07-13',
  compatibility_flags: ['nodejs_compat'],
  assets: {
    binding: 'ASSETS',
    not_found_handling: 'single-page-application' as const,
  },
}
type ViteEnvironment = Parameters<NonNullable<Plugin['applyToEnvironment']>>[0]

export default defineConfig(async () => {
  process.env.WRANGLER_WRITE_LOGS ??= 'false'
  process.env.WRANGLER_LOG_PATH ??= '.wrangler/logs'
  process.env.MINIFLARE_REGISTRY_PATH ??= '.wrangler/registry'
  const { cloudflare } = await import('@cloudflare/vite-plugin')
  const hostingPlugins = process.env.VITEST
    ? []
    : [sites(), cloudflare({
        viteEnvironment: { name: 'server' },
        config: workerConfig,
      })]
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
      globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
      cleanupOutdatedCaches: true,
    },
  }).map((plugin) => ({
    ...plugin,
    applyToEnvironment: (environment: ViteEnvironment) => environment.name === 'client',
  }))

  return {
    base: './',
    resolve: { alias: { '@': '/src' } },
    build: { chunkSizeWarningLimit: 500 },
    plugins: [
      react(),
      ...pwaPlugins,
      ...hostingPlugins,
    ],
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: './src/test/setup.ts',
      exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
    },
  }
})
