import type { Theme } from '../types'

interface ToolbarProps {
  diffCount: number
  theme: Theme
  onToggleTheme: () => void
  onOpenLeft: () => void
  onOpenRight: () => void
  onClear: () => void
  onSwap: () => void
  onCopyLeft: () => void
  onCopyRight: () => void
}

export function Toolbar({
  diffCount,
  theme,
  onToggleTheme,
  onOpenLeft,
  onOpenRight,
  onClear,
  onSwap,
  onCopyLeft,
  onCopyRight,
}: ToolbarProps) {
  return (
    <header className="toolbar">
      <span className="toolbar-logo">DeltaLens</span>
      <div className="toolbar-actions">
        <button onClick={onOpenLeft}>Open Left</button>
        <button onClick={onOpenRight}>Open Right</button>
        <button onClick={onClear}>Clear</button>
        <button onClick={onSwap}>⇄ Swap</button>
        <button onClick={onCopyLeft}>Copy Left</button>
        <button onClick={onCopyRight}>Copy Right</button>
      </div>
      <div className="toolbar-right">
        {diffCount > 0 && (
          <span className="diff-badge">
            {diffCount} {diffCount === 1 ? 'difference' : 'differences'}
          </span>
        )}
        <button className="theme-toggle" onClick={onToggleTheme}>
          {theme === 'dark' ? '☀ Light' : '☾ Dark'}
        </button>
      </div>
    </header>
  )
}
