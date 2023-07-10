// preload.js -- This script will always have access to node APIs,
// no matter whether node integration is turned on or off. 
// When node integration is turned off,
// the script can reintroduce Node global symbols back to the global scope
window.getSystemInfo = require('./smaller_scripts/getSystemInfo.js');
window.convertVideo = require('./smaller_scripts/resizeAndPlyify.js');