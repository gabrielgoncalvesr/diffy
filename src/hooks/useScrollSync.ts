import { useEffect, useRef } from 'react'
import type * as Monaco from 'monaco-editor'

export function syncScroll(
  ratio: number,
  targetScrollHeight: number,
  setScrollTop: (v: number) => void
): void {
  if (targetScrollHeight === 0) return
  const clamped = Math.min(1, Math.max(0, ratio))
  setScrollTop(Math.round(clamped * targetScrollHeight))
}

export function useScrollSync(
  leftRef: React.MutableRefObject<Monaco.editor.IStandaloneCodeEditor | null>,
  rightRef: React.MutableRefObject<Monaco.editor.IStandaloneCodeEditor | null>
): void {
  const syncing = useRef(false)

  useEffect(() => {
    const left = leftRef.current
    const right = rightRef.current
    if (!left || !right) return

    const leftDisposable = left.onDidScrollChange((e) => {
      if (syncing.current) return
      syncing.current = true
      const totalHeight = left.getScrollHeight() - left.getLayoutInfo().height
      if (totalHeight > 0) {
        const ratio = e.scrollTop / totalHeight
        const rightTotal = right.getScrollHeight() - right.getLayoutInfo().height
        right.setScrollTop(Math.round(ratio * rightTotal))
      }
      syncing.current = false
    })

    const rightDisposable = right.onDidScrollChange((e) => {
      if (syncing.current) return
      syncing.current = true
      const totalHeight = right.getScrollHeight() - right.getLayoutInfo().height
      if (totalHeight > 0) {
        const ratio = e.scrollTop / totalHeight
        const leftTotal = left.getScrollHeight() - left.getLayoutInfo().height
        left.setScrollTop(Math.round(ratio * leftTotal))
      }
      syncing.current = false
    })

    return () => {
      leftDisposable.dispose()
      rightDisposable.dispose()
    }
  }, [leftRef, rightRef])
}
