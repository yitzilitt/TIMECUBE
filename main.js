const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path');
const {PythonShell} = require('python-shell')


function createWindow () {
  let win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
        preload: path.join(__dirname, 'preload.js'), // provide path to preload.js
        nodeIntegration: true,
        contextIsolation: false, //uncomment this when you aren't testing
        enableRemoteModule: true,
      }
  })

  win.loadFile('dist/index.html')

}


app.whenReady().then(createWindow)


ipcMain.on('open-file-dialog-for-file', (event) => {
    dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [{ name: 'Videos', extensions: ['mp4', 'mov', 'ogv', 'gif'] }]
    }).then(result => {
        if (result.filePaths.length > 0) {
          event.sender.send('selected-file', result.filePaths[0]);
        } else {
          event.sender.send('user-canceled-file-upload');
        }
    }).catch(err => {
        console.log(err);
    });
});

ipcMain.handle('run-python-script', (event, scriptName, args) => {
  return new Promise((resolve, reject) => {
    let options = {
      mode: 'text',
      pythonOptions: ['-u'],
      scriptPath: './smaller_scripts/',
      args: args
    }

    let shell = new PythonShell(scriptName, options); //'takeVideoCrossSection.py' is one script
    let output = [];

    shell.on('message', function(message) {
      console.log(message);  // This will print python print statements in node console
      output.push(message);
    });

    shell.end(function (err) {
      if (err) {
        reject(err.toString());
      } else {
        resolve(output);
      }
    });
  });
});


