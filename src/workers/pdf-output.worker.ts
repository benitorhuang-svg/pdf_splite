/// <reference lib="webworker" />

import { generatePdfParts, type PdfOutputRequest } from '@/infrastructure/pdf-output-core'

interface WorkerRequest extends Omit<PdfOutputRequest, 'sourceBytes'> {
  readonly sourceBuffer: ArrayBuffer
}

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  try {
    const files = await generatePdfParts(
      { ...event.data, sourceBytes: new Uint8Array(event.data.sourceBuffer) },
      (progress) => self.postMessage({ type: 'progress', progress }),
    )
    const payload = files.map((file) => ({ name: file.name, buffer: file.bytes.buffer }))
    self.postMessage({ type: 'complete', files: payload }, payload.map((file) => file.buffer))
  } catch (cause) {
    self.postMessage({ type: 'error', message: cause instanceof Error ? cause.message : 'PDF 拆分失敗。' })
  }
}
