// preload.js -- This script will always have access to node APIs,
// no matter whether node integration is turned on or off. 
// When node integration is turned off,
// the script can reintroduce Node global symbols back to the global scope
const { contextBridge, ipcRenderer } = require('electron')

window.getSystemInfo = require('./smaller_scripts/getSystemInfo.js');
window.convertVideo = require('./smaller_scripts/resizeAndPlyify.js');
window.uploadNewVideoFile = require('./smaller_scripts/uploadVideoButton.js');


// Treat Python script like a regular ol' function by calling `window.runPythonScript(args)`
window.runPythonScript = (scriptName, args) => {
  return ipcRenderer.invoke('run-python-script', scriptName, args);
}
