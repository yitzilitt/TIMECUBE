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
const { log, warn } = require('console');

//location of directory where frame stills will be held for processing
const outputDirectory = './frames';


// const plyify = require('./justPlyify.js');  // Use require() instead of import

function copyVideo(inputVideo, outputVideo) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputVideo)
      .outputOptions('-c', 'copy') // This option ensures that the video and audio streams are copied as-is without re-encoding
      .save(outputVideo)
      .on('end', resolve)
      .on('error', (err, stdout, stderr) => {
          console.error('Error:', err);
          console.error('ffmpeg stdout:', stdout);
          console.error('ffmpeg stderr:', stderr);
          reject(err);
      });
  });
}


async function processFrame(framePath, points, colors, depth) {
  const { data, info } = await sharp(framePath).raw().toBuffer({ resolveWithObject: true });
  const width = info.width;
  const height = info.height;
  for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
          // points.push([height - x -1, height - y - 1, depth]); // flip x and y coordinates, otherwise [x, y, depth]
          points.push([x, y - 1, depth]);
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
  console.log('PLY file created :)');

  // Delete the output `frames` directory if it exists
  if (fs.existsSync(outputDirectory)) {
      fs.rmdirSync(outputDirectory, { recursive: true });
      console.log(`${outputDirectory} is deleted!`);
  } else {
    console.log('`frames` directory does not exist(?!)');
  }

  // // Finally, let user know the process has finished
  // alert('.ply file succesfully created! Check your directory to see it :)');
  //return outputPath;

}

function videoToVoxels(videoPath) {
  return new Promise((resolve, reject) => {  // <- Add this line
      console.log('begining post-resizing code...');
      let points = [];
      let colors = [];

      // Check if output `frames` directory for images exists, if not, create it
      if (!existsSync(outputDirectory)) {
          mkdirSync(outputDirectory);
      } else { //if folder already exists, delete existing images, and recreate folder
          fs.rmdirSync(outputDirectory, { recursive: true });
          console.log(`images in ${outputDirectory} have been deleted.`);
          mkdirSync(outputDirectory);
          console.log(`${outputDirectory} folder succesfully recreated.`);
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
              // return filepath of output PLY file
              let output_filename = videoPath + '.ply';
              resolve(output_filename);
          })
          .on('error', function(err) {
              console.log('an error happened: ' + err.message);
              reject(err);
          });
  });
}




async function resizeVideo(inputVideo, outputVideo, targetHeight, targetFrames, cutFirstFrames=0, cutLastFrames=0) {
  console.log('Starting to scale down video...');
  const getMetadata = (inputVideo) => new Promise((resolve, reject) => {
    ffprobe(inputVideo, function(err, metadata) {
      if (err) reject(err);
      else resolve(metadata);
    });
  });

  try {
    // Retrieve metadata
    const metadata = await getMetadata(inputVideo);
    // console.log('Original Metadata:', metadata); // Log the entire metadata object
    // Get data from video stream (instead of, say, audio stream)
    let videoStream = metadata.streams.find(stream => stream.codec_type === 'video');
    if (!videoStream) {
        throw new Error('No video stream found in input file');
    }
    // Define variables for metadata we care about
    let width = videoStream.width;
    let height = videoStream.height;
    let fps = videoStream.avg_frame_rate.split('/')[0] / videoStream.avg_frame_rate.split('/')[1];
    if (Number.isNaN(fps)) { // just in case fps metadata isn't provided
      fps = 24;
      console.log('FPS metadata not provided; defaulting to assumption of 24 frames per second');
    } else {console.log('Original FPS:', fps);}
    const totalFrames = Math.floor(metadata.format.duration * fps);
    const newWidth = Math.floor(targetHeight * (width / height) / 2) * 2; //round to nearest even number
    const remainingFrames = totalFrames - cutFirstFrames - cutLastFrames;
    const frameStep = Math.floor(remainingFrames / targetFrames);
    const speedUpFactor = totalFrames / targetFrames;
    // Give user info about above variables, for troubleshooting
    console.log('width: ' + width + ', height: ' + height + ', fps: ' + fps,
      ', totalFrames: ' + totalFrames + ', frameStep: ' + frameStep + ', speedUpFactor: ' + speedUpFactor);

    return new Promise((resolve, reject) => {
      const command = ffmpeg(inputVideo)
        .seekInput(cutFirstFrames / fps)  // Set the start time of the video
        .withOutputFormat('mp4');

      // console.log('Seek duration:', cutFirstFrames / fps); // Log the value passed to seekInput
  
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
        .on('error', (err, stdout, stderr) => {
            console.error('Error:', err);
            console.error('ffmpeg stdout:', stdout);
            console.error('ffmpeg stderr:', stderr);
            reject(err);
        });

      console.log('Finished scaling down video');
    });
  } catch (error) {
    alert("An error occurred:", error);
    return ''
  }
}

module.exports = async function convertVideo(inputVideo) {
  const targetHeight = 100;
  const targetFrames = 100;
  const cutFirstFrames = 0;
  const cutLastFrames = 0;

  const outputVideo = './dist/timecube_models/TINY ' + basename(inputVideo);
  const originalOutputVideo = './dist/timecube_models/' + basename(inputVideo);

  // Copy original video before resizing
  await copyVideo(inputVideo, originalOutputVideo);
  console.log("Original video copied at '" + originalOutputVideo + "'");

  await resizeVideo(inputVideo, outputVideo, targetHeight, targetFrames, cutFirstFrames, cutLastFrames);
  console.log("Video made tiny at '" + outputVideo + "'");
  let finalPlyPath = await videoToVoxels(outputVideo);
  // console.log('the path to your PLY file is: ' + finalPlyPath);
  return finalPlyPath;
}

// export const convertVideo = convertVideo;

// convertVideo('Convert for 3D slitscan.mp4'); // Example function call

// Now for PLY conversion code....
