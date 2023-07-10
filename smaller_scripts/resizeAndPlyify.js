//resize input video to 100x100 px, and make 100 frames long.
//Important function to call is convertVideo(`your .mp4 file here`);
const ffmpeg = require('fluent-ffmpeg');
const ffprobe = ffmpeg.ffprobe;

const path = require('path');
const join = path.join;
const basename = path.basename;

const fs = require('fs');
const writeFileSync = fs.writeFileSync;
const existsSync = fs.existsSync;
const mkdirSync = fs.mkdirSync;
const readdirSync = fs.readdirSync;

const sharp = require('sharp');


// const plyify = require('./justPlyify.js');  // Use require() instead of import

async function processFrame(framePath, points, colors, depth) {
  const { data, info } = await sharp(framePath).raw().toBuffer({ resolveWithObject: true });
  const width = info.width;
  const height = info.height;
  for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
          points.push([height - x -1, height - y - 1, depth]); // flip x and y coordinates, otherwise [x, y, depth]
          colors.push([
              data[(y * width + x) * 3],
              data[(y * width + x) * 3 + 1],
              data[(y * width + x) * 3 + 2]
          ]);
      }
  }
}

function saveAsPlyFile(points, colors, outputPath) {
  let header = 'ply\nformat ascii 1.0\n' +
      `element vertex ${points.length}\n` +
      'property float x\nproperty float y\nproperty float z\n' +
      'property uchar red\nproperty uchar green\nproperty uchar blue\n' +
      'end_header\n';

  let body = points.map((point, i) => {
      return `${point[0]} ${point[1]} ${point[2]} ${colors[i][0]} ${colors[i][1]} ${colors[i][2]}`;
  }).join('\n');

  writeFileSync(outputPath, header + body);
}

function videoToVoxels(videoPath) {
  console.log('begining "just plyify" code...');
  let points = [];
  let colors = [];

  const outputDirectory = './frames';
  if (!existsSync(outputDirectory)) {
      mkdirSync(outputDirectory);
  }

  ffmpeg(videoPath)
      .outputOptions("-q:v 2")
      .save(join(outputDirectory, 'frame%d.png'))
      .on('end', async function() {
          console.log('Frames have been extracted');
          // Wait a second to ensure all frames have been written to disk.
          await new Promise(resolve => setTimeout(resolve, 1000));
          const frames = readdirSync(outputDirectory).filter(file => file.startsWith('frame') && file.endsWith('.png'));
          // Sort frames by frame number
          frames.sort((a, b) => parseInt(a.slice(5, -4)) - parseInt(b.slice(5, -4)));
          for (let i = 0; i < frames.length; i++) {
              await processFrame(join(outputDirectory, frames[i]), points, colors, i);
          }
          saveAsPlyFile(points, colors, videoPath + '.ply');
          console.log('PLY file created');
          let output_filename = videoPath + '.ply';
          return output_filename
      })
      .on('error', function(err) {
          console.log('an error happened: ' + err.message);
      });
  
  console.log('ending "just plyify" code...');
}



async function resizeVideo(inputVideo, outputVideo, targetHeight, targetFrames, cutFirstFrames=0, cutLastFrames=0) {
  const getMetadata = (inputVideo) => new Promise((resolve, reject) => {
    ffprobe(inputVideo, function(err, metadata) {
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

module.exports = async function convertVideo(inputVideo) {
  const targetHeight = 100;
  const targetFrames = 100;
  const cutFirstFrames = 0;
  const cutLastFrames = 0;

  const outputVideo = 'TINY ' + basename(inputVideo);
  await resizeVideo(inputVideo, outputVideo, targetHeight, targetFrames, cutFirstFrames, cutLastFrames);
  console.log("Video made tiny at '" + outputVideo + "'");
  videoToVoxels(outputVideo);
}

// export const convertVideo = convertVideo;

// convertVideo('Convert for 3D slitscan.mp4'); // Example function call

// Now for PLY conversion code....
