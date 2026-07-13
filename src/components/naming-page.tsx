import type { Dispatch, SetStateAction } from 'react'
import { Icon } from './icons'

export interface TemplateSegment {
  id: string
  label: string
  value: string
  editable?: boolean
}

const commonTemplateBlocks: readonly Omit<TemplateSegment, 'id'>[] = [
  { label: '原檔名', value: '{originalName}' },
  { label: '流水號', value: '{partNumber}' },
  { label: '起始頁', value: '{startPage}' },
  { label: '結束頁', value: '{endPage}' },
  { label: '日期', value: '{date}' },
  { label: '固定文字', value: '_part_', editable: true },
]

const moveSegment = (
  setSegments: Dispatch<SetStateAction<TemplateSegment[]>>,
  index: number,
  offset: -1 | 1,
): void => setSegments((current) => {
  const target = index + offset
  if (target < 0 || target >= current.length) return current
  const next = [...current]
  const [segment] = next.splice(index, 1)
  next.splice(target, 0, segment)
  return next
})

interface Props {
  segments: TemplateSegment[]
  setSegments: Dispatch<SetStateAction<TemplateSegment[]>>
  draggedIndex: number | null
  setDraggedIndex: Dispatch<SetStateAction<number | null>>
  draggedBlock: Omit<TemplateSegment, 'id'> | null
  setDraggedBlock: Dispatch<SetStateAction<Omit<TemplateSegment, 'id'> | null>>
  storageOpen: boolean
  setStorageOpen: Dispatch<SetStateAction<boolean>>
  preview: string
  onAddBlock: (block: Omit<TemplateSegment, 'id'>, targetIndex?: number) => void
  onReorder: (targetIndex: number) => void
  onDone: () => void
}

export const NamingPage = ({
  segments, setSegments, draggedIndex, setDraggedIndex, draggedBlock, setDraggedBlock,
  storageOpen, setStorageOpen, preview, onAddBlock, onReorder, onDone,
}: Props) => (
  <main className="naming-workspace">
    <section className="naming-card" aria-labelledby="naming-page-title">
      <h2 id="naming-page-title" className="visually-hidden">檔案拆分命名設定</h2>
      <div className="naming-card-heading">
        <div className="naming-header-composer">
          <div className="naming-composer-heading">
            <div><span className="template-builder-label">檔名編排畫布</span><p>由左至右組成檔名，副檔名會自動加上。</p></div>
            <span className="segment-count">{segments.length} 個積木</span>
          </div>
          <div
            className="template-builder"
            aria-label="拖曳調整檔名組成順序"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => { event.preventDefault(); event.stopPropagation(); if (draggedBlock) onAddBlock(draggedBlock) }}
          >
            {segments.map((segment, index) => (
              <div
                key={segment.id}
                className={`template-segment ${draggedIndex === index ? 'dragging' : ''}`}
                draggable
                onDragStart={(event) => { event.dataTransfer.effectAllowed = 'move'; setDraggedIndex(index) }}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault(); event.stopPropagation()
                  if (draggedBlock) onAddBlock(draggedBlock, index)
                  else onReorder(index)
                }}
                onDragEnd={() => setDraggedIndex(null)}
                title={`拖曳調整順序：${segment.value}`}
              >
                <span className="template-drag-handle" aria-hidden="true">⠿</span><span>{segment.label}</span>
                {segment.editable && (
                  <input
                    value={segment.value}
                    onPointerDown={(event) => event.stopPropagation()}
                    onChange={(event) => setSegments((current) => current.map((item) => item.id === segment.id ? { ...item, value: event.target.value } : item))}
                    aria-label="修改固定文字"
                  />
                )}
                <span className="template-order-controls">
                  <button type="button" disabled={index === 0} onClick={() => moveSegment(setSegments, index, -1)} aria-label={`將${segment.label}向左移動`}>←</button>
                  <button type="button" disabled={index === segments.length - 1} onClick={() => moveSegment(setSegments, index, 1)} aria-label={`將${segment.label}向右移動`}>→</button>
                </span>
                <button type="button" className="template-remove" onClick={() => setSegments((current) => current.filter((item) => item.id !== segment.id))} aria-label={`移除${segment.label}`}>×</button>
              </div>
            ))}
            {segments.length === 0 && <span className="template-builder-empty">從積木箱拖入積木</span>}
          </div>
        </div>
        <button type="button" className="primary naming-done" onClick={onDone}>前往拆分工作台 <span aria-hidden="true">→</span></button>
      </div>

      <div className="naming-studio">
        <aside className={`template-storage ${storageOpen ? 'is-open' : ''}`}>
          <button type="button" className="template-storage-toggle" onClick={() => setStorageOpen((open) => !open)} aria-expanded={storageOpen}>
            <span aria-hidden="true">＋</span> 加入命名資訊
          </button>
          <div
            className="template-storage-panel"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault(); event.stopPropagation()
              if (draggedIndex !== null) { setSegments((current) => current.filter((_, index) => index !== draggedIndex)); setDraggedIndex(null) }
            }}
          >
            <div className="template-storage-heading">
              <span className="template-storage-icon" aria-hidden="true">▦</span>
              <div><strong>命名素材庫</strong><small>點擊加入，或拖曳到右側畫布</small></div>
            </div>
            <div className="template-storage-grid">
              {commonTemplateBlocks.map((block) => (
                <button
                  key={block.value}
                  type="button"
                  draggable
                  onClick={() => onAddBlock(block)}
                  onDragStart={(event) => { event.stopPropagation(); event.dataTransfer.effectAllowed = 'copy'; setDraggedBlock(block) }}
                  onDragEnd={() => setDraggedBlock(null)}
                >
                  <span>＋</span><strong>{block.label}</strong><small>{block.value}</small>
                </button>
              ))}
            </div>
            <p>小提示：積木可重複使用，也能拖回此區移除。</p>
          </div>
        </aside>

        <div className="naming-composer naming-results">
          <div className="naming-preview" title={preview}>
            <span className="preview-file-icon" aria-hidden="true"><Icon name="file" /></span>
            <div><small>輸出檔名預覽</small><strong>{preview}</strong></div>
            <span className="preview-status"><span aria-hidden="true">✓</span> 可使用</span>
          </div>
          <div className="naming-note">
            <span aria-hidden="true">i</span>
            <p><strong>流水號會依拆分結果自動遞增</strong><small>例如 01、02、03，可避免輸出檔名重複。</small></p>
          </div>
        </div>
      </div>
    </section>
  </main>
)
