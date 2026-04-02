const { app, BrowserWindow, ipcMain, dialog, Menu } = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");

let mainWindow;
let workspaceDir = null;

const SETTINGS_PATH = path.join(app.getPath("userData"), "settings.json");

function loadAppSettings() {
  try {
    const s = JSON.parse(fs.readFileSync(SETTINGS_PATH, "utf-8"));
    return s;
  } catch { return {}; }
}
function saveAppSettings(s) {
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(s, null, 2), "utf-8");
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: "백지테스트 메이커",
    icon: path.join(__dirname, "../build/icon.ico"),
  });

  if (process.argv.includes("--dev")) {
    mainWindow.loadURL("http://localhost:5173/");
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  updateTitle();
  buildMenu();
}

function updateTitle() {
  const folder = workspaceDir ? path.basename(workspaceDir) : "폴더를 선택하세요";
  mainWindow.setTitle(`${folder} - 백지테스트 메이커`);
}

function buildMenu() {
  const template = [
    {
      label: "파일",
      submenu: [
        { label: "작업 폴더 열기...", accelerator: "CmdOrCtrl+O", click: () => selectFolder() },
        { type: "separator" },
        { label: "새 단원", accelerator: "CmdOrCtrl+N", click: () => mainWindow.webContents.send("menu-new-unit") },
        { label: "저장", accelerator: "CmdOrCtrl+S", click: () => mainWindow.webContents.send("menu-save") },
        { type: "separator" },
        { label: "종료", accelerator: "CmdOrCtrl+Q", click: () => app.quit() },
      ],
    },
    {
      label: "편집",
      submenu: [
        { role: "undo", label: "실행 취소" },
        { role: "redo", label: "다시 실행" },
        { type: "separator" },
        { role: "cut", label: "잘라내기" },
        { role: "copy", label: "복사" },
        { role: "paste", label: "붙여넣기" },
        { role: "selectAll", label: "전체 선택" },
      ],
    },
    {
      label: "보기",
      submenu: [
        { role: "reload", label: "새로고침" },
        { role: "toggleDevTools", label: "개발자 도구" },
        { type: "separator" },
        { role: "zoomIn", label: "확대" },
        { role: "zoomOut", label: "축소" },
        { role: "resetZoom", label: "원래 크기" },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// 폴더 스캔: .btm 파일 목록 + 하위폴더(그룹)
function scanFolder(dirPath) {
  if (!dirPath || !fs.existsSync(dirPath)) return { files: [], groups: [] };
  const files = [];
  const groups = [];

  // 루트 .btm 파일
  const rootEntries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const e of rootEntries) {
    if (e.isFile() && (e.name.endsWith(".btm") || e.name.endsWith(".json"))) {
      files.push({ name: e.name, path: path.join(dirPath, e.name), group: null });
    }
    if (e.isDirectory() && !e.name.startsWith(".")) {
      const groupName = e.name;
      const groupPath = path.join(dirPath, e.name);
      groups.push({ name: groupName, path: groupPath });
      // 하위폴더 내 .btm 파일
      try {
        const subEntries = fs.readdirSync(groupPath, { withFileTypes: true });
        for (const se of subEntries) {
          if (se.isFile() && (se.name.endsWith(".btm") || se.name.endsWith(".json"))) {
            files.push({ name: se.name, path: path.join(groupPath, se.name), group: groupName });
          }
        }
      } catch {}
    }
  }
  return { files, groups };
}

async function selectFolder() {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "작업 폴더 선택",
    properties: ["openDirectory"],
  });
  if (result.canceled || !result.filePaths.length) return;
  workspaceDir = result.filePaths[0];
  saveAppSettings({ ...loadAppSettings(), lastFolder: workspaceDir });
  updateTitle();
  const scan = scanFolder(workspaceDir);
  mainWindow.webContents.send("folder-opened", { dirPath: workspaceDir, ...scan });
}

// IPC handlers
ipcMain.handle("select-folder", async () => {
  await selectFolder();
});

ipcMain.handle("scan-folder", (event, dirPath) => {
  return scanFolder(dirPath || workspaceDir);
});

ipcMain.handle("read-file", (event, filePath) => {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    return { success: true, content };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("write-file", (event, { filePath, content }) => {
  try {
    // 디렉토리가 없으면 생성
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, content, "utf-8");
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("delete-file", (event, filePath) => {
  try {
    fs.unlinkSync(filePath);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("rename-file", (event, { oldPath, newPath }) => {
  try {
    const dir = path.dirname(newPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.renameSync(oldPath, newPath);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("create-group-folder", (event, folderPath) => {
  try {
    if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath, { recursive: true });
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("delete-group-folder", (event, folderPath) => {
  try {
    // 폴더 내 파일이 있으면 루트로 이동
    const entries = fs.readdirSync(folderPath, { withFileTypes: true });
    const parentDir = path.dirname(folderPath);
    for (const e of entries) {
      if (e.isFile()) {
        fs.renameSync(path.join(folderPath, e.name), path.join(parentDir, e.name));
      }
    }
    fs.rmdirSync(folderPath);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("get-app-settings", () => loadAppSettings());

ipcMain.handle("get-workspace", () => workspaceDir);

ipcMain.handle("print-preview", async (event, { html }) => {
  // HTML을 임시 파일로 저장 후 로드
  const tmpHtml = path.join(os.tmpdir(), `bt-print-${Date.now()}.html`);
  fs.writeFileSync(tmpHtml, html, "utf-8");
  const printWin = new BrowserWindow({
    show: false,
    width: 800,
    height: 600,
    webPreferences: { contextIsolation: true },
  });
  await printWin.loadFile(tmpHtml);
  // 폰트/렌더링 대기
  await new Promise((r) => setTimeout(r, 1500));
  const pdfData = await printWin.webContents.printToPDF({
    pageSize: "A4",
    printBackground: true,
    margins: { top: 0, bottom: 0, left: 0, right: 0 },
  });
  printWin.destroy();
  try { fs.unlinkSync(tmpHtml); } catch {}
  const tmpPath = path.join(os.tmpdir(), `bt-preview-${Date.now()}.pdf`);
  fs.writeFileSync(tmpPath, pdfData);
  const previewWin = new BrowserWindow({
    parent: mainWindow,
    width: 900,
    height: 750,
    title: "인쇄 미리보기",
    webPreferences: { contextIsolation: true, plugins: true },
  });
  previewWin.setMenuBarVisibility(false);
  previewWin.loadFile(tmpPath);
  previewWin.on("closed", () => {
    try { fs.unlinkSync(tmpPath); } catch {}
  });
});

app.whenReady().then(() => {
  createWindow();

  // 마지막 작업 폴더 복원
  const settings = loadAppSettings();
  if (settings.lastFolder && fs.existsSync(settings.lastFolder)) {
    workspaceDir = settings.lastFolder;
    updateTitle();
    mainWindow.webContents.on("did-finish-load", () => {
      const scan = scanFolder(workspaceDir);
      mainWindow.webContents.send("folder-opened", { dirPath: workspaceDir, ...scan });
    });
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
