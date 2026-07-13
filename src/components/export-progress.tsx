import { useExportProgress } from '@/application/export-progress-store'

interface Props {
  readonly downloading: boolean
  readonly processing: boolean
}

export const ExportProgress = ({ downloading, processing }: Props) => {
  const progress = useExportProgress()
  if (!processing && !downloading) return null

  return (
    <div className="board-progress" role="status" aria-live="polite">
      <span>{processing ? `處理中 ${progress}%` : '正在建立下載檔案…'}</span>
      <progress value={progress} max="100" />
    </div>
  )
}
