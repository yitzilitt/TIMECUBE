const { app, BrowserWindow, ipcMain } = require('electron')

function createWindow () {
  let win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        enableRemoteModule: true,
      }
  })

  win.loadFile('dist/index.html')
}

app.whenReady().then(createWindow)


  