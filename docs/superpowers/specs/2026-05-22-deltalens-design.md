# DeltaLens — Design Spec

**Date:** 2026-05-22  
**Status:** Approved

---

## Overview

DeltaLens is an offline macOS desktop diff tool built with Electron + Vite + React + TypeScript. Two Monaco editors side by side, diff calculated with jsdiff, decorations applied manually. No backend, no cloud, no auth.

---

## Architecture

**Pattern:** Flat — state lives in `App.tsx`, passed as props.  
**Editor:** Two independent Monaco Editor instances (not Monaco DiffEditor).  
**Diff engine:** `diff` (jsdiff) library — line-by-line diff, results mapped to Monaco decorations.  
**Theme:** Dark/light toggle stored in `App.tsx` state, passed to Monaco and CSS.  
**State shape:**

```ts
{
  leftText: string
  rightText: string
  leftTitle: string
  rightTitle: string
  diffs: DiffResult[]
  diffCount: number
  theme: 'light' | 'dark'
}
```

---

## File Structure

```
deltalens/
├── electron/
│   ├── main.ts          # Electron main process, BrowserWindow setup
│   └── preload.ts       # IPC bridge: openFile dialog → renderer
├── src/
│   ├── main.tsx         # React entry point
│   ├── App.tsx          # Root state + layout
│   ├── App.css          # Global styles
│   ├── components/
│   │   ├── Toolbar.tsx      # Header: buttons + diff counter + theme toggle
│   │   ├── EditorPanel.tsx  # Monaco wrapper + editable title
│   │   └── DiffGutter.tsx   # SVG gutter placeholder (future: connectors)
│   ├── hooks/
│   │   ├── useDiff.ts       # jsdiff → DiffResult[] + Monaco decorations
│   │   └── useScrollSync.ts # Line-based scroll sync between two editors
│   └── types.ts         # Shared TypeScript types
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── electron-builder.json
```

---

## Components

### Toolbar
- Buttons: Open Left, Open Right, Clear, Swap, Copy Left, Copy Right
- Diff counter badge (amber, shows count of changed blocks)
- Dark/light toggle button (right side of header)
- Calls IPC `openFile` for Open buttons
- All actions are callbacks from App.tsx

### EditorPanel
- Props: `value`, `onChange`, `title`, `onTitleChange`, `decorations`, `editorRef`, `theme`
- Editable title above editor (click to edit, `contenteditable` or input)
- Monaco Editor instance with line numbers enabled
- Applies `decorations` array from useDiff hook on change
- Exposes `editorRef` for scroll sync

### DiffGutter
- Props: `diffs`, `leftEditorRef`, `rightEditorRef`
- Renders SVG connecting changed line blocks between editors
- **MVP:** renders empty `<div className="diff-gutter" />` — structure only
- Width: 40px fixed

### useDiff
- Input: `leftText: string`, `rightText: string`
- Uses `diff.diffLines()` from jsdiff
- Returns: `{ diffs, diffCount, leftDecorations, rightDecorations }`
- Left decorations: removed lines → red background (`#fee2e2` light / `#3a1212` dark)
- Right decorations: added lines → green background (`#dcfce7` light / `#0d2e1a` dark)
- Recalculates on every text change (debounced 150ms)

### useScrollSync
- Takes two `editor: monaco.editor.IStandaloneCodeEditor` refs
- Syncs scroll position by scrollTop pixel ratio (scrollTop / scrollHeight) on `onDidScrollChange`
- Guards against infinite loop with a `syncing` flag

---

## Data Flow

```
User types in EditorPanel
  → onChange → App.tsx updates leftText/rightText
    → useDiff recalculates (debounced 150ms)
      → decorations applied to both Monaco instances
      → diffCount updated in Toolbar
```

```
User clicks "Open Left"
  → Toolbar calls onOpenLeft
    → App.tsx calls window.electronAPI.openFile()
      → Electron shows native file dialog
        → file contents returned via IPC
          → App.tsx sets leftText
```

---

## Electron Setup

- **main.ts:** Creates BrowserWindow, loads Vite dev server (dev) or built index.html (prod). Sets `contextIsolation: true`, `nodeIntegration: false`.
- **preload.ts:** Exposes `window.electronAPI.openFile(side)` via `contextBridge`. Triggers `dialog.showOpenDialog` filtered to `.txt,.json,.xml,.csv,.md,.log`.
- **IPC channel:** `open-file` (renderer → main → renderer)

---

## Styling

- CSS custom properties for theme: `--bg`, `--surface`, `--border`, `--text`
- Light: white background, gray borders, standard font
- Dark: `#1e1e1e` background, Monaco dark theme
- Font: system monospace stack (`'SF Mono', 'Cascadia Code', Consolas, monospace`)
- Layout: `display: flex`, full viewport height, no scroll on outer container
- Gutter: `40px` fixed width between editors

---

## Not in MVP

- Save/export file
- Find & replace
- Syntax highlighting by language (Monaco defaults only)
- SVG connector lines in gutter (structure ready, not implemented)
- Keyboard shortcuts
- Window menu beyond defaults

---

## Build & Run

```bash
npm install
npm run dev      # Electron + Vite dev server
npm run build    # Compile TS + Vite build
npm run dist     # electron-builder → .dmg for macOS
```
