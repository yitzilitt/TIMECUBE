// Turns video file into timecube .ply file, by first saving each frame of the video
// as a seperate image, and then using color data from each image to create the PLY file.
// Note that if the input video is larger than 100x100px and/or longer than 100 frames,
// then you may run into memory limit errors.
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const sharp = require('sharp');
const path = require('path');

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

    fs.writeFileSync(outputPath, header + body);
}

function videoToVoxels(videoPath) {
    let points = [];
    let colors = [];

    const outputDirectory = './frames';
    if (!fs.existsSync(outputDirectory)) {
        fs.mkdirSync(outputDirectory);
    }

    ffmpeg(videoPath)
        .outputOptions("-q:v 2")
        .save(path.join(outputDirectory, 'frame%d.png'))
        .on('end', async function() {
            console.log('Frames have been extracted');
            // Wait a second to ensure all frames have been written to disk.
            await new Promise(resolve => setTimeout(resolve, 1000));
            const frames = fs.readdirSync(outputDirectory).filter(file => file.startsWith('frame') && file.endsWith('.png'));
            // Sort frames by frame number
            frames.sort((a, b) => parseInt(a.slice(5, -4)) - parseInt(b.slice(5, -4)));
            for (let i = 0; i < frames.length; i++) {
                await processFrame(path.join(outputDirectory, frames[i]), points, colors, i);
            }
            saveAsPlyFile(points, colors, videoPath + '.ply');
            console.log('PLY file created');
            let output_filename = videoPath + '.ply';
            return output_filename
        })
        .on('error', function(err) {
            console.log('an error happened: ' + err.message);
        });
}