import { useRef, useState } from 'react'
import type { TemplateSegment } from '@/components/naming-page'

const initialSegments: TemplateSegment[] = [
  { id: 'original-name', label: '原檔名', value: '{originalName}' },
  { id: 'part-label', label: '固定文字', value: '_part_', editable: true },
  { id: 'part-number', label: '流水號', value: '{partNumber}' },
]

export const useNamingTemplate = (originalName = 'document.pdf') => {
  const [segments, setSegments] = useState<TemplateSegment[]>(initialSegments)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [draggedBlock, setDraggedBlock] = useState<Omit<TemplateSegment, 'id'> | null>(null)
  const [storageOpen, setStorageOpen] = useState(false)
  const templateId = useRef(0)
  const template = segments.map((segment) => segment.value).join('')
  const preview = `${template
    .replaceAll('{originalName}', originalName.replace(/\.pdf$/i, ''))
    .replaceAll('{partNumber}', '01')
    .replaceAll('{startPage}', '1')
    .replaceAll('{endPage}', '5')
    .replaceAll('{date}', new Date().toISOString().slice(0, 10))}.pdf`

  const addBlock = (block: Omit<TemplateSegment, 'id'>, targetIndex = segments.length): void => {
    templateId.current += 1
    const nextBlock = { ...block, id: `template-block-${templateId.current}` }
    setSegments((current) => {
      const next = [...current]
      next.splice(targetIndex, 0, nextBlock)
      return next
    })
    setDraggedBlock(null)
  }

  const reorder = (targetIndex: number): void => {
    if (draggedIndex === null || draggedIndex === targetIndex) return
    setSegments((current) => {
      const next = [...current]
      const [dragged] = next.splice(draggedIndex, 1)
      next.splice(targetIndex, 0, dragged)
      return next
    })
    setDraggedIndex(null)
  }

  return {
    segments, setSegments, draggedIndex, setDraggedIndex, draggedBlock, setDraggedBlock,
    storageOpen, setStorageOpen, template, preview, addBlock, reorder,
  }
}
