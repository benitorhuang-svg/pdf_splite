import { Icon } from './icons'

interface Props {
  pageNumber: number | null
  totalPageCount: number
  thumbnailUrl: string | null
  onClearActivePage: () => void
}

export const PagePreview = ({ pageNumber, totalPageCount, thumbnailUrl, onClearActivePage }: Props) => {
  return (
    <aside className="right-panel page-preview-panel">
      <header className="preview-header">
        <h3>分頁預覽</h3>
        {pageNumber !== null && (
          <button className="icon-button close-preview-btn" onClick={onClearActivePage} aria-label="關閉預覽">
            ✕
          </button>
        )}
      </header>

      {pageNumber !== null && thumbnailUrl ? (
        <div className="preview-content">
          <div className="preview-image-wrapper">
            <img src={thumbnailUrl} alt={`第 ${pageNumber} 頁`} />
            <span className="preview-page-badge">第 {pageNumber} 頁 / 共 {totalPageCount} 頁</span>
          </div>
          <div className="preview-meta">
            <div className="meta-row">
              <span className="meta-label">目前頁面</span>
              <span className="meta-value">第 {pageNumber} 頁</span>
            </div>
            <div className="meta-row">
              <span className="meta-label">PDF 總頁數</span>
              <span className="meta-value">{totalPageCount} 頁</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="preview-empty">
          <div className="preview-placeholder-icon">
            <Icon name="file" />
          </div>
          <p>點選任意分頁縮圖</p>
          <small>即可在此處預覽頁面詳細內容</small>
        </div>
      )}
    </aside>
  )
}
