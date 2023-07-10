const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path');


function createWindow () {
  let win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
        preload: path.join(__dirname, 'preload.js'), // provide path to preload.js
        nodeIntegration: true,
        contextIsolation: false,
        enableRemoteModule: true,
      }
  })

  win.loadFile('dist/index.html')
}

app.whenReady().then(createWindow)


  