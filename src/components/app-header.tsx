import type { DragEvent } from 'react'
import { Icon } from './icons'

export type AppTab = 'import' | 'naming' | 'workspace'

interface Props {
  activeTab: AppTab
  onTab: (tab: AppTab) => void
  onDrop: (event: DragEvent) => void
  onToggleTheme: () => void
}

export const AppHeader = ({ activeTab, onTab, onDrop, onToggleTheme }: Props) => (
  <header className="topbar" onDragOver={(event) => event.preventDefault()} onDrop={onDrop}>
    <div className="topbar-left">
      <div className="brand">
        <span className="brand-mark"><Icon name="file" /></span>
        <h1>PDF 拆分工具</h1>
      </div>
    </div>
    <nav className="app-flow" aria-label="PDF 拆分流程">
      <button type="button" className={activeTab === 'import' ? 'active' : ''} aria-current={activeTab === 'import' ? 'step' : undefined} onClick={() => onTab('import')}>
        <span>1</span>匯入檔案
      </button>
      <i aria-hidden="true">→</i>
      <button type="button" className={activeTab === 'naming' ? 'active' : ''} aria-current={activeTab === 'naming' ? 'step' : undefined} onClick={() => onTab('naming')}>
        <span>2</span>檔案拆分命名
      </button>
      <i aria-hidden="true">→</i>
      <button type="button" className={activeTab === 'workspace' ? 'active' : ''} aria-current={activeTab === 'workspace' ? 'step' : undefined} onClick={() => onTab('workspace')}>
        <span>3</span>拆分工作台
      </button>
    </nav>
    <div className="topbar-right">
      <button className="icon-button" onClick={onToggleTheme} aria-label="切換明暗模式"><Icon name="sun" /></button>
    </div>
  </header>
)
