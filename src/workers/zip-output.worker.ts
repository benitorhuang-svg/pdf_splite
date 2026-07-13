/// <reference lib="webworker" />

import { generateZipBytes } from '@/infrastructure/zip-output-core'

interface InputFile {
  readonly name: string
  readonly buffer: ArrayBuffer
}

self.onmessage = async (event: MessageEvent<{ readonly files: readonly InputFile[] }>) => {
  try {
    const bytes = await generateZipBytes(event.data.files.map((file) => ({
      name: file.name,
      bytes: new Uint8Array(file.buffer),
    })))
    self.postMessage({ type: 'complete', buffer: bytes.buffer }, [bytes.buffer])
  } catch (cause) {
    self.postMessage({ type: 'error', message: cause instanceof Error ? cause.message : 'ZIP 壓縮失敗。' })
  }
}
