import { readdir } from 'fs';
import { extname, join } from 'path';

// List the PLY files in the folder
function listPlyFiles(folderPath) {
    return new Promise((resolve, reject) => {
        readdir(folderPath, (err, files) => {
            if (err) {
                reject(err);
                return;
            }

            // Filter out non-ply files
            const plyFiles = files.filter(file => extname(file) === '.ply');
            resolve(plyFiles);
        });
    });
}

// Create the dropdown menu
async function createPlyFileDropdown() {
    const plyFiles = await listPlyFiles('timecube_models'); // replace with your path
    if (!plyFiles.length) {
        console.log('No PLY files found!');
        return;
    }

    const params = {
        selectedPlyFile: plyFiles[0], // Default to the first file
    };

    // Function to load selected .ply file
    params.loadSelectedFile = function() {
        loadPly(join('timecube_models', params.selectedPlyFile));
    };

    // Add the dropdown menu to the GUI
    timecubeFolder.add(params, 'selectedPlyFile', plyFiles).name('Select PLY File');
    // Add button to load the selected file
    timecubeFolder.add(params, 'loadSelectedFile').name('Load Selected PLY File');
}

// Call the function
createPlyFileDropdown();
