const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  // 폴더
  selectFolder: () => ipcRenderer.invoke("select-folder"),
  scanFolder: (dirPath) => ipcRenderer.invoke("scan-folder", dirPath),
  getWorkspace: () => ipcRenderer.invoke("get-workspace"),
  getAppSettings: () => ipcRenderer.invoke("get-app-settings"),
  saveAppSettings: (partial) => ipcRenderer.invoke("save-app-settings", partial),

  // 파일 CRUD
  readFile: (filePath) => ipcRenderer.invoke("read-file", filePath),
  writeFile: (filePath, content) => ipcRenderer.invoke("write-file", { filePath, content }),
  deleteFile: (filePath) => ipcRenderer.invoke("delete-file", filePath),
  renameFile: (oldPath, newPath) => ipcRenderer.invoke("rename-file", { oldPath, newPath }),

  // 그룹(폴더) 관리
  createGroupFolder: (folderPath) => ipcRenderer.invoke("create-group-folder", folderPath),
  deleteGroupFolder: (folderPath) => ipcRenderer.invoke("delete-group-folder", folderPath),

  // 인쇄
  printPreview: (html) => ipcRenderer.invoke("print-preview", { html }),

  // 메인 프로세스에서 보내는 이벤트
  onFolderOpened: (cb) => ipcRenderer.on("folder-opened", (e, payload) => cb(payload)),
  onMenuNewUnit: (cb) => ipcRenderer.on("menu-new-unit", cb),
  onMenuSave: (cb) => ipcRenderer.on("menu-save", cb),
});
