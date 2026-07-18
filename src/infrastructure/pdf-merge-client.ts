import type { PdfMergeResult } from './pdf-merge-core'

interface WorkerFile {
  readonly name: string
  readonly buffer: ArrayBuffer
}

type WorkerResponse =
  | { readonly type: 'ready' }
  | { readonly type: 'file-complete' }
  | { readonly type: 'complete', readonly buffer: ArrayBuffer, readonly sourcePageCounts: readonly number[] }
  | { readonly type: 'error', readonly message: string }

const runWorker = (
  files: readonly File[],
  isCancelled: () => boolean,
): Promise<PdfMergeResult> => new Promise((resolve, reject) => {
  const worker = new Worker(new URL('../workers/pdf-merge.worker.ts', import.meta.url), { type: 'module' })
  let settled = false
  let nextFileIndex = 0
  const cleanup = (): void => {
    worker.terminate()
    window.clearInterval(timer)
  }
  const cancel = (): void => {
    if (settled) return
    settled = true
    cleanup()
    reject(new DOMException('工作已取消。', 'AbortError'))
  }
  const timer = window.setInterval(() => {
    if (isCancelled()) cancel()
  }, 50)

  worker.onerror = (event) => {
    if (settled) return
    settled = true
    cleanup()
    reject(new Error(event.message || 'PDF 合併 Worker 執行失敗。'))
  }

  const sendNextFile = async (): Promise<void> => {
    if (settled || isCancelled()) {
      cancel()
      return
    }
    const file = files[nextFileIndex]
    if (!file) {
      worker.postMessage({ type: 'finish' })
      return
    }
    nextFileIndex += 1
    const buffer = await file.arrayBuffer()
    if (settled || isCancelled()) {
      cancel()
      return
    }
    const payload: WorkerFile = { name: file.name, buffer }
    worker.postMessage({ type: 'file', file: payload }, [payload.buffer])
  }

  worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
    if (settled) return
    if (event.data.type === 'error') {
      settled = true
      cleanup()
      reject(new Error(event.data.message))
      return
    }
    if (event.data.type === 'ready' || event.data.type === 'file-complete') {
      void sendNextFile().catch((cause: unknown) => {
        if (settled) return
        settled = true
        cleanup()
        reject(cause instanceof Error ? cause : new Error('無法讀取 PDF 檔案。'))
      })
      return
    }
    settled = true
    cleanup()
    resolve({ buffer: event.data.buffer, sourcePageCounts: event.data.sourcePageCounts })
  }

  worker.postMessage({ type: 'start' })
})

export const mergePdfFilesInBackground = async (
  files: readonly File[],
  isCancelled: () => boolean = () => false,
): Promise<PdfMergeResult> => {
  if (typeof Worker !== 'undefined') return runWorker(files, isCancelled)
  const { mergePdfFiles } = await import('./pdf-merge-core')
  const inputs = await Promise.all(files.map(async (file) => ({
    name: file.name,
    bytes: new Uint8Array(await file.arrayBuffer()),
  })))
  return mergePdfFiles(inputs, isCancelled)
}
