import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  readonly children: ReactNode
}

interface State {
  readonly error: Error | null
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('PDF splitter render failure', error, info.componentStack)
  }

  render(): ReactNode {
    if (!this.state.error) return this.props.children

    return (
      <main className="fatal-error" role="alert" aria-labelledby="fatal-error-title">
        <div className="fatal-error-card">
          <span className="fatal-error-mark" aria-hidden="true">!</span>
          <h1 id="fatal-error-title">工作區暫時無法顯示</h1>
          <p>PDF 解析或畫面元件發生未預期錯誤。檔案未曾上傳至伺服器。</p>
          <button type="button" onClick={() => window.location.reload()}>
            重新載入工作區
          </button>
        </div>
      </main>
    )
  }
}
