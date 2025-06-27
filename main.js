const { app, BrowserWindow, ipcMain, screen } = require('electron');

let mainWindow;
let displayWindow;

function createWindow() {
  // 建立主視窗（小視窗）
  mainWindow = new BrowserWindow({
    width: 420,
    height: 420,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    resizable: true,
    title: '價格輸入',
    useContentSize: true,
    show: false
  });

  mainWindow.loadFile('index.html');

  // 在內容載入完成後調整視窗大小以適合內容
  mainWindow.webContents.once('did-finish-load', () => {
    mainWindow.webContents.executeJavaScript(`
      const body = document.body;
      const html = document.documentElement;
      const height = Math.max(
        body.scrollHeight,
        body.offsetHeight,
        html.clientHeight,
        html.scrollHeight,
        html.offsetHeight
      );
      ({ width: body.offsetWidth, height: height + 40 });
    `).then((contentSize) => {
      mainWindow.setContentSize(Math.max(420, contentSize.width), Math.max(420, contentSize.height));
      mainWindow.show();
    });
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    // 關閉主視窗時也安全關閉顯示視窗
    if (displayWindow && !displayWindow.isDestroyed()) {
      displayWindow.removeAllListeners();
      displayWindow.close();
      displayWindow = null;
    }
  });
}

// 建立顯示視窗
function createDisplayWindow(displayIndex, data) {
  const displays = screen.getAllDisplays();
  const targetDisplay = displays[displayIndex] || displays[0];

  // 如果顯示視窗已存在，先安全關閉
  if (displayWindow && !displayWindow.isDestroyed()) {
    displayWindow.removeAllListeners();
    displayWindow.close();
    displayWindow = null;
  }

  displayWindow = new BrowserWindow({
    x: targetDisplay.bounds.x,
    y: targetDisplay.bounds.y,
    width: targetDisplay.bounds.width,
    height: targetDisplay.bounds.height,
    fullscreen: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    frame: false,
    title: '價格顯示',
    show: false
  });

  // 將資料傳遞給顯示視窗
  displayWindow.loadFile('display.html');
  
  displayWindow.webContents.once('did-finish-load', () => {
    if (displayWindow && !displayWindow.isDestroyed()) {
      displayWindow.webContents.send('display-data', data);
      displayWindow.show();
    }
  });

  displayWindow.on('closed', () => {
    displayWindow = null;
  });

  // ESC鍵關閉全螢幕
  displayWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'Escape' && displayWindow && !displayWindow.isDestroyed()) {
      displayWindow.close();
    }
  });
}

// IPC 事件處理
ipcMain.on('show-display', (event, { displayIndex, data }) => {
  createDisplayWindow(displayIndex, data);
});

// 新增即時更新功能
ipcMain.on('update-display', (event, data) => {
  if (displayWindow && !displayWindow.isDestroyed()) {
    displayWindow.webContents.send('display-data', data);
  }
});

ipcMain.on('get-displays', (event) => {
  const displays = screen.getAllDisplays();
  event.reply('displays-info', displays);
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});