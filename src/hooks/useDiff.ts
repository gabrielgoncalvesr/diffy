import { useMemo } from 'react'
import { diffLines } from 'diff'
import type { DiffResult, DiffDecoration } from '../types'

export function computeDiff(leftText: string, rightText: string): DiffResult {
  const changes = diffLines(leftText, rightText)

  const leftDecorations: DiffDecoration[] = []
  const rightDecorations: DiffDecoration[] = []

  let leftLine = 1
  let rightLine = 1
  let diffCount = 0

  for (let i = 0; i < changes.length; i++) {
    const part = changes[i]
    const prevPart = changes[i - 1]
    const lineCount = part.value.split('\n').filter((_, i, arr) =>
      i < arr.length - 1 || arr[arr.length - 1] !== ''
    ).length

    if (part.removed) {
      leftDecorations.push({
        range: {
          startLineNumber: leftLine,
          startColumn: 1,
          endLineNumber: leftLine + lineCount - 1,
          endColumn: Number.MAX_SAFE_INTEGER,
        },
        options: {
          isWholeLine: true,
          className: 'diff-removed',
        },
      })
      leftLine += lineCount
      diffCount++
    } else if (part.added) {
      // count as new diff only if not paired with a preceding removed block
      if (!prevPart?.removed) diffCount++
      rightDecorations.push({
        range: {
          startLineNumber: rightLine,
          startColumn: 1,
          endLineNumber: rightLine + lineCount - 1,
          endColumn: Number.MAX_SAFE_INTEGER,
        },
        options: {
          isWholeLine: true,
          className: 'diff-added',
        },
      })
      rightLine += lineCount
    } else {
      leftLine += lineCount
      rightLine += lineCount
    }
  }

  return { leftDecorations, rightDecorations, diffCount }
}

export function useDiff(leftText: string, rightText: string): DiffResult {
  return useMemo(() => computeDiff(leftText, rightText), [leftText, rightText])
}
