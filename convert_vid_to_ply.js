// Navigate to the directory containing this file in a terminal,
// and then execute `node convert_vid_to_ply.js` to run.

// This code takes a .mp4 video as input, and outputs a point cloud .ply file
// based on the video. Specifically, the color value of every pixel
// in the first frame is assigned to a corresponding set
// of (x, y, z) integer coordinates, with the 'z' coordinate set to zero.
// Then, for the next frame, the same thing is done,
// but with the z unit set +1 higher than in the previous frame.
// The output is saved to a .ply file with a basic header. 

const ffmpeg = require('fluent-ffmpeg');
const Jimp = require('jimp');
const fs = require('fs');
const path = require('path');

let inputFilepath = "example.mp4";
let outputFilepath = "timecube of " + inputFilepath + ".ply";

async function ensureDirExists(directoryPath){
  if (!fs.existsSync(directoryPath)){
    fs.mkdirSync(directoryPath);
  }
}

async function getVideoInfo(videoFilePath){
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoFilePath, (err, metadata) => {
      if (err) return reject(err);
      resolve(metadata);
    });
  });
}

async function extractFrames(videoFilePath, frameRate, framesPath, width){
    return new Promise((resolve, reject) => {
      ffmpeg(videoFilePath)
        .outputOptions('-vf', `fps=1/${frameRate},scale=${width}:-1`) // Extract frame every nth second and resize
        .output(path.join(framesPath, 'frame%d.png')) // Output each frame as a PNG file
        .on('end', () => resolve())
        .on('error', (err) => reject(err))
        .run();
    });
}

async function getFrameHeight(framesPath){
    if(fs.existsSync(path.join(framesPath, `frame1.png`))){
      let image = await Jimp.read(path.join(framesPath, `frame1.png`));
      return image.bitmap.height;
    }
  
    return 0;
}
  
  

async function processImage(framesPath, z, stream){
  if(fs.existsSync(path.join(framesPath, `frame${z + 1}.png`))){
    let image = await Jimp.read(path.join(framesPath, `frame${z + 1}.png`));
    image.scan(0, 0, image.bitmap.width, image.bitmap.height, (x, y, idx) => {
      let red = image.bitmap.data[idx + 0];
      let green = image.bitmap.data[idx + 1];
      let blue = image.bitmap.data[idx + 2];
      stream.write(`${x} ${y} ${z} 0 0 0 ${red} ${green} ${blue} 255\n`);
    });

    return image.bitmap.height;
  }

  return 0;
}

async function processVideo(videoFilePath, plyFilePath) {
  let z = 0;
  const framesPath = path.join(__dirname, 'frames');
  await ensureDirExists(framesPath);
  const videoInfo = await getVideoInfo(videoFilePath);
  const videoDuration = videoInfo.streams[0].duration;
  const frameRate = videoDuration / 100;
  const frameWidth = 100;
  await extractFrames(videoFilePath, frameRate, framesPath, frameWidth);
  let height = await getFrameHeight(framesPath);
  let vertices = frameWidth * height * 100;  // frameWidth is 100px, number of frames is 100
  
  
  const header = `ply\nformat ascii 1.0\nelement vertex ${vertices}\nproperty float x\nproperty float y\nproperty float z\nproperty float nx\nproperty float ny\nproperty float nz\nproperty uchar red\nproperty uchar green\nproperty uchar blue\nproperty uchar alpha\nelement face 0\nproperty list uchar int vertex_indices\nend_header\n`;
  async function writeHeader(header){
    fs.writeFileSync(plyFilePath, header);
    return 0;
  }
  await writeHeader(header)

  for(z = 1; z < 100; z++){
    await processImage(framesPath, z, fs.createWriteStream(plyFilePath, {flags: 'a'}));
  }
}

// Usage
processVideo(inputFilepath, outputFilepath).then(() => console.log("finished")).catch(console.error);
