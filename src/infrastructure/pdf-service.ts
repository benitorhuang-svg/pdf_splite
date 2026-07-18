import type { PDFDocumentProxy } from 'pdfjs-dist'
import type { OutputPart } from '@/domain/split-plan'
import { createUniqueOutputNames } from '@/domain/split-plan'
import { validatePdfPageCount, validatePdfSelection } from '@/domain/pdf-limits'
import { mergePdfFilesInBackground } from './pdf-merge-client'
import { generatePdfPartsInBackground } from './pdf-output-client'
import { generateZipBlobInBackground } from './zip-output-client'

export interface LoadedPdf {
  readonly bytes: Uint8Array
  readonly preview: PDFDocumentProxy
  readonly pageCount: number
  readonly sourcePageCounts: readonly number[]
  readonly totalBytes: number
}

export interface GeneratedFile {
  readonly name: string
  readonly bytes: Uint8Array
}

const loadPdfJs = async () => {
  const pdfjs = await import('pdfjs-dist')
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString()
  return pdfjs
}

const assertPdfHeader = async (file: File): Promise<void> => {
  const header = new TextDecoder('latin1').decode(await file.slice(0, 1_024).arrayBuffer())
  if (!header.includes('%PDF-')) throw new Error(`${file.name} 沒有有效的 PDF 標頭。`)
}

const createPreview = async (bytes: Uint8Array): Promise<PDFDocumentProxy> => {
  const pdfjs = await loadPdfJs()
  const preview = await pdfjs.getDocument({ data: bytes.slice() }).promise
  try {
    validatePdfPageCount(preview.numPages)
    return preview
  } catch (cause) {
    preview.cleanup()
    throw cause
  }
}

export const loadPdf = async (file: File): Promise<LoadedPdf> => {
  validatePdfSelection([file])
  await assertPdfHeader(file)
  const bytes = new Uint8Array(await file.arrayBuffer())
  const preview = await createPreview(bytes)
  return {
    bytes,
    preview,
    pageCount: preview.numPages,
    sourcePageCounts: [preview.numPages],
    totalBytes: file.size,
  }
}

export const loadPdfFiles = async (
  files: readonly File[],
  isCancelled: () => boolean = () => false,
): Promise<LoadedPdf> => {
  validatePdfSelection(files)
  if (files.length === 1) return loadPdf(files[0])
  for (const file of files) await assertPdfHeader(file)
  const merged = await mergePdfFilesInBackground(files, isCancelled)
  const bytes = new Uint8Array(merged.buffer)
  const preview = await createPreview(bytes)
  return {
    bytes,
    preview,
    pageCount: preview.numPages,
    sourcePageCounts: merged.sourcePageCounts,
    totalBytes: files.reduce((total, file) => total + file.size, 0),
  }
}

export const renderThumbnail = async (pdf: PDFDocumentProxy, pageNumber: number): Promise<string> => {
  const page = await pdf.getPage(pageNumber)
  try {
    const initial = page.getViewport({ scale: 1 })
    const devicePixelRatio = Math.min(window.devicePixelRatio || 1, 2)
    const viewport = page.getViewport({ scale: (220 * devicePixelRatio) / initial.width })
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    if (!context) throw new Error('目前瀏覽器無法建立縮圖畫布。')
    canvas.width = Math.floor(viewport.width)
    canvas.height = Math.floor(viewport.height)
    await page.render({ canvas, canvasContext: context, viewport }).promise
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((value) => value ? resolve(value) : reject(new Error('無法建立頁面縮圖。')), 'image/jpeg', 0.82)
    })
    canvas.width = 0
    canvas.height = 0
    return URL.createObjectURL(blob)
  } finally {
    page.cleanup()
  }
}

export const splitPdf = async (
  sourceBytes: Uint8Array,
  parts: readonly OutputPart[],
  originalName: string,
  template: string,
  onProgress: (progress: number) => void,
  isCancelled: () => boolean = () => false,
  partIndex?: number,
): Promise<GeneratedFile[]> => {
  const names = createUniqueOutputNames(template, originalName, parts)
  const selectedParts = partIndex === undefined ? parts : [parts[partIndex]]
  const selectedNames = partIndex === undefined ? names : [names[partIndex]]
  if (selectedParts.some((part) => !part) || selectedNames.some((name) => !name)) {
    throw new Error('找不到要輸出的分件。')
  }
  return generatePdfPartsInBackground(
    { sourceBytes, parts: selectedParts, names: selectedNames }, onProgress, isCancelled,
  )
}

const downloadBlob = (blob: Blob, fileName: string): void => {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000)
}

export const downloadPdf = (file: GeneratedFile): void => {
  downloadBlob(new Blob([file.bytes as BlobPart], { type: 'application/pdf' }), file.name)
}

export const createZipBytes = (files: readonly GeneratedFile[]): Promise<Uint8Array> =>
  import('./zip-output-core').then(({ generateZipBytes }) => generateZipBytes(files))

export const downloadZip = async (files: readonly GeneratedFile[], originalName: string): Promise<void> => {
  const blob = await generateZipBlobInBackground(files)
  downloadBlob(blob, `${originalName.replace(/\.pdf$/i, '')}_split.zip`)
}
