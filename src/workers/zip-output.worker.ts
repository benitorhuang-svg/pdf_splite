/// <reference lib="webworker" />

import { generateZipBlob } from '@/infrastructure/zip-output-core'

interface InputFile {
  readonly name: string
  readonly buffer: ArrayBuffer
}

self.onmessage = async (event: MessageEvent<{ readonly files: readonly InputFile[] }>) => {
  try {
    const blob = await generateZipBlob(event.data.files.map((file) => ({
      name: file.name,
      bytes: new Uint8Array(file.buffer),
    })))
    self.postMessage({ type: 'complete', blob })
  } catch (cause) {
    self.postMessage({ type: 'error', message: cause instanceof Error ? cause.message : 'ZIP 壓縮失敗。' })
  }
}
