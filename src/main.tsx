import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from '@/App'
import { AppErrorBoundary } from '@/components/app-error-boundary'
import '@/styles.css'

const updateServiceWorker = registerSW({
  immediate: true,
  onNeedRefresh: () => {
    if (window.confirm('有新版可用，是否立即更新？目前尚未下載的拆分結果會被清除。')) {
      void updateServiceWorker(true)
    }
  },
  onOfflineReady: () => window.dispatchEvent(new CustomEvent('pdf-splitter:offline-ready')),
})

const root = document.getElementById('root')
if (!root) throw new Error('找不到應用程式根節點')
createRoot(root).render(
  <StrictMode>
    <AppErrorBoundary><App /></AppErrorBoundary>
  </StrictMode>,
)
