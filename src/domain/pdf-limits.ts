export const MEBIBYTE = 1024 * 1024
export const MAX_TOTAL_INPUT_BYTES = 200 * MEBIBYTE
export const WARNING_TOTAL_INPUT_BYTES = 50 * MEBIBYTE
export const MAX_TOTAL_PAGES = 2_000
export const WARNING_TOTAL_PAGES = 500

interface FileDescriptor {
  readonly name: string
  readonly size: number
  readonly type?: string
}

export const formatBytes = (bytes: number): string => `${Math.ceil(bytes / MEBIBYTE)} MB`

export const validatePdfSelection = (files: readonly FileDescriptor[]): void => {
  if (files.length === 0) throw new Error('請選擇 PDF 檔案。')
  let totalBytes = 0
  for (const file of files) {
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
    if (!isPdf) throw new Error(`${file.name} 不是 PDF 檔案。`)
    if (file.size === 0) throw new Error(`${file.name} 是空白檔案。`)
    totalBytes += file.size
  }
  if (totalBytes > MAX_TOTAL_INPUT_BYTES) {
    throw new Error(`檔案合計 ${formatBytes(totalBytes)}，超過 ${formatBytes(MAX_TOTAL_INPUT_BYTES)} 上限。`)
  }
}

export const validatePdfPageCount = (pageCount: number): void => {
  if (pageCount > MAX_TOTAL_PAGES) {
    throw new Error(`PDF 共 ${pageCount.toLocaleString('en-US')} 頁，超過 ${MAX_TOTAL_PAGES.toLocaleString('en-US')} 頁上限。`)
  }
}

export const getPdfWorkloadWarning = (totalBytes: number, pageCount: number): string => {
  if (totalBytes >= WARNING_TOTAL_INPUT_BYTES || pageCount >= WARNING_TOTAL_PAGES) {
    return `大型文件（${formatBytes(totalBytes)}、${pageCount} 頁）處理時間較長，請保持此頁面開啟。`
  }
  return ''
}
