const { app, BrowserWindow, ipcMain, dialog, Menu } = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");

let mainWindow;
let currentFilePath = null;

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

  // 개발 모드면 localhost, 아니면 빌드된 파일
  if (process.argv.includes("--dev")) {
    mainWindow.loadURL("http://localhost:5173/blank-test-maker/");
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  updateTitle();
  buildMenu();
}

function updateTitle() {
  const fileName = currentFilePath ? path.basename(currentFilePath) : "새 파일";
  mainWindow.setTitle(`${fileName} - 백지테스트 메이커`);
}

function buildMenu() {
  const template = [
    {
      label: "파일",
      submenu: [
        { label: "새 파일", accelerator: "CmdOrCtrl+N", click: () => mainWindow.webContents.send("menu-new") },
        { label: "열기...", accelerator: "CmdOrCtrl+O", click: () => openFile() },
        { type: "separator" },
        { label: "저장", accelerator: "CmdOrCtrl+S", click: () => saveFile() },
        { label: "다른 이름으로 저장...", accelerator: "CmdOrCtrl+Shift+S", click: () => saveFileAs() },
        { type: "separator" },
        { label: "단원 가져오기...", click: () => importUnits() },
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

const FILE_FILTERS = [
  { name: "백지테스트 파일", extensions: ["btm", "json"] },
  { name: "모든 파일", extensions: ["*"] },
];

const UNIT_FILTERS = [
  { name: "단원 파일", extensions: ["btm", "json"] },
  { name: "모든 파일", extensions: ["*"] },
];

async function openFile(filePath) {
  if (!filePath) {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: "파일 열기",
      filters: FILE_FILTERS,
      properties: ["openFile"],
    });
    if (result.canceled || !result.filePaths.length) return;
    filePath = result.filePaths[0];
  }

  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(content);
    if (!data.units) {
      dialog.showErrorBox("오류", "올바른 백지테스트 파일이 아닙니다.");
      return;
    }
    currentFilePath = filePath;
    updateTitle();
    mainWindow.webContents.send("file-opened", { data, filePath });
  } catch (err) {
    dialog.showErrorBox("오류", "파일을 열 수 없습니다: " + err.message);
  }
}

async function saveFile() {
  if (!currentFilePath) {
    return saveFileAs();
  }
  mainWindow.webContents.send("request-save", { filePath: currentFilePath });
}

async function saveFileAs() {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: "다른 이름으로 저장",
    filters: FILE_FILTERS,
    defaultPath: currentFilePath || "백지테스트.btm",
  });
  if (result.canceled) return;
  currentFilePath = result.filePath;
  updateTitle();
  mainWindow.webContents.send("request-save", { filePath: result.filePath });
}

async function importUnits() {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "단원 가져오기",
    filters: UNIT_FILTERS,
    properties: ["openFile", "multiSelections"],
  });
  if (result.canceled || !result.filePaths.length) return;

  const units = [];
  for (const fp of result.filePaths) {
    try {
      const content = fs.readFileSync(fp, "utf-8");
      const d = JSON.parse(content);
      if (d._type === "bt-units" && d.units) {
        units.push(d);
      } else {
        dialog.showErrorBox("오류", `단원 파일이 아닙니다: ${path.basename(fp)}`);
      }
    } catch {
      dialog.showErrorBox("오류", `파일을 읽을 수 없습니다: ${path.basename(fp)}`);
    }
  }
  if (units.length) {
    mainWindow.webContents.send("units-imported", units);
  }
}

// IPC handlers
ipcMain.handle("save-file", async (event, { filePath, content }) => {
  try {
    fs.writeFileSync(filePath, content, "utf-8");
    currentFilePath = filePath;
    updateTitle();
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("save-file-dialog", async () => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: "다른 이름으로 저장",
    filters: FILE_FILTERS,
    defaultPath: currentFilePath || "백지테스트.btm",
  });
  if (result.canceled) return { canceled: true };
  return { canceled: false, filePath: result.filePath };
});

ipcMain.handle("open-file-dialog", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "파일 열기",
    filters: FILE_FILTERS,
    properties: ["openFile"],
  });
  if (result.canceled || !result.filePaths.length) return { canceled: true };
  const filePath = result.filePaths[0];
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    currentFilePath = filePath;
    updateTitle();
    return { canceled: false, filePath, content };
  } catch (err) {
    return { canceled: true, error: err.message };
  }
});

ipcMain.handle("export-unit", async (event, { content, defaultName }) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: "단원 내보내기",
    filters: UNIT_FILTERS,
    defaultPath: `${defaultName}.btm`,
  });
  if (result.canceled) return { canceled: true };
  try {
    fs.writeFileSync(result.filePath, content, "utf-8");
    return { success: true, filePath: result.filePath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("get-current-file", () => currentFilePath);

ipcMain.handle("print-preview", async () => {
  const pdfData = await mainWindow.webContents.printToPDF({
    pageSize: "A4",
    printBackground: true,
    margins: { top: 0, bottom: 0, left: 0, right: 0 },
  });
  const tmpPath = path.join(os.tmpdir(), `bt-preview-${Date.now()}.pdf`);
  fs.writeFileSync(tmpPath, pdfData);
  const previewWin = new BrowserWindow({
    parent: mainWindow,
    width: 900,
    height: 750,
    title: "인쇄 미리보기",
    webPreferences: {
      contextIsolation: true,
      plugins: true,
    },
  });
  previewWin.setMenuBarVisibility(false);
  previewWin.loadFile(tmpPath);
  previewWin.on("closed", () => {
    try { fs.unlinkSync(tmpPath); } catch {}
  });
});

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// 파일 더블클릭으로 열기 (Windows)
app.on("second-instance", (event, argv) => {
  const filePath = argv.find((a) => a.endsWith(".btm") || a.endsWith(".json"));
  if (filePath && mainWindow) {
    openFile(filePath);
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

// 파일 더블클릭으로 열기 (macOS)
app.on("open-file", (event, filePath) => {
  event.preventDefault();
  if (mainWindow) {
    openFile(filePath);
  }
});
