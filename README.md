<p align="center">
  <img src="assets/icon.png" width="96" alt="Diffy logo" />
</p>

<h1 align="center">Diffy</h1>

<p align="center">
  Offline macOS diff tool — fast, clean, no telemetry.
</p>

---

### Light Mode
<p align="center">
  <img src="assets/diffy-light.png" width="100%" alt="Diffy light mode" />
</p>

### Dark Mode
<p align="center">
  <img src="assets/diffy-dark.png" width="100%" alt="Diffy dark mode" />
</p>

---

## What it does

Diffy is a native macOS desktop app for comparing text side by side. Paste content directly or open files — differences are highlighted instantly with no server, no account, no internet required.

**Features:**

- Side-by-side Monaco editor with line-level diff highlighting
- Open files via native macOS dialog or paste freely
- Editable panel titles
- Swap left ↔ right with one click
- Lock/unlock scroll sync between both panels
- Diff counter badge showing number of changes
- Light and dark themes
- Fully offline — zero network access

---

## Stack

| Layer      | Tech                          |
|------------|-------------------------------|
| Runtime    | Electron 28                   |
| Build      | Vite 5 + TypeScript 5         |
| UI         | React 18                      |
| Editor     | Monaco Editor (`@monaco-editor/react`) |
| Diff       | `diff` (jsdiff) — `diffLines` |
| Tests      | Vitest 1 + jsdom              |
| Packaging  | electron-builder 24           |

---

## Getting started

```bash
# Install dependencies
npm install

# Run in development (hot reload)
npm run dev

# Run tests
npx vitest run

# Build for production
npm run build

# Package as .dmg (macOS arm64 — Apple Silicon)
npm run dist

# Install the built app (skip quarantine on unsigned builds)
xattr -cr release/mac-arm64/Diffy.app && open release/mac-arm64/Diffy.app
```

The packaged `.dmg` lands in `release/Diffy-x.x.x-arm64.dmg`.  
To install: open the `.dmg`, drag **Diffy.app** to `/Applications`.

> **Unsigned build:** macOS may block the first launch. Run `xattr -cr /Applications/Diffy.app` once to clear the quarantine flag.

---

## Project structure

```
diffy/
├── assets/             # App icon (used by electron-builder)
├── electron/
│   ├── main.ts         # BrowserWindow setup + IPC handler (open-file)
│   └── preload.ts      # contextBridge → window.electronAPI
├── src/
│   ├── components/
│   │   ├── Toolbar.tsx     # Actions, diff badge, theme toggle, scroll lock
│   │   ├── EditorPanel.tsx # Monaco instance + editable title + decorations
│   │   └── DiffGutter.tsx  # Center gutter (SVG connectors — WIP)
│   ├── hooks/
│   │   ├── useDiff.ts          # Computes diff decorations from left/right text
│   │   └── useScrollSync.ts    # Syncs scroll ratio between editors (opt-in)
│   ├── App.tsx         # Root state + layout
│   ├── App.css         # CSS vars, themes, diff colors
│   └── types.ts        # Shared TypeScript types
├── electron-builder.json
├── vite.config.ts
└── package.json
```

---

## Architecture notes

- **Flat state** — all state lives in `App.tsx` (`leftText`, `rightText`, titles, theme, `scrollLocked`)
- **`useDiff`** — pure `useMemo` over both texts, returns `leftDecorations`, `rightDecorations`, `diffCount`
- **`useScrollSync`** — disabled by default; enabled when `scrollLocked = true`; uses pixel ratio + `syncing` ref to prevent feedback loops
- **Decorations** — applied via `editor.deltaDecorations()`, stored in `decorationIdsRef` for incremental updates
- **IPC** — `window.electronAPI.openFile()` → `ipcMain.handle('open-file')` → native dialog → `{ content, name }`
- **Themes** — custom Monaco themes (`deltalens-light` / `deltalens-dark`) defined in `EditorPanel.beforeMount` for full control over selection colors

---

## Roadmap

- [ ] SVG connectors in DiffGutter
- [ ] Debounce (~150ms) for large text inputs
- [ ] Syntax highlighting by file extension
- [ ] Keyboard shortcuts (⌘O, ⌘W, next/prev diff)
- [ ] Export / save modified file

---

## License

MIT
