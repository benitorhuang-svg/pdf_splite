import { HeaderSplitControls } from './header-split-controls'
import { Icon } from './icons'
import type { PartsBoardProps } from './parts-board.types'
import { usePartsBoardDrag } from './use-parts-board-drag'
import { ExportProgress } from './export-progress'
import { VirtualPartsList } from './virtual-parts-list'

export const PartsBoard = ({
  parts, thumbnails, pageCount, loading, mode, onMode, rule, error, planError, activePage, onSelectPage,
  sourcePages, downloading, status, onDownloadZip, onDownloadPart,
  onClearAll, downloadDisabled, onMovePage, onRemovePage, onReorderPage, onAddPart,
  onDeletePart, onSetPartPages, onFixedCount, onRequestThumbnail,
}: PartsBoardProps) => {
  const drag = usePartsBoardDrag({ onMovePage, onReorderPage })
  const [announcement, setAnnouncement] = useState('')
  const emptyPlanPart = parts.find((part) =>
    planError === `檔案 ${part.index} 尚未包含任何頁面`)

  return (
    <main className="parts-board">
      <header className="board-header">
        <div className="board-title">
          <h2>拆分工作台</h2>
          {!pageCount && <p>匯入 PDF 後開始規劃拆分</p>}
        </div>
        {pageCount > 0 && (
          <div className="board-header-actions">
            <button
              className="clear-all-btn"
              type="button"
              disabled={parts.length === 0 || downloading}
              onClick={onClearAll}
            >清除全部</button>
            <HeaderSplitControls mode={mode} onMode={onMode} />
            <ExportProgress downloading={downloading} processing={status === 'processing'} />
            <button
              className="primary download-zip-btn"
              disabled={downloadDisabled || downloading}
              onClick={onDownloadZip}
            >
              <Icon name="download" />下載 ZIP
            </button>
          </div>
        )}
      </header>

      {error && <div className="board-error-banner" role="alert">⚠️ {error}</div>}
      {planError && !emptyPlanPart && (
        <div className="board-error-banner" role="alert">⚠️ {planError}</div>
      )}

      {!pageCount && (
        <div className="welcome-state">
          <div className="welcome-visual" aria-hidden="true">
            <span className="welcome-page welcome-page-back">PDF</span>
            <span className="welcome-page welcome-page-front"><Icon name="file" /></span>
          </div>
          <span className="welcome-eyebrow">完全在瀏覽器中處理</span>
          <h3>拖入 PDF，開始規劃拆分</h3>
          <p>檔案不會上傳；從左側匯入後，拖曳頁面即可重新分組與排序。</p>
          <div className="welcome-steps">
            <span><b>1</b> 匯入 PDF</span>
            <span><b>2</b> 拖曳分組</span>
            <span><b>3</b> 下載 PDF 或 ZIP</span>
          </div>
        </div>
      )}

      {pageCount > 0 && (
        <>
          {mode === 'fixed-count' && (
            <div className="board-rule-input-inline">
              <span>每份</span>
              <div className="number-stepper">
                <button type="button" onClick={() => onFixedCount(Math.max(1, rule.fixedCount - 1))} disabled={rule.fixedCount <= 1}>–</button>
                <input type="number" min="1" value={rule.fixedCount} onChange={(event) => onFixedCount(Math.max(1, Number(event.target.value)))} aria-label="每份頁數" />
                <button type="button" onClick={() => onFixedCount(rule.fixedCount + 1)}>+</button>
              </div>
              <span>頁</span>
              <small>亦可使用手動拖曳方式調整檔案分頁 (新增/移除/排序)</small>
            </div>
          )}
          <VirtualPartsList
            parts={parts}
            mode={mode}
            pageCount={pageCount}
            thumbnails={thumbnails}
            sourcePages={sourcePages}
            activePage={activePage}
            downloading={downloading}
            loading={loading}
            emptyPartIndex={emptyPlanPart?.index}
            planError={planError}
            drag={drag}
            onDownloadPart={onDownloadPart}
            onDeletePart={onDeletePart}
            onSetPartPages={onSetPartPages}
            onRemovePage={onRemovePage}
            onMovePage={onMovePage}
            onReorderPage={onReorderPage}
            onSelectPage={onSelectPage}
            onRequestThumbnail={onRequestThumbnail}
            onAnnounce={setAnnouncement}
            onAddPart={onAddPart}
          />
          <div className="visually-hidden" role="status" aria-live="polite">{announcement}</div>
        </>
      )}
    </main>
  )
}
import { useState } from 'react'
