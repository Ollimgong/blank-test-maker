const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  // 파일 저장
  saveFile: (filePath, content) => ipcRenderer.invoke("save-file", { filePath, content }),
  saveFileDialog: () => ipcRenderer.invoke("save-file-dialog"),
  openFileDialog: () => ipcRenderer.invoke("open-file-dialog"),
  exportUnit: (content, defaultName) => ipcRenderer.invoke("export-unit", { content, defaultName }),
  getCurrentFile: () => ipcRenderer.invoke("get-current-file"),
  printPreview: () => ipcRenderer.invoke("print-preview"),


  // 메뉴에서 보내는 이벤트 수신
  onMenuNew: (cb) => ipcRenderer.on("menu-new", cb),
  onFileOpened: (cb) => ipcRenderer.on("file-opened", (e, payload) => cb(payload)),
  onRequestSave: (cb) => ipcRenderer.on("request-save", (e, payload) => cb(payload)),
  onUnitsImported: (cb) => ipcRenderer.on("units-imported", (e, payload) => cb(payload)),
});
