import { useEffect, useRef, useState, type DragEvent } from 'react'
import { sourceThemeClass } from '@/domain/source-theme'
import { VirtualPageGrid } from './virtual-page-grid'

interface Props {
  pageCount: number
  thumbnails: readonly string[]
  assignedPages: ReadonlySet<number>
  assignedPageGroups: ReadonlyMap<number, number>
  loading: boolean
  files: readonly File[]
  filePageCounts: Readonly<Record<string, number>>
  status: string
  activePage: number | null
  onSelectPage: (pageNumber: number) => void
  onImportFiles: (files: FileList | null) => void
  onRequestThumbnail: (page: number) => void
  onRemovePage: (page: number) => void
}

export const PagePool = ({
  pageCount,
  thumbnails,
  assignedPages,
  assignedPageGroups,
  loading,
  files,
  filePageCounts,
  status,
  activePage,
  onSelectPage,
  onImportFiles,
  onRequestThumbnail,
  onRemovePage,
}: Props) => {
  const [thumbnailScale, setThumbnailScale] = useState(100)
  const [draggingPage, setDraggingPage] = useState<number | null>(null)
  const [isFileDragOver, setIsFileDragOver] = useState(false)
  const [isPageReturnOver, setIsPageReturnOver] = useState(false)
  const [expandedSource, setExpandedSource] = useState(0)
  const poolListRef = useRef<HTMLDivElement | null>(null)
  const sourceRefs = useRef<Array<HTMLElement | null>>([])

  useEffect(() => {
    if (expandedSource < 0) return
    const container = poolListRef.current
    const source = sourceRefs.current[expandedSource]
    if (!container || !source) return

    const containerTop = container.getBoundingClientRect().top
    const sourceTop = source.getBoundingClientRect().top
    container.scrollTo({
      top: container.scrollTop + sourceTop - containerTop,
      behavior: 'smooth',
    })
  }, [expandedSource])

  const handleDragStart = (event: DragEvent, pageNumber: number): void => {
    event.dataTransfer.setData('text/plain', `page:${pageNumber}`)
    event.dataTransfer.effectAllowed = 'move'
    setDraggingPage(pageNumber)
  }

  const handleFileDrop = (event: DragEvent<HTMLLabelElement>): void => {
    event.preventDefault()
    setIsFileDragOver(false)
    onImportFiles(event.dataTransfer.files)
  }

  const handlePageReturnDragOver = (event: DragEvent<HTMLElement>): void => {
    if (!event.dataTransfer.types.includes('application/x-pdf-split-part-page')) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    setIsPageReturnOver(true)
  }

  const handlePageReturnDrop = (event: DragEvent<HTMLElement>): void => {
    setIsPageReturnOver(false)
    const pageValue = event.dataTransfer.getData('application/x-pdf-split-part-page')
    if (!pageValue) return
    event.preventDefault()
    onRemovePage(Number(pageValue))
  }

  const sources = files.reduce<Array<{ file: File, pageCount: number, startPage: number }>>((current, sourceFile) => {
    const key = `${sourceFile.name}:${sourceFile.size}:${sourceFile.lastModified}`
    const sourcePageCount = filePageCounts[key] ?? 0
    const previous = current.at(-1)
    const startPage = previous ? previous.startPage + previous.pageCount : 1
    return [...current, { file: sourceFile, pageCount: sourcePageCount, startPage }]
  }, [])

  const toggleSource = (sourceIndex: number): void => {
    setExpandedSource((current) => current === sourceIndex ? -1 : sourceIndex)
  }

  return (
    <aside
      className={`page-pool ${isPageReturnOver ? 'is-page-return-target' : ''}`}
      onDragOver={handlePageReturnDragOver}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsPageReturnOver(false)
      }}
      onDrop={handlePageReturnDrop}
    >
      <div className="pool-header">
        <label className="thumbnail-scale-control">
          <span>分頁大小</span>
          <input
            type="range"
            min="50"
            max="200"
            step="10"
            value={thumbnailScale}
            onChange={(event) => setThumbnailScale(Number(event.target.value))}
            aria-label="調整分頁縮圖大小"
          />
          <output>{thumbnailScale}%</output>
        </label>
      </div>

      <div className="pool-return-hint" aria-live="polite">
        將分頁拖放到左側，即可移出拆分檔案
      </div>

      {!files.length && (
        <div className="pool-file-section is-empty">
          <label
            className={`empty-file-mini ${status === 'loading' ? 'loading' : ''} ${isFileDragOver ? 'drag-over' : ''}`}
            onDragEnter={(event) => { event.preventDefault(); setIsFileDragOver(true) }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={() => setIsFileDragOver(false)}
            onDrop={handleFileDrop}
          >
            <span className="import-text">{status === 'loading' ? '讀取中…' : '點擊匯入 PDF，或拖曳至此'}</span>
            {status !== 'loading' && <small>支援 .pdf 檔案</small>}
            <input type="file" accept="application/pdf,.pdf" multiple onChange={(event) => onImportFiles(event.target.files)} disabled={status === 'loading'} />
          </label>
        </div>
      )}

      {pageCount > 0 && (
        <div ref={poolListRef} className="pool-list" aria-busy={loading}>
          {sources.map((source, sourceIndex) => (
            <section
              ref={(element) => { sourceRefs.current[sourceIndex] = element }}
              className={`source-accordion ${sourceThemeClass(sourceIndex)} ${expandedSource === sourceIndex ? 'is-expanded' : ''}`}
              key={`${source.file.name}:${source.file.lastModified}`}
            >
              <button
                type="button"
                className="source-accordion-trigger"
                aria-expanded={expandedSource === sourceIndex}
                onClick={() => toggleSource(sourceIndex)}
              >
                <span className="pdf-mark">PDF</span>
                <span className="source-accordion-copy">
                  <strong title={source.file.name}>{source.file.name}</strong>
                  <small><b>資料源 {sourceIndex + 1}</b> · {(source.file.size / 1024 / 1024).toFixed(2)} MB · {source.pageCount} 頁</small>
                </span>
                <span className="source-accordion-chevron" aria-hidden="true">⌄</span>
              </button>
              {expandedSource === sourceIndex && (
                <VirtualPageGrid
                  sourceName={source.file.name}
                  pageCount={source.pageCount}
                  startPage={source.startPage}
                  thumbnailScale={thumbnailScale}
                  thumbnails={thumbnails}
                  assignedPages={assignedPages}
                  assignedPageGroups={assignedPageGroups}
                  activePage={activePage}
                  draggingPage={draggingPage}
                  onDragStart={handleDragStart}
                  onDragEnd={() => setDraggingPage(null)}
                  onSelectPage={onSelectPage}
                  onRequestThumbnail={onRequestThumbnail}
                />
              )}
            </section>
          ))}
        </div>
      )}
    </aside>
  )
}
