// This script randomizes the order of points in a .ply file:
//      It opens the input PLY file and reads all lines into memory.
//      It divides the lines into header and body, based on the 'end_header' line in the PLY file.
//      It then shuffles the body lines, which correspond to the vertices of your model.
//      Finally, it writes the header and shuffled body lines to a new PLY file.

import { readFile, writeFile } from 'fs';

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function shufflePlyFile(inputFilename, outputFilename) {
    readFile(inputFilename, 'utf-8', (err, data) => {
        if (err) {
            console.error(err);
            return;
        }
        
        const lines = data.split('\n');
        const headerIndex = lines.indexOf('end_header');
        const headerLines = lines.slice(0, headerIndex + 1);
        const bodyLines = lines.slice(headerIndex + 1, -1);  // -1 to avoid empty line at end of file

        const shuffledBodyLines = shuffleArray(bodyLines);
        const outputData = [...headerLines, ...shuffledBodyLines].join('\n');

        writeFile(outputFilename, outputData, 'utf-8', (err) => {
            if (err) {
                console.error(err);
            } else {
                console.log(`Shuffled PLY file written to ${outputFilename}`);
            }
        });
    });
}

// shufflePlyFile('input.ply', 'output.ply'); //example function call
