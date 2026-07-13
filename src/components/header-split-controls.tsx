import type { SplitMode } from '@/domain/split-plan'
import { Icon } from './icons'

interface Props {
  readonly mode: SplitMode
  readonly onMode: (mode: SplitMode) => void
}

const modes: ReadonlyArray<{ id: SplitMode, label: string }> = [
  { id: 'fixed-count', label: '固定頁數' },
  { id: 'page-ranges', label: '手動拆分' },
]

export const HeaderSplitControls = ({ mode, onMode }: Props) => (
  <section className="header-split" aria-label="拆分方式">
    <div className="header-modes">
      {modes.map((item) => (
        <label key={item.id} className={mode === item.id ? 'active' : ''}>
          <input type="radio" name="mode" checked={mode === item.id} onChange={() => onMode(item.id)} />
          <Icon name="file" />
          <span>{item.label}</span>
        </label>
      ))}
    </div>
  </section>
)
