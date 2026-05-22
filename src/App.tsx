import { useState, useRef, useCallback } from 'react'
import type * as Monaco from 'monaco-editor'
import { Toolbar } from './components/Toolbar'
import { EditorPanel } from './components/EditorPanel'
import { DiffGutter } from './components/DiffGutter'
import { useDiff } from './hooks/useDiff'
import { useScrollSync } from './hooks/useScrollSync'
import type { Theme } from './types'

export function App() {
  const [leftText, setLeftText] = useState('')
  const [rightText, setRightText] = useState('')
  const [leftTitle, setLeftTitle] = useState('Left')
  const [rightTitle, setRightTitle] = useState('Right')
  const [theme, setTheme] = useState<Theme>('light')
  const [scrollLocked, setScrollLocked] = useState(false)

  const leftEditorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null)
  const rightEditorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null)

  const diff = useDiff(leftText, rightText)

  useScrollSync(leftEditorRef, rightEditorRef, scrollLocked)

  const openFile = useCallback(async (side: 'left' | 'right') => {
    const result = await window.electronAPI.openFile()
    if (!result) return
    if (side === 'left') {
      setLeftText(result.content)
      setLeftTitle(result.name)
    } else {
      setRightText(result.content)
      setRightTitle(result.name)
    }
  }, [])

  const handleClear = useCallback(() => {
    setLeftText('')
    setRightText('')
    setLeftTitle('Left')
    setRightTitle('Right')
  }, [])

  const handleSwap = useCallback(() => {
    setLeftText(rightText)
    setRightText(leftText)
    setLeftTitle(rightTitle)
    setRightTitle(leftTitle)
  }, [leftText, rightText, leftTitle, rightTitle])

  const handleCopyLeft = useCallback(() => {
    navigator.clipboard.writeText(leftText)
  }, [leftText])

  const handleCopyRight = useCallback(() => {
    navigator.clipboard.writeText(rightText)
  }, [rightText])

  return (
    <div className={`app ${theme}`}>
      <Toolbar
        diffCount={diff.diffCount}
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
        onOpenLeft={() => openFile('left')}
        onOpenRight={() => openFile('right')}
        onClear={handleClear}
        onSwap={handleSwap}
        onCopyLeft={handleCopyLeft}
        onCopyRight={handleCopyRight}
        scrollLocked={scrollLocked}
        onToggleScrollLock={() => setScrollLocked((v) => !v)}
      />
      <div className="editor-area">
        <EditorPanel
          value={leftText}
          onChange={setLeftText}
          title={leftTitle}
          onTitleChange={setLeftTitle}
          decorations={diff.leftDecorations}
          editorRef={leftEditorRef}
          theme={theme}
        />
        <DiffGutter diffs={diff} />
        <EditorPanel
          value={rightText}
          onChange={setRightText}
          title={rightTitle}
          onTitleChange={setRightTitle}
          decorations={diff.rightDecorations}
          editorRef={rightEditorRef}
          theme={theme}
        />
      </div>
    </div>
  )
}
