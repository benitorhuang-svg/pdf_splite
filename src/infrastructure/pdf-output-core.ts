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
  for (let index = 0; index < request.parts.length; index += 1) {
    if (isCancelled()) throw new DOMException('工作已取消。', 'AbortError')
    const output = await PDFDocument.create()
    const copiedPages = await output.copyPages(
      source,
      request.parts[index].pages.map((page) => page.documentPageNumber - 1),
    )
    copiedPages.forEach((page, pageIndex) => {
      const rotation = request.parts[index].pages[pageIndex].rotation
      if (rotation) page.setRotation(degrees((page.getRotation().angle + rotation) % 360))
      output.addPage(page)
    })
    result.push({ name: request.names[index], bytes: await output.save() })
    onProgress(Math.round(((index + 1) / request.parts.length) * 100))
  }
  return result
}
