import { useState, type CSSProperties, type KeyboardEvent } from 'react'
import type { OutputPart } from '@/domain/split-plan'
import { formatSourcePageSelection } from '@/domain/source-page-selection'
import { SourceRangeInput } from './source-range-input'
import type { SourcePageInfo } from '@/domain/source-theme'
import { sourceThemeClass } from '@/domain/source-theme'
import { Icon } from './icons'
import { LazyThumbnail } from './lazy-thumbnail'
import type { usePartsBoardDrag } from './use-parts-board-drag'

interface Props {
  readonly part: OutputPart
  readonly partIndex: number
  readonly totalParts: number
  readonly pageCount: number
  readonly manualMode: boolean
  readonly thumbnails: readonly string[]
  readonly sourcePages: ReadonlyMap<number, SourcePageInfo>
  readonly activePage: number | null
  readonly downloading: boolean
  readonly canDelete: boolean
  readonly drag: ReturnType<typeof usePartsBoardDrag>
  readonly onDownload: () => void
  readonly onDelete: () => void
  readonly onSetPages: (pages: readonly number[]) => void
  readonly onRemovePage: (page: number) => void
  readonly onMovePage: (page: number, targetPartIdx: number) => void
  readonly onReorderPage: (partIdx: number, fromPageIdx: number, toPageIdx: number) => void
  readonly onSelectPage: (page: number) => void
  readonly onRequestThumbnail: (page: number) => void
  readonly onAnnounce: (message: string) => void
  readonly validationMessage: string
}

export const PartCard = ({
  part, partIndex, totalParts, pageCount, manualMode, thumbnails, sourcePages, activePage, downloading, canDelete,
  drag, onDownload, onDelete, onSetPages, onRemovePage, onMovePage, onReorderPage,
  onSelectPage, onRequestThumbnail, validationMessage,
  onAnnounce,
}: Props) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [displayMode, setDisplayMode] = useState<'page-numbers' | 'thumbnails'>('page-numbers')
  const [thumbnailScale, setThumbnailScale] = useState(100)
  const documentPages = part.pages.map((page) => page.documentPageNumber)
  const formattedPages = formatSourcePageSelection(documentPages, sourcePages)
  const sourceClass = (pageNumber: number): string => {
    const source = sourcePages.get(pageNumber)
    return source ? sourceThemeClass(source.sourceIndex) : ''
  }
  const displayPage = (pageNumber: number): number =>
    sourcePages.get(pageNumber)?.localPageNumber ?? pageNumber
  const pageTitle = (pageNumber: number, order: number): string => {
    const source = sourcePages.get(pageNumber)
    return source
      ? `輸出第 ${order} 頁，來源 ${source.sourceIndex + 1} 的第 ${source.localPageNumber} 頁`
      : `輸出第 ${order} 頁，原始第 ${pageNumber} 頁`
  }
  const isOver = drag.activeDropPart === partIndex
  const focusPart = (targetPartIndex: number): void => {
    window.requestAnimationFrame(() => {
      document.querySelector<HTMLElement>(`[data-part-index="${targetPartIndex}"]`)?.focus()
    })
  }
  const handlePageKeyDown = (
    event: KeyboardEvent<HTMLDivElement>,
    pageNumber: number,
    pageIndex: number,
  ): void => {
    if (event.target !== event.currentTarget) return
    const label = `第 ${displayPage(pageNumber)} 頁`
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onSelectPage(pageNumber)
      return
    }
    if (event.key === 'ArrowLeft' && pageIndex > 0) {
      event.preventDefault()
      onReorderPage(partIndex, pageIndex, pageIndex - 1)
      onAnnounce(`${label}已向前移動`)
    }
    if (event.key === 'ArrowRight' && pageIndex < part.pages.length - 1) {
      event.preventDefault()
      onReorderPage(partIndex, pageIndex, pageIndex + 1)
      onAnnounce(`${label}已向後移動`)
    }
    if (event.key === 'ArrowUp' && partIndex > 0) {
      event.preventDefault()
      onMovePage(pageNumber, partIndex - 1)
      onAnnounce(`${label}已移到檔案 ${partIndex}`)
      focusPart(partIndex - 1)
    }
    if (event.key === 'ArrowDown' && partIndex < totalParts - 1) {
      event.preventDefault()
      onMovePage(pageNumber, partIndex + 1)
      onAnnounce(`${label}已移到檔案 ${partIndex + 2}`)
      focusPart(partIndex + 1)
    }
  }

  return (
    <div
      data-part-index={partIndex}
      tabIndex={-1}
      className={`part-container theme-${partIndex % 6 + 1} ${isExpanded ? '' : 'is-collapsed'} ${isOver ? 'drag-over' : ''}`}
      onDragOver={(event) => drag.handleDragOverContainer(event, partIndex)}
      onDragLeave={drag.handleDragLeaveContainer}
      onDrop={(event) => drag.handleDropContainer(event, partIndex)}
    >
      <div className="part-container-header">
        <div className="part-info">
          <div className="part-actions-row">
            <div className="part-primary-actions">
              <strong className="part-title">檔案 {part.index}</strong>
              <div className="part-display-toggle" role="group" aria-label={`檔案 ${part.index} 顯示方式`}>
                <button type="button" aria-pressed={!isExpanded} aria-label={`縮合檔案 ${part.index}`} onClick={() => setIsExpanded(false)}>縮合顯示</button>
                <button type="button" aria-pressed={isExpanded && displayMode === 'page-numbers'} onClick={() => { setDisplayMode('page-numbers'); setIsExpanded(true) }}>顯示頁碼</button>
                <button type="button" aria-pressed={isExpanded && displayMode === 'thumbnails'} onClick={() => { setDisplayMode('thumbnails'); setIsExpanded(true) }}>顯示縮圖</button>
              </div>
              {isExpanded && displayMode === 'thumbnails' && (
                <div className="part-thumbnail-actions" role="group" aria-label={`檔案 ${part.index} 圖片大小`}>
                  <output>{thumbnailScale}%</output>
                  <button
                    className="thumbnail-scale-button thumbnail-scale-down"
                    type="button"
                    disabled={thumbnailScale <= 60}
                    aria-label={`縮小檔案 ${part.index} 縮圖`}
                    onClick={() => setThumbnailScale((scale) => Math.max(60, scale - 10))}
                  >A</button>
                  <button
                    className="thumbnail-scale-button thumbnail-scale-up"
                    type="button"
                    disabled={thumbnailScale >= 180}
                    aria-label={`放大檔案 ${part.index} 縮圖`}
                    onClick={() => setThumbnailScale((scale) => Math.min(180, scale + 10))}
                  >A</button>
                </div>
              )}
            </div>
            <div className="part-view-actions">
              <div className="part-file-actions">
                <button className="download-part-btn" type="button" onClick={onDownload} disabled={downloading || part.pages.length === 0}>
                  <Icon name="download" /> 下載 PDF
                </button>
                {canDelete && (
                  <button className="delete-part-btn" type="button" onClick={onDelete} title="刪除檔案">✕ 刪除</button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      {isExpanded && manualMode && (
        <SourceRangeInput
          key={formattedPages}
          partIndex={partIndex}
          pageCount={pageCount}
          defaultValue={formattedPages}
          sourcePages={sourcePages}
          onSetPages={onSetPages}
        />
      )}
      {validationMessage && (
        <div className="part-validation-message" role="alert">⚠️ {validationMessage}</div>
      )}
      {isExpanded && displayMode === 'page-numbers' && (
        <span id={`part-pages-${part.index}`} className="part-pages-summary-badges">
          {part.pages.length === 0
            ? <span className="part-pages-summary">無頁面</span>
            : part.pages.map((page, order) => (
              <span key={page.id} className="page-range-badge" title={pageTitle(page.documentPageNumber, order + 1)}>
                <small>{order + 1}</small>
                <span className={`source-page-label ${sourceClass(page.documentPageNumber)}`}>
                  P{displayPage(page.documentPageNumber)}
                </span>
              </span>
            ))}
        </span>
      )}
      {isExpanded && displayMode === 'thumbnails' && (
        <div
          id={`part-pages-${part.index}`}
          className="part-pages-list"
          style={{ '--part-thumbnail-width': `${48 * thumbnailScale / 100}px` } as CSSProperties}
        >
          {part.pages.length === 0 && <div className="part-empty-hint">拖曳分頁至此</div>}
          {part.pages.map((page, pageIndex) => (
          <div
            key={page.id}
            data-page-card={page.id}
            className={`board-page-card ${page.documentPageNumber === activePage ? 'active' : ''} ${drag.draggingPage === page.documentPageNumber ? 'dragging' : ''} ${drag.activeDropPage?.partIdx === partIndex && drag.activeDropPage.pageIdx === pageIndex ? 'drop-target' : ''}`}
            draggable
            tabIndex={0}
            role="button"
            aria-label={`${pageTitle(page.documentPageNumber, pageIndex + 1)}；使用方向鍵重新排序或移動`}
            onDragStart={(event) => drag.handleDragStartCard(event, page.documentPageNumber, partIndex, pageIndex)}
            onDragEnd={() => { drag.setDraggingPage(null); drag.setActiveDropPart(null); drag.setActiveDropPage(null) }}
            onDragOver={(event) => drag.handleDragOverCard(event, partIndex, pageIndex)}
            onDrop={(event) => drag.handleDropCard(event, partIndex, pageIndex)}
            onClick={(event) => { event.stopPropagation(); onSelectPage(page.documentPageNumber) }}
            onKeyDown={(event) => handlePageKeyDown(event, page.documentPageNumber, pageIndex)}
          >
            <div className="board-page-thumbnail">
              <LazyThumbnail page={page.documentPageNumber} src={thumbnails[page.documentPageNumber - 1]} alt={`第 ${page.documentPageNumber} 頁`} onRequest={onRequestThumbnail} />
              <button
                className="remove-part-page-btn"
                type="button"
                draggable={false}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => { event.stopPropagation(); onRemovePage(page.documentPageNumber) }}
                aria-label={`從檔案 ${part.index} 移除第 ${displayPage(page.documentPageNumber)} 頁`}
                title="移除此分頁"
              >×</button>
              <span className="page-keyboard-actions">
                <button type="button" disabled={pageIndex === 0} onClick={(event) => { event.stopPropagation(); onReorderPage(partIndex, pageIndex, pageIndex - 1) }} aria-label={`將第 ${displayPage(page.documentPageNumber)} 頁向前移動`}>←</button>
                <button type="button" disabled={pageIndex === part.pages.length - 1} onClick={(event) => { event.stopPropagation(); onReorderPage(partIndex, pageIndex, pageIndex + 1) }} aria-label={`將第 ${displayPage(page.documentPageNumber)} 頁向後移動`}>→</button>
                <button type="button" disabled={partIndex === 0} onClick={(event) => { event.stopPropagation(); onMovePage(page.documentPageNumber, partIndex - 1) }} aria-label={`將第 ${displayPage(page.documentPageNumber)} 頁移到上一個檔案`}>↑</button>
                <button type="button" disabled={partIndex === totalParts - 1} onClick={(event) => { event.stopPropagation(); onMovePage(page.documentPageNumber, partIndex + 1) }} aria-label={`將第 ${displayPage(page.documentPageNumber)} 頁移到下一個檔案`}>↓</button>
              </span>
              <span className={`page-badge-num ${sourceClass(page.documentPageNumber)}`}>{displayPage(page.documentPageNumber)}</span>
            </div>
          </div>
          ))}
        </div>
      )}
    </div>
  )
}
