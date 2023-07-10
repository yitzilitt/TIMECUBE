// Get info about user's system with `getSystemInfo();`
const os = require('os');

module.exports = function getSystemInfo() {
    let platform = os.platform();
    let cpuCount = os.cpus().length;

    return "Your system platform is " + platform + " and you have " + cpuCount + " CPU cores.";
};
