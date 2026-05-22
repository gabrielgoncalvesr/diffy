# Diffy — Context

App desktop offline macOS para comparação de texto/arquivos.

## Stack

| | |
|---|---|
| Runtime | Electron 28 |
| Build | Vite 5 + TypeScript 5 |
| UI | React 18 |
| Editor | @monaco-editor/react 4.6 |
| Diff | diff (jsdiff) — diffLines |
| Testes | Vitest 1 + jsdom |
| Packaging | electron-builder 24 |

## Arquitetura

- **Estado flat**: tudo em `App.tsx` — `leftText`, `rightText`, `leftTitle`, `rightTitle`, `theme`
- **useDiff**: recalcula diff a cada mudança de texto (useMemo + debounce futuro se precisar)
- **useScrollSync**: sync de scroll por pixel ratio entre dois Monaco refs, guarda com flag `syncing` pra evitar loop
- **EditorPanel**: recebe `decorations[]` do useDiff e aplica via `editor.deltaDecorations()`
- **DiffGutter**: placeholder 40px — estrutura pronta pra conectores SVG futuros
- **IPC**: `window.electronAPI.openFile()` → `ipcMain.handle('open-file')` → dialog nativo → retorna `{ content, name }`

## Temas Monaco

Usa temas customizados `deltalens-light` e `deltalens-dark` (não `vs`/`vs-dark`) para ter controle sobre `editor.selectionBackground`. Definidos via `beforeMount` em `EditorPanel.tsx`.

## Estrutura de Arquivos

```
diffy/
├── assets/
│   └── icon.png               # logo 1254×1254 — usado pelo electron-builder pro DMG
├── electron/
│   ├── main.ts                # BrowserWindow, IPC handler open-file
│   └── preload.ts             # contextBridge → window.electronAPI.openFile
├── src/
│   ├── assets/
│   │   └── logo.png           # logo na toolbar (importado como módulo Vite)
│   ├── components/
│   │   ├── DiffGutter.tsx     # placeholder — recebe DiffResult, renderiza div.diff-gutter
│   │   ├── EditorPanel.tsx    # Monaco + título editável + aplica decorações
│   │   └── Toolbar.tsx        # header: logo, botões, badge diff count, toggle tema
│   ├── hooks/
│   │   ├── useDiff.ts         # computeDiff() exportado (testável) + useDiff() hook
│   │   ├── useDiff.test.ts    # 5 testes
│   │   ├── useScrollSync.ts   # syncScroll() exportado + useScrollSync() hook
│   │   └── useScrollSync.test.ts  # 3 testes
│   ├── App.css                # CSS vars --bg/--surface/--border/--text + dark overrides
│   ├── App.tsx                # root — estado + layout
│   ├── main.tsx               # ReactDOM.createRoot
│   └── types.ts               # Theme, DiffDecoration, DiffResult, ElectronAPI, Window
├── docs/
│   ├── superpowers/
│   │   ├── specs/2026-05-22-deltalens-design.md
│   │   └── plans/2026-05-22-deltalens.md
├── electron-builder.json
├── index.html
├── package.json
├── tsconfig.json              # renderer — moduleResolution: bundler, jsx: react-jsx
├── tsconfig.electron.json     # main process — CommonJS, esModuleInterop: true
└── vite.config.ts             # base: './', test.environment: jsdom
```

## Comandos

```bash
npm run dev    # Vite dev server + Electron (hot reload)
npm run build  # tsc electron + vite build → dist/ + dist-electron/
npm run dist   # build + electron-builder → release/Diffy-0.1.0-arm64.dmg
npx vitest run # 8 testes
```

## Decorações Diff

- Classe CSS `diff-removed` → `background-color: var(--diff-removed-bg)` (vermelho claro/escuro)
- Classe CSS `diff-added` → `background-color: var(--diff-added-bg)` (verde claro/escuro)
- Aplicadas via `editor.deltaDecorations()` — IDs armazenados em `decorationIdsRef` para diff incremental

## diffCount Logic

- Bloco `removed` → sempre incrementa diffCount
- Bloco `added` SEM bloco `removed` anterior → incrementa diffCount
- Bloco `added` COM `removed` anterior → não incrementa (já contado como 1 mudança)

## Toolbar Drag

- `.toolbar` tem `-webkit-app-region: drag`
- `.toolbar button`, `.toolbar-logo`, `.toolbar-actions`, `.toolbar-right` têm `-webkit-app-region: no-drag`
- `padding-left: 80px` reserva espaço pros traffic lights macOS

## Gotchas Conhecidos

- `@types/diff` necessário — `diff` package não tem tipos embutidos
- `jsdom` necessário como devDep para vitest environment
- `tsconfig.electron.json` precisa de `esModuleInterop: true` para imports `path` e `fs`
- Monaco selection color requer `defineTheme` — CSS override não funciona com especificidade suficiente
- `titleBarStyle: 'hiddenInset'` no Electron → toolbar precisa de padding-left 80px

## Próximos Passos (MVP+)

- [ ] Conectores SVG no DiffGutter (a estrutura já existe)
- [ ] Debounce de 150ms no useDiff para textos grandes
- [ ] Syntax highlighting por extensão de arquivo
- [ ] Keyboard shortcuts (Cmd+O, Cmd+W, etc.)
- [ ] Exportar/salvar arquivo
- [ ] Jump to next/prev diff
