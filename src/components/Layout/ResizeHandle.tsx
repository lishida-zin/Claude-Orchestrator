import { useRef, useCallback } from 'react'

interface ResizeHandleProps {
  onResize: (delta: number) => void
  direction?: 'horizontal' | 'vertical'
}

const ResizeHandle = ({ onResize, direction = 'horizontal' }: ResizeHandleProps) => {
  const isDragging = useRef(false)
  const lastPos = useRef(0)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true
    lastPos.current = direction === 'horizontal' ? e.clientX : e.clientY

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return

      const currentPos = direction === 'horizontal' ? e.clientX : e.clientY
      const delta = currentPos - lastPos.current
      lastPos.current = currentPos
      onResize(delta)
    }

    const handleMouseUp = () => {
      isDragging.current = false
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize'
    document.body.style.userSelect = 'none'
  }, [direction, onResize])

  return (
    <div
      className={`
        ${direction === 'horizontal' ? 'w-2 cursor-col-resize' : 'h-2 cursor-row-resize'}
        bg-cockpit-border hover:bg-cockpit-accent active:bg-cockpit-accent transition-colors flex-shrink-0
      `}
      onMouseDown={handleMouseDown}
    />
  )
}

export default ResizeHandle
