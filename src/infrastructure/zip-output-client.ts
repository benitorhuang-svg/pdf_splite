import type { ZipInputFile } from './zip-output-core'

type WorkerResponse =
  | { readonly type: 'complete', readonly blob: Blob }
  | { readonly type: 'error', readonly message: string }

const runWorker = (files: readonly ZipInputFile[]): Promise<Blob> => new Promise((resolve, reject) => {
  const worker = new Worker(new URL('../workers/zip-output.worker.ts', import.meta.url), { type: 'module' })
  worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
    worker.terminate()
    if (event.data.type === 'error') reject(new Error(event.data.message))
    else resolve(event.data.blob)
  }
  worker.onerror = (event) => {
    worker.terminate()
    reject(new Error(event.message || 'ZIP Worker 執行失敗。'))
  }
  const payload = files.map((file) => ({ name: file.name, buffer: file.bytes.slice().buffer }))
  worker.postMessage({ files: payload }, payload.map((file) => file.buffer))
})

export const generateZipBlobInBackground = async (files: readonly ZipInputFile[]): Promise<Blob> => {
  if (typeof Worker === 'undefined') {
    const { generateZipBlob } = await import('./zip-output-core')
    return generateZipBlob(files)
  }
  return runWorker(files)
}
