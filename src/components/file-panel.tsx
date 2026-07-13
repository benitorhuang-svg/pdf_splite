import type { ChangeEvent, DragEvent } from 'react'
import { Icon } from './icons'

interface Props {
  file: File | null
  pageCount: number
  loading: boolean
  onImport: (file: File) => Promise<void>
  onClear: () => void
}

export const FilePanel = ({ file, pageCount, loading, onImport, onClear }: Props) => {
  const accept = (files: FileList | null): void => {
    const next = files?.[0]
    if (next) void onImport(next)
  }
  const onInput = (event: ChangeEvent<HTMLInputElement>): void => accept(event.target.files)
  const onDrop = (event: DragEvent): void => {
    event.preventDefault()
    accept(event.dataTransfer.files)
  }

  return <aside className="top-panel" onDragOver={(event) => event.preventDefault()} onDrop={onDrop}>
    <section className="file-section">
      <div className="file-section-title"><h2>原始檔案</h2></div>
      {file ? <div className="file-card">
        <span className="pdf-mark">PDF</span>
        <div><strong>{file.name}</strong><small>{(file.size / 1024 / 1024).toFixed(2)} MB ・ {pageCount} 頁</small></div>
        <button className="icon-button" onClick={onClear} aria-label="移除檔案"><Icon name="close" /></button>
      </div> : <div className="empty-file">尚未匯入 PDF</div>}
      <label className="import-button">
        <Icon name="upload" />{loading ? '讀取中…' : '匯入 PDF'}
        <input type="file" accept="application/pdf,.pdf" onChange={onInput} disabled={loading} />
      </label>
    </section>

    <div className="privacy-card"><Icon name="shield" /><div><strong>本機處理・隱私保護</strong><small>所有操作皆在瀏覽器中進行，檔案不會上傳或離開你的裝置。</small></div></div>
  </aside>
}
