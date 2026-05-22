# DeltaLens Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an offline macOS desktop diff tool with two Monaco editors, jsdiff-powered highlighting, dark/light toggle, and file open via Electron IPC.

**Architecture:** Flat React state in App.tsx, two independent Monaco Editor instances with decorations applied from useDiff hook output, scroll sync via useScrollSync hook. Electron main process handles file dialog via IPC bridge in preload.

**Tech Stack:** Electron 28, Vite 5, React 18, TypeScript 5, @monaco-editor/react, diff (jsdiff), electron-builder

---

## File Map

| File | Responsibility |
|---|---|
| `package.json` | deps, scripts |
| `tsconfig.json` | TS config (two: app + electron) |
| `vite.config.ts` | Vite + electron-vite or plain vite for renderer |
| `electron-builder.json` | macOS DMG packaging |
| `index.html` | HTML entry |
| `electron/main.ts` | BrowserWindow, IPC handler |
| `electron/preload.ts` | contextBridge → window.electronAPI |
| `src/main.tsx` | React entry |
| `src/types.ts` | Shared types |
| `src/App.tsx` | Root state + layout |
| `src/App.css` | Global styles + CSS vars for theme |
| `src/hooks/useDiff.ts` | jsdiff → decorations |
| `src/hooks/useScrollSync.ts` | scroll sync between two Monaco refs |
| `src/components/Toolbar.tsx` | Header buttons + diff counter + theme toggle |
| `src/components/EditorPanel.tsx` | Monaco wrapper + editable title |
| `src/components/DiffGutter.tsx` | SVG gutter placeholder |

---

## Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsconfig.electron.json`
- Create: `vite.config.ts`
- Create: `electron-builder.json`
- Create: `index.html`
- Create: `.gitignore`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "deltalens",
  "version": "0.1.0",
  "description": "Offline macOS diff tool",
  "main": "dist-electron/main.js",
  "scripts": {
    "dev": "concurrently \"vite\" \"wait-on http://localhost:5173 && electron .\"",
    "build": "tsc -p tsconfig.electron.json && vite build",
    "dist": "npm run build && electron-builder",
    "preview": "vite preview"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.0.0",
    "@types/react-dom": "^18.0.0",
    "@vitejs/plugin-react": "^4.0.0",
    "concurrently": "^8.0.0",
    "electron": "^28.0.0",
    "electron-builder": "^24.0.0",
    "typescript": "^5.0.0",
    "vite": "^5.0.0",
    "vitest": "^1.0.0",
    "wait-on": "^7.0.0"
  },
  "dependencies": {
    "@monaco-editor/react": "^4.6.0",
    "diff": "^5.1.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json** (renderer — strict, DOM lib)

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "skipLibCheck": true,
    "outDir": "dist"
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create tsconfig.electron.json** (main process — CommonJS/Node)

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020"],
    "module": "CommonJS",
    "moduleResolution": "node",
    "strict": true,
    "skipLibCheck": true,
    "outDir": "dist-electron"
  },
  "include": ["electron"]
}
```

- [ ] **Step 4: Create vite.config.ts**

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
})
```

- [ ] **Step 5: Create electron-builder.json**

```json
{
  "appId": "com.deltalens.app",
  "productName": "DeltaLens",
  "directories": {
    "buildResources": "assets",
    "output": "release"
  },
  "files": [
    "dist/**/*",
    "dist-electron/**/*"
  ],
  "mac": {
    "category": "public.app-category.developer-tools",
    "target": "dmg"
  }
}
```

- [ ] **Step 6: Create index.html**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>DeltaLens</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 7: Create .gitignore**

```
node_modules/
dist/
dist-electron/
release/
.superpowers/
```

- [ ] **Step 8: Install dependencies**

```bash
cd /Users/gabriel/projects/diffy && npm install
```

Expected: `node_modules/` created, no errors.

- [ ] **Step 9: Commit**

```bash
git init && git add -A && git commit -m "chore: project scaffold"
```

---

## Task 2: Electron Main + Preload

**Files:**
- Create: `electron/main.ts`
- Create: `electron/preload.ts`

- [ ] **Step 1: Create electron/main.ts**

```ts
import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import path from 'path'
import fs from 'fs'

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 500,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (isDev) {
    win.loadURL('http://localhost:5173')
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

ipcMain.handle('open-file', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      { name: 'Text Files', extensions: ['txt', 'json', 'xml', 'csv', 'md', 'log'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  })
  if (result.canceled || result.filePaths.length === 0) return null
  const filePath = result.filePaths[0]
  const content = fs.readFileSync(filePath, 'utf-8')
  return { content, name: path.basename(filePath) }
})
```

- [ ] **Step 2: Create electron/preload.ts**

```ts
import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  openFile: (): Promise<{ content: string; name: string } | null> =>
    ipcRenderer.invoke('open-file'),
})
```

- [ ] **Step 3: Compile electron files to verify no TS errors**

```bash
cd /Users/gabriel/projects/diffy && npx tsc -p tsconfig.electron.json --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add electron/ tsconfig.electron.json && git commit -m "feat: electron main process and IPC bridge"
```

---

## Task 3: Types

**Files:**
- Create: `src/types.ts`

- [ ] **Step 1: Create src/types.ts**

```ts
import type * as monaco from 'monaco-editor'

export type Theme = 'light' | 'dark'

export interface DiffDecoration {
  range: monaco.IRange
  options: monaco.editor.IModelDecorationOptions
}

export interface DiffResult {
  leftDecorations: DiffDecoration[]
  rightDecorations: DiffDecoration[]
  diffCount: number
}

export interface ElectronAPI {
  openFile: () => Promise<{ content: string; name: string } | null>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types.ts && git commit -m "feat: shared TypeScript types"
```

---

## Task 4: useDiff Hook

**Files:**
- Create: `src/hooks/useDiff.ts`
- Create: `src/hooks/useDiff.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/hooks/useDiff.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { computeDiff } from './useDiff'

describe('computeDiff', () => {
  it('returns zero diffCount for identical text', () => {
    const result = computeDiff('hello\nworld\n', 'hello\nworld\n')
    expect(result.diffCount).toBe(0)
    expect(result.leftDecorations).toHaveLength(0)
    expect(result.rightDecorations).toHaveLength(0)
  })

  it('detects added lines on the right', () => {
    const result = computeDiff('hello\n', 'hello\nworld\n')
    expect(result.diffCount).toBe(1)
    expect(result.rightDecorations).toHaveLength(1)
    expect(result.leftDecorations).toHaveLength(0)
  })

  it('detects removed lines on the left', () => {
    const result = computeDiff('hello\nworld\n', 'hello\n')
    expect(result.diffCount).toBe(1)
    expect(result.leftDecorations).toHaveLength(1)
    expect(result.rightDecorations).toHaveLength(0)
  })

  it('detects changed lines on both sides', () => {
    const result = computeDiff('hello\n', 'world\n')
    expect(result.diffCount).toBe(1)
    expect(result.leftDecorations).toHaveLength(1)
    expect(result.rightDecorations).toHaveLength(1)
  })

  it('decoration range startLineNumber starts at 1', () => {
    const result = computeDiff('a\nb\n', 'a\nc\n')
    const dec = result.leftDecorations[0]
    expect(dec.range.startLineNumber).toBeGreaterThanOrEqual(1)
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd /Users/gabriel/projects/diffy && npx vitest run src/hooks/useDiff.test.ts
```

Expected: FAIL — `computeDiff` not found.

- [ ] **Step 3: Implement useDiff.ts**

Create `src/hooks/useDiff.ts`:

```ts
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

  for (const part of changes) {
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
```

- [ ] **Step 4: Run tests — confirm pass**

```bash
cd /Users/gabriel/projects/diffy && npx vitest run src/hooks/useDiff.test.ts
```

Expected: 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/ && git commit -m "feat: useDiff hook with jsdiff line diffing"
```

---

## Task 5: useScrollSync Hook

**Files:**
- Create: `src/hooks/useScrollSync.ts`
- Create: `src/hooks/useScrollSync.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/hooks/useScrollSync.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest'
import { syncScroll } from './useScrollSync'

describe('syncScroll', () => {
  it('does not throw when called with valid ratios', () => {
    const setScrollTop = vi.fn()
    expect(() => syncScroll(0.5, 1000, setScrollTop)).not.toThrow()
    expect(setScrollTop).toHaveBeenCalledWith(500)
  })

  it('clamps ratio to [0, 1]', () => {
    const setScrollTop = vi.fn()
    syncScroll(1.5, 1000, setScrollTop)
    expect(setScrollTop).toHaveBeenCalledWith(1000)
  })

  it('handles zero scrollHeight without throwing', () => {
    const setScrollTop = vi.fn()
    expect(() => syncScroll(0.5, 0, setScrollTop)).not.toThrow()
    expect(setScrollTop).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd /Users/gabriel/projects/diffy && npx vitest run src/hooks/useScrollSync.test.ts
```

Expected: FAIL — `syncScroll` not found.

- [ ] **Step 3: Implement useScrollSync.ts**

Create `src/hooks/useScrollSync.ts`:

```ts
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
```

- [ ] **Step 4: Run tests — confirm pass**

```bash
cd /Users/gabriel/projects/diffy && npx vitest run src/hooks/useScrollSync.test.ts
```

Expected: 3 tests PASS.

- [ ] **Step 5: Run all tests**

```bash
cd /Users/gabriel/projects/diffy && npx vitest run
```

Expected: 8 tests PASS total.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useScrollSync.ts src/hooks/useScrollSync.test.ts && git commit -m "feat: useScrollSync hook"
```

---

## Task 6: DiffGutter Component (Placeholder)

**Files:**
- Create: `src/components/DiffGutter.tsx`

- [ ] **Step 1: Create DiffGutter.tsx**

```tsx
import type { DiffResult } from '../types'

interface DiffGutterProps {
  diffs: DiffResult
}

// Placeholder for future SVG connector lines between diff blocks
export function DiffGutter(_props: DiffGutterProps) {
  return <div className="diff-gutter" />
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/DiffGutter.tsx && git commit -m "feat: DiffGutter placeholder"
```

---

## Task 7: EditorPanel Component

**Files:**
- Create: `src/components/EditorPanel.tsx`

- [ ] **Step 1: Create EditorPanel.tsx**

```tsx
import { useRef, useEffect } from 'react'
import Editor, { OnMount } from '@monaco-editor/react'
import type * as Monaco from 'monaco-editor'
import type { DiffDecoration, Theme } from '../types'

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
          theme={theme === 'dark' ? 'vs-dark' : 'light'}
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
```

- [ ] **Step 2: Commit**

```bash
git add src/components/EditorPanel.tsx && git commit -m "feat: EditorPanel with Monaco and decorations"
```

---

## Task 8: Toolbar Component

**Files:**
- Create: `src/components/Toolbar.tsx`

- [ ] **Step 1: Create Toolbar.tsx**

```tsx
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
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Toolbar.tsx && git commit -m "feat: Toolbar component"
```

---

## Task 9: App.tsx — Root State and Layout

**Files:**
- Create: `src/App.tsx`
- Create: `src/main.tsx`

- [ ] **Step 1: Create src/main.tsx**

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import './App.css'
import { App } from './App'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

- [ ] **Step 2: Create src/App.tsx**

```tsx
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

  const leftEditorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null)
  const rightEditorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null)

  const diff = useDiff(leftText, rightText)

  useScrollSync(leftEditorRef, rightEditorRef)

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
```

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx src/main.tsx && git commit -m "feat: App root state and layout"
```

---

## Task 10: CSS — Styles and Theme

**Files:**
- Create: `src/App.css`

- [ ] **Step 1: Create src/App.css**

```css
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

:root {
  --bg: #ffffff;
  --surface: #f3f4f6;
  --surface2: #f9fafb;
  --border: #e5e7eb;
  --text: #111827;
  --text-muted: #6b7280;
  --btn-bg: #ffffff;
  --btn-border: #d1d5db;
  --diff-removed-bg: #fee2e2;
  --diff-added-bg: #dcfce7;
}

.app.dark {
  --bg: #1e1e1e;
  --surface: #252526;
  --surface2: #2d2d2d;
  --border: #3e3e42;
  --text: #d4d4d4;
  --text-muted: #858585;
  --btn-bg: #3c3c3c;
  --btn-border: #555;
  --diff-removed-bg: #3a1212;
  --diff-added-bg: #0d2e1a;
}

html, body, #root {
  height: 100%;
  overflow: hidden;
}

.app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--bg);
  color: var(--text);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

/* Toolbar */
.toolbar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
  flex-wrap: wrap;
}

.toolbar-logo {
  font-weight: 700;
  font-size: 14px;
  margin-right: 6px;
  color: var(--text);
}

.toolbar-actions {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.toolbar button {
  font-size: 11px;
  padding: 4px 10px;
  background: var(--btn-bg);
  border: 1px solid var(--btn-border);
  border-radius: 4px;
  cursor: pointer;
  color: var(--text);
}

.toolbar button:hover {
  background: var(--surface2);
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}

.diff-badge {
  font-size: 11px;
  background: #fef3c7;
  color: #92400e;
  padding: 3px 10px;
  border-radius: 12px;
  font-weight: 600;
  white-space: nowrap;
}

.app.dark .diff-badge {
  background: #451a03;
  color: #fbbf24;
}

.theme-toggle {
  font-size: 11px;
  padding: 4px 10px;
  background: var(--btn-bg);
  border: 1px solid var(--btn-border);
  border-radius: 4px;
  cursor: pointer;
  color: var(--text);
}

/* Editor area */
.editor-area {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.editor-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  border-right: 1px solid var(--border);
}

.editor-panel:last-child {
  border-right: none;
  border-left: 1px solid var(--border);
}

.editor-title {
  padding: 4px 8px;
  background: var(--surface2);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.editor-title-input {
  width: 100%;
  background: transparent;
  border: none;
  outline: none;
  font-size: 12px;
  font-weight: 500;
  color: var(--text);
  cursor: text;
}

.editor-title-input::placeholder {
  color: var(--text-muted);
  font-style: italic;
}

.editor-body {
  flex: 1;
  overflow: hidden;
}

/* Gutter */
.diff-gutter {
  width: 40px;
  flex-shrink: 0;
  background: var(--surface2);
  border-left: 1px solid var(--border);
  border-right: 1px solid var(--border);
}

/* Monaco diff decorations */
.diff-removed {
  background-color: var(--diff-removed-bg) !important;
}

.diff-added {
  background-color: var(--diff-added-bg) !important;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/App.css && git commit -m "feat: CSS styles with light/dark theme vars"
```

---

## Task 11: Wire Up and Verify Dev Build

- [ ] **Step 1: Compile renderer TS**

```bash
cd /Users/gabriel/projects/diffy && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 2: Compile electron TS**

```bash
cd /Users/gabriel/projects/diffy && npx tsc -p tsconfig.electron.json --noEmit
```

Expected: no errors.

- [ ] **Step 3: Run all tests**

```bash
cd /Users/gabriel/projects/diffy && npx vitest run
```

Expected: 8 tests PASS.

- [ ] **Step 4: Build electron files**

```bash
cd /Users/gabriel/projects/diffy && npx tsc -p tsconfig.electron.json
```

Expected: `dist-electron/main.js` and `dist-electron/preload.js` created.

- [ ] **Step 5: Start dev server**

```bash
cd /Users/gabriel/projects/diffy && npm run dev
```

Expected: Vite server starts on port 5173, Electron window opens with DeltaLens UI. Verify:
- Header visible with all buttons
- Two editor panels side by side
- 40px gutter between them
- Type in left editor — diff highlights appear in red
- Type same text in right editor — highlights disappear
- Open Left button triggers file dialog
- Theme toggle switches dark/light

- [ ] **Step 6: Final commit**

```bash
git add -A && git commit -m "feat: DeltaLens MVP complete"
```

---

## Task 12: Production Build (Optional — run when ready to distribute)

- [ ] **Step 1: Full build**

```bash
cd /Users/gabriel/projects/diffy && npm run build
```

Expected: `dist/` (Vite) and `dist-electron/` (TS) created.

- [ ] **Step 2: Package DMG**

```bash
cd /Users/gabriel/projects/diffy && npm run dist
```

Expected: `release/DeltaLens-0.1.0.dmg` created.
