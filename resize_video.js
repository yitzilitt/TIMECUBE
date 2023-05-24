const ffmpeg = require('fluent-ffmpeg');
const path = require('path');

let inputFilePath = 'example.mp4';
let outputFilePath = "TINY " + inputFilePath;

ffmpeg.ffprobe(inputFilePath, function(err, metadata) {
    if (err) {
        console.error("Error getting video metadata:", err);
        return;
    }

    let inputFps = metadata.streams[0].avg_frame_rate.split('/');
    inputFps = parseInt(inputFps[0]) / parseInt(inputFps[1]);

    let durationInSeconds = metadata.format.duration;
    let targetFrames = 100;
    let targetFps = targetFrames / durationInSeconds;

    if (targetFps > inputFps) {
        console.log("Warning: Target FPS is higher than input FPS. Quality may be degraded.");
    }

    ffmpeg(inputFilePath)
        .outputOptions([
            `-vf scale=100:-1,setsar=1,fps=${targetFps}`, 
        ])
        .on('error', function(err) {
            console.log('An error occurred: ' + err.message);
        })
        .on('end', function() {
            console.log('Processing finished!');
        })
        .save(outputFilePath);
});
