import type { OutputPart } from '@/domain/split-plan'
import type { PdfOutputResult } from './pdf-output-core'

interface WorkerFile {
  readonly name: string
  readonly buffer: ArrayBuffer
}

type WorkerResponse =
  | { readonly type: 'progress', readonly progress: number }
  | { readonly type: 'complete', readonly files: readonly WorkerFile[] }
  | { readonly type: 'error', readonly message: string }

interface Request {
  readonly sourceBytes: Uint8Array
  readonly parts: readonly OutputPart[]
  readonly names: readonly string[]
}

const runWorker = (
  request: Request,
  onProgress: (value: number) => void,
  isCancelled: () => boolean,
): Promise<PdfOutputResult[]> => new Promise((resolve, reject) => {
  const worker = new Worker(new URL('../workers/pdf-output.worker.ts', import.meta.url), { type: 'module' })
  const timer = window.setInterval(() => {
    if (!isCancelled()) return
    worker.terminate()
    window.clearInterval(timer)
    reject(new DOMException('工作已取消。', 'AbortError'))
  }, 50)
  worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
    if (event.data.type === 'progress') onProgress(event.data.progress)
    if (event.data.type === 'error') {
      worker.terminate()
      window.clearInterval(timer)
      reject(new Error(event.data.message))
    }
    if (event.data.type === 'complete') {
      worker.terminate()
      window.clearInterval(timer)
      resolve(event.data.files.map((file) => ({ name: file.name, bytes: new Uint8Array(file.buffer) })))
    }
  }
  worker.onerror = (event) => {
    worker.terminate()
    window.clearInterval(timer)
    reject(new Error(event.message || 'PDF Worker 執行失敗。'))
  }
  const sourceBuffer = request.sourceBytes.slice().buffer
  worker.postMessage({ sourceBuffer, parts: request.parts, names: request.names }, [sourceBuffer])
})

export const generatePdfPartsInBackground = async (
  request: Request,
  onProgress: (value: number) => void,
  isCancelled: () => boolean,
): Promise<PdfOutputResult[]> => {
  if (typeof Worker === 'undefined') {
    const { generatePdfParts } = await import('./pdf-output-core')
    return generatePdfParts(request, onProgress, isCancelled)
  }
  return runWorker(request, onProgress, isCancelled)
}
