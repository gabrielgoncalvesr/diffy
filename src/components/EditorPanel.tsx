import { useRef, useEffect } from 'react'
import Editor, { type OnMount, type BeforeMount } from '@monaco-editor/react'
import type * as Monaco from 'monaco-editor'
import type { DiffDecoration, Theme } from '../types'

const handleBeforeMount: BeforeMount = (monaco) => {
  monaco.editor.defineTheme('deltalens-light', {
    base: 'vs',
    inherit: true,
    rules: [],
    colors: {
      'editor.selectionBackground': '#3b82f680',
      'editor.inactiveSelectionBackground': '#3b82f640',
    },
  })
  monaco.editor.defineTheme('deltalens-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [],
    colors: {
      'editor.selectionBackground': '#3b82f699',
      'editor.inactiveSelectionBackground': '#3b82f655',
    },
  })
}

interface EditorPanelProps {
  value: string
  onChange: (value: string) => void
  title: string
  onTitleChange: (title: string) => void
  decorations: DiffDecoration[]
  editorRef: React.MutableRefObject<Monaco.editor.IStandaloneCodeEditor | null>
  theme: Theme
}

export function EditorPanel({
  value,
  onChange,
  title,
  onTitleChange,
  decorations,
  editorRef,
  theme,
}: EditorPanelProps) {
  const decorationIdsRef = useRef<string[]>([])

  const handleMount: OnMount = (editor) => {
    editorRef.current = editor
  }

  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return
    decorationIdsRef.current = editor.deltaDecorations(
      decorationIdsRef.current,
      decorations.map((d) => ({ range: d.range as Monaco.IRange, options: d.options }))
    )
  }, [decorations, editorRef])

  return (
    <div className="editor-panel">
      <div className="editor-title">
        <input
          className="editor-title-input"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Click to enter title"
          spellCheck={false}
        />
      </div>
      <div className="editor-body">
        <Editor
          value={value}
          onChange={(v) => onChange(v ?? '')}
          onMount={handleMount}
          beforeMount={handleBeforeMount}
          theme={theme === 'dark' ? 'deltalens-dark' : 'deltalens-light'}
          options={{
            lineNumbers: 'on',
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            wordWrap: 'off',
            fontSize: 13,
            fontFamily: "'SF Mono', 'Cascadia Code', Consolas, monospace",
            renderLineHighlight: 'none',
            overviewRulerLanes: 0,
            hideCursorInOverviewRuler: true,
            scrollbar: {
              vertical: 'auto',
              horizontal: 'auto',
            },
          }}
        />
      </div>
    </div>
  )
}
