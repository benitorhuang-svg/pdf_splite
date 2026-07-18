import { PDFDocument } from 'pdf-lib'
import { validatePdfPageCount } from '@/domain/pdf-limits'

export interface PdfMergeInput {
  readonly name: string
  readonly bytes: Uint8Array
}

export interface PdfMergeResult {
  readonly buffer: ArrayBuffer
  readonly sourcePageCounts: readonly number[]
}

export interface PdfMergeSession {
  readonly addFile: (file: PdfMergeInput, isCancelled?: () => boolean) => Promise<void>
  readonly finish: () => Promise<PdfMergeResult>
}

export const createPdfMergeSession = async (): Promise<PdfMergeSession> => {
  const merged = await PDFDocument.create()
  const sourcePageCounts: number[] = []
  let totalPageCount = 0

  const addFile = async (file: PdfMergeInput, isCancelled: () => boolean = () => false): Promise<void> => {
    if (isCancelled()) throw new DOMException('工作已取消。', 'AbortError')
    const source = await PDFDocument.load(file.bytes)
    const sourcePageCount = source.getPageCount()
    totalPageCount += sourcePageCount
    validatePdfPageCount(totalPageCount)
    sourcePageCounts.push(sourcePageCount)

    for (const pageIndex of source.getPageIndices()) {
      if (isCancelled()) throw new DOMException('工作已取消。', 'AbortError')
      const [page] = await merged.copyPages(source, [pageIndex])
      merged.addPage(page)
    }
  }

  const finish = async (): Promise<PdfMergeResult> => {
    const bytes = await merged.save()
    const buffer = new ArrayBuffer(bytes.byteLength)
    new Uint8Array(buffer).set(bytes)
    return { buffer, sourcePageCounts }
  }

  return { addFile, finish }
}

export const mergePdfFiles = async (
  files: readonly PdfMergeInput[],
  isCancelled: () => boolean = () => false,
): Promise<PdfMergeResult> => {
  if (files.length === 0) throw new Error('請選擇 PDF 檔案。')
  const session = await createPdfMergeSession()
  for (const file of files) await session.addFile(file, isCancelled)
  return session.finish()
}
