/// <reference lib="webworker" />

import { createPdfMergeSession, type PdfMergeSession } from '@/infrastructure/pdf-merge-core'

interface WorkerFile {
  readonly name: string
  readonly buffer: ArrayBuffer
}

type WorkerRequest =
  | { readonly type: 'start' }
  | { readonly type: 'file', readonly file: WorkerFile }
  | { readonly type: 'finish' }

let session: PdfMergeSession | null = null

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  try {
    if (event.data.type === 'start') {
      session = await createPdfMergeSession()
      self.postMessage({ type: 'ready' })
      return
    }
    if (!session) throw new Error('PDF 合併工作尚未初始化。')
    if (event.data.type === 'file') {
      await session.addFile({
        name: event.data.file.name,
        bytes: new Uint8Array(event.data.file.buffer),
      })
      self.postMessage({ type: 'file-complete' })
      return
    }
    const result = await session.finish()
    session = null
    self.postMessage({
      type: 'complete',
      buffer: result.buffer,
      sourcePageCounts: result.sourcePageCounts,
    }, [result.buffer])
  } catch (cause) {
    self.postMessage({ type: 'error', message: cause instanceof Error ? cause.message : 'PDF 合併失敗。' })
  }
}
