import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  openFile: (): Promise<{ content: string; name: string } | null> =>
    ipcRenderer.invoke('open-file'),
})
