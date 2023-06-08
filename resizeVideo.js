//resize input video to 100x100 px, and make 100 frames long.
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');

async function resizeVideo(inputVideo, outputVideo, targetHeight, targetFrames, cutFirstFrames=0, cutLastFrames=0) {
  const getMetadata = (inputVideo) => new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputVideo, function(err, metadata) {
      if (err) reject(err);
      else resolve(metadata);
    });
  });

  try {
    const metadata = await getMetadata(inputVideo);
    const width = metadata.streams[0].width;
    const height = metadata.streams[0].height;
    const fps = metadata.streams[0].avg_frame_rate.split('/')[0] / metadata.streams[0].avg_frame_rate.split('/')[1];
    const totalFrames = Math.floor(metadata.format.duration * fps);
    const newWidth = Math.floor(targetHeight * (width / height));
    const remainingFrames = totalFrames - cutFirstFrames - cutLastFrames;
    const frameStep = Math.floor(remainingFrames / targetFrames);
    const speedUpFactor = totalFrames / targetFrames;

    return new Promise((resolve, reject) => {
      const command = ffmpeg(inputVideo)
        .seekInput(cutFirstFrames / fps)  // Set the start time of the video
        .withOutputFormat('mp4');
  
      if (frameStep === 0) {
        command.outputOptions(`-vf scale=${newWidth}:${targetHeight}`);  // Only resize video frames
      } else {
        command.outputOptions(`-vf scale=${newWidth}:${targetHeight},setpts=${1/speedUpFactor}*PTS`);  // Resize video frames and speed up the video
      }

      // Check if there's an audio stream in the input video
      if (metadata.streams.some(stream => stream.codec_type === 'audio')) {
        // If so, speed up the audio stream the same way as the video stream
        command.audioFilters(`atempo=${speedUpFactor}`);
      }
  
      command.save(outputVideo)
        .on('end', resolve)
        .on('error', reject);
    });
  } catch (error) {
    console.error("An error occurred:", error);
  }
}

async function convertVideo(inputVideo) {
  const targetHeight = 100;
  const targetFrames = 100;
  const cutFirstFrames = 0;
  const cutLastFrames = 0;

  const outputVideo = 'TINY ' + path.basename(inputVideo);
  await resizeVideo(inputVideo, outputVideo, targetHeight, targetFrames, cutFirstFrames, cutLastFrames);
}

module.exports = convertVideo;

// convertVideo('Convert for 3D slitscan.mp4'); // Example function call

// Now for PLY conversion code....
