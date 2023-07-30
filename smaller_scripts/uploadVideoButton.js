// Upload a video file and let system interact with it directly
const { ipcRenderer } = require('electron');

module.exports = function uploadVideoButton(uploadButtonId, callback, videoFilePath=null) {

    document.getElementById(uploadButtonId).onclick = function() {
        ipcRenderer.send('open-file-dialog-for-file');
    };
    
    ipcRenderer.on('selected-file', (event, path) => {
        if (path.length > 0) { // if user selected a video file, continue, otherwise send error
            console.log(`Selected file: ${path}` + ' also path: ' + path);
            window.convertVideo(path).then(output_filename => {
                console.log('the path to your PLY file is: ' + output_filename);
                callback(output_filename); // Call the callback function with output_filename
            }).catch(error => {
                // Handle any errors that occur during conversion
                console.error('Error during video conversion', error);
                callback(''); //return empty string to callback
                // Here you can close the popup or inform the user about the error
            });
        }
    });

    ipcRenderer.on('user-canceled-file-upload', (event) => {
        console.log('No filepath selected');
        callback('');
    });

};
    // return convertedVideo;
    
    
    // document.getElementById('convertButton').onclick = function() {
    //   if (!videoFilePath) {
    //     console.log('No file chosen');
    //     return;
    //   }
    //   window.convertVideo(videoFilePath);
    // };