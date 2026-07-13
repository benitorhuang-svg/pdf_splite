import { Icon } from './icons'

interface Props {
  pageCount: number
  thumbnails: readonly string[]
  selectedPages: ReadonlySet<number>
  loading: boolean
}

export const PreviewGrid = ({ pageCount, thumbnails, selectedPages, loading }: Props) => <main className="preview-panel">
  <header className="section-header">
    <div className="section-title"><h2>輸出預覽</h2><p>{pageCount ? `已選取 ${selectedPages.size} / ${pageCount} 頁` : '匯入 PDF 後預覽頁面'}</p></div>
    <div className="header-privacy"><Icon name="shield" /><div><strong>本機處理・隱私保護</strong><small>所有操作皆在瀏覽器中進行，檔案不會上傳或離開你的裝置。</small></div></div>
    <span className="view-badge">▦ 縮圖檢視</span>
  </header>
  {!pageCount && <div className="empty-state">
    <span className="empty-icon">PDF</span><h3>將 PDF 拖曳到這裡</h3><p>或使用上方的「匯入 PDF」開始</p>
  </div>}
  {pageCount > 0 && <div className="page-grid" aria-busy={loading}>
    {Array.from({ length: pageCount }, (_, index) => {
      const page = index + 1
      const selected = selectedPages.has(page)
      return <figure key={page} className={selected ? 'selected' : ''}>
        <div className="thumbnail">
          {thumbnails[index] ? <img src={thumbnails[index]} alt={`第 ${page} 頁預覽`} /> : <span className="skeleton" />}
        </div>
        <figcaption><span>{page}</span><span className={`check ${selected ? 'checked' : ''}`}>{selected ? '✓' : ''}</span></figcaption>
      </figure>
    })}
  </div>}
</main>
