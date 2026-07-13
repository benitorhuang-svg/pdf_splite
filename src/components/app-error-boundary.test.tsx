import { render, screen } from '@testing-library/react'
import { AppErrorBoundary } from './app-error-boundary'

const Broken = () => {
  throw new Error('broken render')
}

describe('AppErrorBoundary', () => {
  it('以可復原畫面取代未捕捉的 render error', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    render(<AppErrorBoundary><Broken /></AppErrorBoundary>)

    expect(screen.getByRole('alert')).toHaveTextContent('工作區暫時無法顯示')
    expect(screen.getByRole('button', { name: '重新載入工作區' })).toBeVisible()
    error.mockRestore()
  })
})
