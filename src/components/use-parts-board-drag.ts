import { useEffect, useState, type DragEvent } from 'react'

interface Options {
  onMovePage: (pageNumber: number, targetPartIdx: number, targetPageIdx?: number) => void
  onReorderPage: (partIdx: number, fromPageIdx: number, toPageIdx: number) => void
}

export const usePartsBoardDrag = ({ onMovePage, onReorderPage }: Options) => {
  const [activeDropPart, setActiveDropPart] = useState<number | null>(null)
  const [activeDropPage, setActiveDropPage] = useState<{ partIdx: number, pageIdx: number } | null>(null)
  const [draggingPage, setDraggingPage] = useState<number | null>(null)

  useEffect(() => {
    const clearDragState = (): void => {
      setActiveDropPart(null)
      setActiveDropPage(null)
      setDraggingPage(null)
    }
    window.addEventListener('dragend', clearDragState)
    window.addEventListener('drop', clearDragState)
    return () => {
      window.removeEventListener('dragend', clearDragState)
      window.removeEventListener('drop', clearDragState)
    }
  }, [])

  const handleDragOverContainer = (event: DragEvent, partIdx: number) => {
    event.preventDefault()
    setActiveDropPart((current) => current === partIdx ? current : partIdx)
    setActiveDropPage((current) => current === null ? current : null)
  }
  const handleDragLeaveContainer = (event: DragEvent<HTMLElement>) => {
    const nextTarget = event.relatedTarget as Node | null
    if (nextTarget && event.currentTarget.contains(nextTarget)) return
    const bounds = event.currentTarget.getBoundingClientRect()
    const isStillInside = event.clientX >= bounds.left && event.clientX <= bounds.right
      && event.clientY >= bounds.top && event.clientY <= bounds.bottom
    if (isStillInside) return
    setActiveDropPart(null)
    setActiveDropPage(null)
  }
  const handleDropContainer = (event: DragEvent, targetPartIdx: number) => {
    event.preventDefault()
    setActiveDropPart(null)
    setActiveDropPage(null)
    const data = event.dataTransfer.getData('text/plain')
    if (!data.startsWith('page:')) return
    const [, pageValue, fromPartValue] = data.split(':')
    const pageNumber = Number(pageValue)
    if (fromPartValue === undefined || Number(fromPartValue) !== targetPartIdx) {
      onMovePage(pageNumber, targetPartIdx)
    }
  }
  const handleDragStartCard = (event: DragEvent, pageNumber: number, partIdx: number, pageIdx: number) => {
    event.dataTransfer.setData('text/plain', `page:${pageNumber}:${partIdx}:${pageIdx}`)
    event.dataTransfer.setData('application/x-pdf-split-part-page', String(pageNumber))
    event.dataTransfer.effectAllowed = 'move'
    setDraggingPage(pageNumber)
  }
  const handleDragOverCard = (event: DragEvent, partIdx: number, pageIdx: number) => {
    event.preventDefault()
    event.stopPropagation()
    setActiveDropPart((current) => current === partIdx ? current : partIdx)
    setActiveDropPage((current) =>
      current?.partIdx === partIdx && current.pageIdx === pageIdx
        ? current
        : { partIdx, pageIdx })
  }
  const handleDropCard = (event: DragEvent, targetPartIdx: number, targetPageIdx: number) => {
    event.stopPropagation()
    event.preventDefault()
    setActiveDropPart(null)
    setActiveDropPage(null)
    const data = event.dataTransfer.getData('text/plain')
    if (!data.startsWith('page:')) return
    const [, pageValue, fromPartValue, fromPageValue] = data.split(':')
    const pageNumber = Number(pageValue)
    const fromPartIdx = Number(fromPartValue)
    const fromPageIdx = Number(fromPageValue)
    if (fromPartIdx === targetPartIdx) {
      onReorderPage(targetPartIdx, fromPageIdx, targetPageIdx)
    } else {
      onMovePage(pageNumber, targetPartIdx, targetPageIdx)
    }
  }

  return {
    activeDropPart,
    activeDropPage,
    draggingPage,
    setActiveDropPart,
    setActiveDropPage,
    setDraggingPage,
    handleDragOverContainer,
    handleDragLeaveContainer,
    handleDropContainer,
    handleDragStartCard,
    handleDragOverCard,
    handleDropCard,
  }
}
