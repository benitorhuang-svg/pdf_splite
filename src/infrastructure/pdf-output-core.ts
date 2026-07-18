import { degrees, PDFDocument } from 'pdf-lib'
import type { OutputPart } from '@/domain/split-plan'
import { validateSplitPlan } from '@/domain/split-plan'

export interface PdfOutputRequest {
  readonly sourceBytes: Uint8Array
  readonly parts: readonly OutputPart[]
  readonly names: readonly string[]
}

export interface PdfOutputResult {
  readonly name: string
  readonly bytes: Uint8Array
}

export const generatePdfParts = async (
  request: PdfOutputRequest,
  onProgress: (value: number) => void,
  isCancelled: () => boolean = () => false,
): Promise<PdfOutputResult[]> => {
  const source = await PDFDocument.load(request.sourceBytes)
  validateSplitPlan(request.parts, source.getPageCount())
  const result: PdfOutputResult[] = []
  const totalPages = request.parts.reduce((total, part) => total + part.pages.length, 0)
  let completedPages = 0
  for (let index = 0; index < request.parts.length; index += 1) {
    if (isCancelled()) throw new DOMException('工作已取消。', 'AbortError')
    const output = await PDFDocument.create()
    const partPages = request.parts[index].pages
    for (let pageIndex = 0; pageIndex < partPages.length; pageIndex += 1) {
      if (isCancelled()) throw new DOMException('工作已取消。', 'AbortError')
      const [page] = await output.copyPages(source, [partPages[pageIndex].documentPageNumber - 1])
      const rotation = partPages[pageIndex].rotation
      if (rotation) page.setRotation(degrees((page.getRotation().angle + rotation) % 360))
      output.addPage(page)
      completedPages += 1
      onProgress(Math.round((completedPages / totalPages) * 100))
    }
    result.push({ name: request.names[index], bytes: await output.save() })
  }
  return result
}
