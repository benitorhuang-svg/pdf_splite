import { fireEvent, render, screen } from '@testing-library/react'
import { SourceRangeInput } from './source-range-input'
import type { SourcePageInfo } from '@/domain/source-theme'

const sourcePages = new Map<number, SourcePageInfo>([
  [1, { sourceIndex: 0, localPageNumber: 1 }],
  [2, { sourceIndex: 0, localPageNumber: 2 }],
  [3, { sourceIndex: 0, localPageNumber: 3 }],
  [4, { sourceIndex: 1, localPageNumber: 1 }],
  [5, { sourceIndex: 1, localPageNumber: 2 }],
])

describe('SourceRangeInput', () => {
  it('正確渲染初始頁面範圍 Tag 標籤', () => {
    render(
      <SourceRangeInput
        partIndex={0}
        pageCount={5}
        defaultValue="S1:1, S2:1-2"
        sourcePages={sourcePages}
        onSetPages={vi.fn()}
      />
    )

    expect(screen.getByText('S1:1')).toBeInTheDocument()
    expect(screen.getByText('S2:1-2')).toBeInTheDocument()
  })

  it('支援手動輸入新增 Tag 標籤', () => {
    const onSetPages = vi.fn()
    render(
      <SourceRangeInput
        partIndex={0}
        pageCount={5}
        defaultValue="S1:1"
        sourcePages={sourcePages}
        onSetPages={onSetPages}
      />
    )

    const input = screen.getByPlaceholderText('')
    fireEvent.change(input, { target: { value: 'S2:2' } })
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' })

    expect(screen.getByText('S2:2')).toBeInTheDocument()

    // 點擊套用
    const applyBtn = screen.getByText('套用')
    fireEvent.click(applyBtn)

    // S1:1 (page 1) 和 S2:2 (S2 is sourceIndex 1, page 2 is global page 5)
    expect(onSetPages).toHaveBeenCalledWith([1, 5])
  })

  it('對無效的輸入標籤顯示警告圖示與錯誤訊息', () => {
    render(
      <SourceRangeInput
        partIndex={0}
        pageCount={5}
        defaultValue="S1:1"
        sourcePages={sourcePages}
        onSetPages={vi.fn()}
      />
    )

    const input = screen.getByPlaceholderText('')
    // S9 不存在
    fireEvent.change(input, { target: { value: 'S9:1' } })
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' })

    expect(screen.getByText('S9:1')).toBeInTheDocument()
    expect(screen.getByTitle('無效的語法或頁碼')).toBeInTheDocument()

    // 點擊套用應觸發驗證錯誤訊息
    const applyBtn = screen.getByText('套用')
    fireEvent.click(applyBtn)
    expect(screen.getByRole('alert')).toHaveTextContent('資料源 9 不存在')
  })

  it('點擊 Tag 標籤的刪除按鈕能移除該 Tag', () => {
    const onSetPages = vi.fn()
    render(
      <SourceRangeInput
        partIndex={0}
        pageCount={5}
        defaultValue="S1:1, S2:1"
        sourcePages={sourcePages}
        onSetPages={onSetPages}
      />
    )

    expect(screen.getByText('S1:1')).toBeInTheDocument()
    
    // 取得 S1:1 tag 旁的 x 按鈕並點擊
    const closeBtns = screen.getAllByRole('button', { name: /移除/ })
    fireEvent.click(closeBtns[0])

    expect(screen.queryByText('S1:1')).not.toBeInTheDocument()
    expect(screen.getByText('S2:1')).toBeInTheDocument()

    const applyBtn = screen.getByText('套用')
    fireEvent.click(applyBtn)

    // 應該只剩 S2:1 (即 global 頁面 4)
    expect(onSetPages).toHaveBeenCalledWith([4])
  })

  it('支援輔助選擇面板進行範圍視覺化編輯與套用', () => {
    const onSetPages = vi.fn()
    render(
      <SourceRangeInput
        partIndex={0}
        pageCount={5}
        defaultValue="S1:1"
        sourcePages={sourcePages}
        onSetPages={onSetPages}
      />
    )


    // 選擇資料源 2
    const select = screen.getByLabelText('來源')
    fireEvent.change(select, { target: { value: '1' } }) // index 1 corresponds to 資料源 2

    // 點擊全選此檔
    const selectAllBtn = screen.getByRole('button', { name: '全選' })
    fireEvent.click(selectAllBtn)

    expect(screen.getByText('S2:1-2')).toBeInTheDocument()

    // 點擊套用
    const applyBtn = screen.getByText('套用')
    fireEvent.click(applyBtn)

    // 應該是 S1:1 (page 1) 和 S2:1-2 (page 4, 5)
    expect(onSetPages).toHaveBeenCalledWith([1, 4, 5])
  })
})
