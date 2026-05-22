import type { DiffResult } from '../types'

interface DiffGutterProps {
  diffs: DiffResult
}

// Placeholder for future SVG connector lines between diff blocks
export function DiffGutter(_props: DiffGutterProps) {
  return <div className="diff-gutter" />
}
