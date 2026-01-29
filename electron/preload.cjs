const { contextBridge, ipcRenderer } = require('electron');

// Electron API をレンダラープロセスに公開
contextBridge.exposeInMainWorld('electronAPI', {
  // ウィンドウ操作
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close')
  },

  // ファイルシステム操作
  fs: {
    readDirectory: (dirPath) => ipcRenderer.invoke('fs:readDirectory', dirPath),
    readFile: (filePath) => ipcRenderer.invoke('fs:readFile', filePath),
    writeFile: (filePath, content) => ipcRenderer.invoke('fs:writeFile', filePath, content),
    selectDirectory: () => ipcRenderer.invoke('fs:selectDirectory'),
    getLastOpenedPath: () => ipcRenderer.invoke('fs:getLastOpenedPath')
  },

  // ターミナル（PTY）操作
  pty: {
    getShells: () => ipcRenderer.invoke('pty:getShells'),
    create: (id, cwd, shellId) => ipcRenderer.invoke('pty:create', id, cwd, shellId),
    write: (id, data) => ipcRenderer.send('pty:write', id, data),
    resize: (id, cols, rows) => ipcRenderer.send('pty:resize', id, cols, rows),
    kill: (id) => ipcRenderer.send('pty:kill', id),
    onData: (id, callback) => {
      const handler = (_event, data) => callback(data);
      ipcRenderer.on(`pty:data:${id}`, handler);
      return () => ipcRenderer.removeListener(`pty:data:${id}`, handler);
    },
    onExit: (id, callback) => {
      const handler = (_event, exitCode) => callback(exitCode);
      ipcRenderer.on(`pty:exit:${id}`, handler);
      return () => ipcRenderer.removeListener(`pty:exit:${id}`, handler);
    }
  },

  // 設定操作
  settings: {
    load: () => ipcRenderer.invoke('settings:load'),
    save: (settings) => ipcRenderer.invoke('settings:save', settings)
  }
});
