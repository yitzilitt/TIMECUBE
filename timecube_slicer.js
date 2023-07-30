//to run in local server: go to Command Prompt, 
//navigate to folder with this script, and type: `npx parcel index.html --public-url ./`
//Then, you can go to http://localhost:1234/ in your web browser to see it.
//You can also use `npm start` for an Electron app

import * as THREE from 'three';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
//import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
//import { MeshWboitMaterial, WboitPass } from 'three-wboit';
import * as dat from 'dat.gui';
import Stats from 'stats.js'; //check framerate
import Swal from 'sweetalert2';
//import custom code
import { createGrid, findNearestNeighbor } from './smaller_scripts/nearestNeighbor.js';
import * as tControls from './smaller_scripts/transformControls.js';
import { shuffleGeometry } from './smaller_scripts/geometryShuffler.js';
import * as depthSorter from './smaller_scripts/depthSorterSlow.js';
import * as planeDataExporter from './smaller_scripts/getPixelPointsFromPlane.js';
import { Renderer } from 'marked';
// import { listPlyFiles, createPlyFileDropdown } from './smaller_scripts/dropdownFromFolderItems.js'; 


//Declaring (most) global variables here
let defaultPlyFile = 'timecube_models/TINY man walking to bench.mp4.ply'; //replace with name of default .ply file to load
let url;
let file = defaultPlyFile;
let nameOfFile =  file.replace('timecube_models/TINY ', '').replace('.mp4.ply', '');;
// List of predefined .ply files
var predefinedFiles = {
    'Walking To Bench': 'timecube_models/TINY man walking to bench.mp4.ply', //doesn't yet have video
    'Dancer At Night': 'timecube_models/Day-of-The-Dead Dance.mp4.ply', //has video
    'Blinking Clown': 'timecube_models/TINY Clown blinking.mp4.ply', //has video
    'Twirling Women': 'timecube_models/dancing_girls.mp4.ply', //has video
    'Ring Around The Rosie': 'timecube_models/TINY INPUT ring around the rosie.mp4.ply', // has video
    // ...add more here
};
// More variable declarations
let plane;
let planeIsMoving = true; //flag to indicate whether the plane has moved, begins as on
let isDragging = false; //Is anything currently being dragged?
let globalPlaneVisualizer;
let points;
let bbox;
let displayWidth = 100;
let displayWidthOriginal = displayWidth; //in order to reset display to original once we change it
let displayHeight = 100;
let displayHeightOriginal = displayHeight; //in order to reset display to original once we change it
let lowResWidth = displayWidth / 2;
let lowResHeight = displayHeight / 2;
let planeWidth = displayWidth;
let planeHeight = displayHeight;
let grid = {}; // Declare the grid variable outside the loader function
const cellSize = 2; // Set cellSize as a global variable
let bThreshold = { value: 0.5 }; // The brightness value should be between 0 (black) and 1 (white).
let cutoffController = null; // To enable or disable shader GUI options
let invertController = null;
let opacityController = null;
let RandomDepthSortController = null;
let canvas;
let ctx;
let material;
let basicMaterial; // different material types
let thresholdMaterial;
let translucentMaterial;
let randomSortMaterial;
let planeTexture;
let planeMaterial;
let animationPlaneStart;
let animationPlaneEnd;
let gammaPowerAmount;
let updateAfterMoving = false; //new flag
let forceRefreshDisplay = true;
let areArraysReady = false;
let debug = false; //set to true if you want to see fps counter, other dev help stuff.
let HideAllGUIs = false;
let dontShowLoading = false;

// Set up material variables here, so we can have fun messing with 'em :)
let uniforms = { // These are defaults for brightness threshold options
    color: { value: new THREE.Color(0xffffff) }, // threshold color to check against
    backColor: {value: new THREE.Color(0xffffff) }, // background color of scene
    brightnessThreshold: { value: 0.5 }, // set `value: 0.5` for 50% threshhold
    size: { value: 0.2 }, // this defines the size of the points in the point cloud
    invertAlpha: { value: false }, // defines if translucency alpha channel is inverted or not
    gammaCorrection: {value: 2.2 }, // defines gamma correction amount. Set to 1.0 to turn off
    transparencyIntensity: { value: 1.0 } //  0 would make the object completely opaque; 1 (or greater) would make the object completely transparent
};

let optionOptions = {
    openDialog: function() {
        showDialog();
    },

    resetPlane: function() {
        resetPlaneLocation();
    },
}

// Event listener for key presses
document.addEventListener('keydown', function(event) {
    // Cheat sheet for key presses:<br />"H" hide GUI
    // "W" translate | "E" rotate | "R" scale | "+/-" adjust size<br />
    // "Q" toggle world/local space |  "Shift" snap to grid<br />
    // "X" toggle X | "Y" toggle Y | "Z" toggle Z | "Spacebar" toggle enabled<br />
    // "Esc" reset current transform<br />
    // "C" toggle camera | "V" random zoom


    // Check if the pressed key is 'h'
    if (event.key === 'h') {
      // Toggle the value of `HideAllGUIs`
      HideAllGUIs = !HideAllGUIs;
      toggleCanvasVisibility(!HideAllGUIs);
      testCube.layers.toggle( 0 ); // hide/show red cube at center
      planeWireframe.layers.toggle( 0 ); //hide/show plane wireframe
      // Log the current state
      console.log('GUIs hidden: ', HideAllGUIs);
    }

    //toggle debug mode if 'd' is pressed
    if (event.key === 'd') {
        debug = !debug;
        onDebugToggle(debug);
        console.log('Debug mode: ', debug);
    }

    // Update point sorting to face camera if 'u' is pressed
    if (event.key === 'u') {
        console.time('depthSortGeometry');
        sortDistanceFromCamera();
        console.timeEnd('depthSortGeometry');
        console.log('transparency rendering order sorted from camera');
    }
    if (event.key === 'i') {
        if (points) { //(points && camera.position.z < 0)
            // Sort the geometry based on depth
            console.time('2ndDepthSortGeometry');
            const sortedGeometry = depthSorter.lossyDepthSortGeometry(points.geometry, camera);
            console.timeEnd('2ndDepthSortGeometry');
            // Update the points object with the sorted geometry
            points.geometry = sortedGeometry;
            grid = createGrid(points, cellSize);
        }
        console.log('(second version) transparency rendering order sorted from camera');
    }
    if (event.key === 'c') {
        if (points) {
            // Color the geometry based on depth
            console.time('colorGeometry');
            const coloredGeometry = depthSorter.colorByOrder(points.geometry, camera);
            console.timeEnd('colorGeometry');
            // Update the points object with the sorted geometry
            points.geometry = coloredGeometry;
            grid = createGrid(points, cellSize);
        }
        console.log('(second version) transparency rendering order sorted from camera');
    }
    //if 'j' is pressed, copy coordinates of plane edges to clipboard
    if (event.key === 'j') {
        // // Add visualizer for bounding box of TIMECUBE
        // const boundingBoxVisualizer = new THREE.BoxHelper( points, 0xffff00 );
        // scene.add( boundingBoxVisualizer );

        // Get cooordinates of plane corners, and save past time this was called to memory
        let corners = planeDataExporter.getPlaneCorners(plane, bbox);
        if (animationPlaneEnd) {
            animationPlaneStart = animationPlaneEnd;
        }
        animationPlaneEnd = corners;

        Swal.fire({
            position: 'top-end',
            icon: 'success',
            title: 'Plane position saved as keyframe!',
            showConfirmButton: false,
            timer: 1500
          })

        // // Copy the text inside the text field
        // navigator.clipboard.writeText(JSON.stringify(corners)).then(function(x) {
        //     alert("Coordinates of plane edges copied to clipboard");
        // });
        // Alert the info was copied
        console.log('Plane corners location data: ' + JSON.stringify(corners));
    }

  });


// Function to let user download a file under a given name
function makeDownloadableFile(pathToFile, nameToCallFile) {
    fetch(pathToFile)
        .then(response => response.blob())
        .then(blob => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = nameToCallFile; // provide the file name you want
            a.click(); // this will trigger the dialog window to save the file.
        });
}


//function to allow for a more intuitive setTimeout
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
// // Example usage:
//   console.log("Hello");
//   sleep(2000).then(() => { console.log("World!"); });
  



// Scene, Camera, Renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
console.log(renderer.capabilities.precision); // Get how high precision the scene is
//const renderer = new THREE.WebGLRenderer( { antialias : false } ); // For fps improvements if required
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
// Set camera position
camera.position.z = 5;


// Make window resizable!
window.addEventListener( 'resize', onWindowResize );
function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );

}


//transparency settings
renderer.setTransparentSort

// Orbit Controls for the scene as a whole
const orbitControls = new OrbitControls(camera, renderer.domElement);

function sortDistanceFromCamera(cameraObject) {
    if (points) { //(points && camera.position.z < 0)
        // Sort the geometry based on depth
        const sortedGeometry = depthSorter.depthSortGeometry(points.geometry, camera);
        // Update the points object with the sorted geometry
        points.geometry = sortedGeometry;
        grid = createGrid(points, cellSize);
    }
  }
// orbitControls.addEventListener('change', onCameraChange);

//create GUI
const gui = new dat.GUI();

// Create a style link element for GUI
const style = document.createElement('link');
// Set the link attributes
style.rel = 'stylesheet';
style.type = 'text/css';
style.href = 'css/timecube_slicer.css';  // path to CSS stylesheet
// Append the stylesheet to the head of the document
document.head.appendChild(style);

//add GUI folders
const timecubeFolder = gui.addFolder('General Settings');
const planeFolder = gui.addFolder('Plane Controls');
const shaderFolder = gui.addFolder('Shader Controls');
// Make sure all main folders are open, subfolders closed
timecubeFolder.open();
planeFolder.open();
shaderFolder.open();


//instantiating fps counter if debugging mode is on
const fpsCounter = new Stats()
function onDebugToggle(debug) {
    if (debug) {
        fpsCounter.showPanel(0) // 0: fps, 1: ms, 2: mb, 3+: custom
        document.body.appendChild(fpsCounter.dom);
        //show clipping plane visualizer
        globalPlaneVisualizer = new THREE.PlaneHelper(globalPlane, 100, 0xffff00);
        scene.add(globalPlaneVisualizer); 
    } else {
            // remove fps counter if it exists
            if (document.body.contains(fpsCounter.dom)) {
                document.body.removeChild(fpsCounter.dom);
            }
            //hide clipping plane visualizer
            if (globalPlaneVisualizer) {
                scene.remove(globalPlaneVisualizer);
                globalPlaneVisualizer = false;
            }
    } 
}
onDebugToggle(debug);


// Check if app is running in electron or not
let isElectron = false;
function electronChecker() {
    try {
        isElectron = !!window.navigator.userAgent.toLowerCase().includes('electron');
    } catch(e) {
        console.log('`isElectron` checker failed; error: ', e);
    }
    // Output result to console
    if (isElectron) {
        console.log("Running inside Electron!");
    } else {
        console.log("Not running inside Electron!");
    }
}
electronChecker();


//function for lowering resolution while plane is being moved
function doWhileMoving() {
    planeIsMoving = true;
    displayWidth = lowResWidth;
    displayHeight = lowResHeight;
    updateAfterMoving = true;
    displayColors = new Array(lowResHeight).fill(0).map(() => new Array(lowResWidth).fill([0, 0, 0, 0]));
    updatePlane();
    //makeNewOutline(planeGeometry);
}


// Add option to return to homepage
function showDialog() {
    Swal.fire({
        title: 'Return to homepage?',
        showDenyButton: true,
        confirmButtonText: 'Yes',
        denyButtonText: `No`,
        color: '#716add',
        // background: '#fff url(images/treealgorithmic.png)',
      }).then((result) => {
        if (result.isConfirmed) {
          window.location.href = 'index.html';
        }
      })
}
timecubeFolder.add(optionOptions, 'openDialog').name('Go Back');


// Add dropdown menu for pre-made timecube files
// Object with a property for the current selection
var selectedFile = {
    file: 'Walking To Bench' // Default value
};

// Function to load a .ply file based on the current selection
function loadPredefinedFile() {
    defaultPlyFile = predefinedFiles[selectedFile.file];
    file = defaultPlyFile;
    nameOfFile = file.replace('timecube_models/TINY ', '').replace('.mp4.ply', '');
    selectedFile.file = Object.keys(predefinedFiles).find(key => predefinedFiles[key] === defaultPlyFile);
    resetUserOptions(); //reset all user-defined settings
    loadPly(defaultPlyFile);
}
// Add menu of loadable files to the GUI
timecubeFolder.add(selectedFile, 'file', Object.keys(predefinedFiles)).name('Load TIMECUBE').onChange(loadPredefinedFile);

// // Let user upload their own .ply timecube files
// function userPlyUploadOption() {
//     // Set up file input event listener
//     document.getElementById('plyFile').addEventListener('change', function(event) {
//         const uploadedFile = event.target.files[0];
//         file = uploadedFile;
//         if (!uploadedFile) {
//             console.log('No file selected!');
//             return;
//         }

//         // This line creates a URL representing the File object
//         url = URL.createObjectURL(file);
//         defaultPlyFile = url;
//         resetUserOptions(); //reset all user-defined settings

//         // Ask the user for a name for the uploaded file
//         Swal.fire({
//             title: 'Enter a name for the uploaded file:',
//             input: 'text',
//             inputAttributes: {
//                 autocapitalize: 'off'
//             },
//             showCancelButton: true,
//             confirmButtonText: 'Save',
//             showLoaderOnConfirm: true,
//         }).then((result) => {
//             if (result.isConfirmed) {
//                 // Add the file to the predefinedFiles object
//                 predefinedFiles[result.value] = url;
//                 selectedFile.file = result.value;

//                 // Update the GUI
//                 timecubeFolder.__controllers.forEach(function(controller) {
//                     if (controller.property === 'file') {
//                         controller.remove();
//                     }
//                 });
//                 timecubeFolder.add(selectedFile, 'file', Object.keys(predefinedFiles)).name('Load TIMECUBE').onChange(loadPredefinedFile);
//                 // timecubeFolder.add(predefinedFiles[result.value], 'file', Object.keys(predefinedFiles)).name('Load TIMECUBE').onChange(loadPredefinedFile);
//             }
//         })

//         // Now load the PLY from the generated URL
//         loadPly(defaultPlyFile);
//     });

//     // Let user upload .ply file of their choice
//     var params = {
//         loadFile : function() { 
//                 document.getElementById('plyFile').click();
//         }
//     };
//     // Add .ply loader to GUI
//     timecubeFolder.add(params, 'loadFile').name('Import TIMECUBE file');
// }

// // Call the function
// userPlyUploadOption();


// Let user upload video files, if environment is able to support it
function userVideoUploadOption() {

    var videoUploadParams = {
        loadFile : function() { 
                document.getElementById('vidFile').click();
                // Start the Swal loading popup
                setTimeout(function() {
                    Swal.fire({
                        title: 'Loading...\n(This may take a minute)',
                        allowEscapeKey: false,
                        allowOutsideClick: false,
                        didOpen: () => {
                            Swal.showLoading();
                        }
                    });
                }, 500); // delay in milliseconds
                return;
        },
        notAvailableAlert : function() {
            Swal.fire({
                title: 'Sorry, importing videos is not yet available on your computer.\nStay tuned for future compatibility updates!',
                showDenyButton: false,
                confirmButtonText: 'Okay',
                color: '#716add',
                // background: '#fff url(images/treealgorithmic.png)',
              })
        }
    };

    if (isElectron) { // If app is running in electron, let user upload video files
        document.getElementById('vidFile').disabled = false;

        // Run function which gets user's file, and load it in our scene
        window.uploadNewVideoFile('vidFile', output_filename => {
            if (output_filename.length > 0) {
                console.log('output_filename: ' + output_filename);
                // load PLY file created by our function, then close "loading" popup
                dontShowLoading = true; // So we don't get two loading screens
                file = output_filename.replace('./dist/', ''); // This is the path of the PLY file
                nameOfFile = file.replace('timecube_models/TINY ', '').replace('.mp4.ply', '');
                console.log('nameOfFile is: ' + nameOfFile + ', and file is: ' + file);
        
                // This line creates a URL representing the File object
                url = file; //URL.createObjectURL(file);
                defaultPlyFile = url;
                resetUserOptions(); //reset all user-defined settings
        
                        // Add the file to the predefinedFiles object
                        predefinedFiles[nameOfFile] = url;
                        selectedFile.file = nameOfFile;
        
                        // Update the GUI
                        timecubeFolder.__controllers.forEach(function(controller) {
                            if (controller.property === 'file') {
                                controller.remove();
                            }
                        });
                        timecubeFolder.add(selectedFile, 'file', Object.keys(predefinedFiles)).name('Load TIMECUBE').onChange(loadPredefinedFile);


                loadPly(file).then((message) => {
                    console.log(message); // logs 'PLY file loaded' when the promise is resolved
                    Swal.close();  // Close the Swal loading popup
                    Swal.fire('Completed!', 'Your video file has been converted to TIMECUBE format', 'success');
                    dontShowLoading = false;
                }).catch((error) => {
                    console.error('Failed to load PLY file', error);
                    Swal.close();  // Close the Swal loading popup
                    Swal.fire('Error', `An error occurred: ${error}`, 'error');
                });
            } else { // if output filepath string is blank, then we cancel, as some error happened
                Swal.close();  // Close the Swal loading popup
                Swal.fire('', `No valid filepath provided`);
            }
        });

        // Add GUI button to run function
        timecubeFolder.add(videoUploadParams, 'loadFile').name('Import Video');

    } else { // If not running in electron, let user know option is disabled
        timecubeFolder.add(videoUploadParams, 'notAvailableAlert').name('Import Video [Not Available]');
    }
}
// Call the function
userVideoUploadOption();


// Let user export image of cross-section, if environment is able to support it
function userExportImage() {
    var exportImageParams = {
        startExport : function() { 
                document.getElementById('imgExport').click();
                return;
        },
        notAvailableAlert : function() {
            Swal.fire({
                title: 'Sorry, exporting high-resolution images is not yet available on your computer.\nStay tuned for future compatibility updates!',
                showDenyButton: false,
                confirmButtonText: 'Okay',
                color: '#716add',
                // background: '#fff url(images/treealgorithmic.png)',
              })
        }
    };

    if (isElectron) { // If app is running in electron, let user upload video files
        document.getElementById('imgExport').addEventListener('click', async () => {

            // Start the Swal loading popup
            Swal.fire({
                title: 'Loading...\n(This may take a few seconds)',
                allowEscapeKey: false,
                allowOutsideClick: false,
                didOpen: () => {
                Swal.showLoading();
                }
            });

            try {
                // Get cooordinates of plane corners
                let corners = planeDataExporter.getPlaneCorners(plane, bbox);
                    let pathOfOutputFile = '../' + 'cross_section_of_TIMECUBE.png';
                    let nameOfImageForUsers = 'TIMESLICED ' + nameOfFile + '.png';

                // // Copy the text inside the text field
                // navigator.clipboard.writeText(JSON.stringify(corners))

                // let pointsArray = [[51.787123933939604, -1.2069462425104982, -7.17036082012239],[104.91694554306812, 21.7691466321827, 74.38618749385326],[54.622052382430184, 67.39184842565481, 9.830320134079496]];
                let resolutionPercentage = [100, 100];  // percent (out of 100) resolution of image
                // let video = './' + file.replace('.ply', '');
                // let video = '../dist/timecube_models/' + nameOfFile + '.mp4';
                let video = '../dist/' + file.replace('TINY ', '').replace('.ply', '');
                console.log('video: ' + video + ' resolutionPercentage: ' + JSON.stringify(resolutionPercentage));
                console.log('corner coordinates: ' + JSON.stringify(corners));
                const scriptName = 'takeVideoCrossSection.py';
                const args = ['ImageExport', video, JSON.stringify(corners), JSON.stringify(resolutionPercentage)];
                window.runPythonScript(scriptName, args)
                    .then(result => {
                        console.log(result);
                        sleep(500) // wait so image can update
                        .then(() => Swal.close())  // Close the Swal loading popupSwal.close();  // Close the Swal loading popup
                        .then(() => Swal.fire({
                            // icon: 'success',
                            // title: 'TIMECUBE sliced!',
                            imageUrl: `${pathOfOutputFile}?${new Date().getTime()}`, //adds timestamp to avoid the image getting cached
                            imageAlt: 'cross section of TIMECUBE',
                            text: 'Save image?',
                            showCancelButton: true,
                            confirmButtonText: 'Save',
                            color: '#716add',
                            // background: '#fff url(images/treealgorithmic.png)',
                            }).then((result) => {
                            if (result.isConfirmed) {
                                makeDownloadableFile(pathOfOutputFile, nameOfImageForUsers);
                            }
                            }))
                    })
                    .catch(error => {
                        Swal.close();  // Close the Swal loading popup
                        Swal.fire('Error', `An error occurred: ${error}`, 'error');
                    });
            } catch (error) {
                console.error(`An error occurred: ${error}`);
                Swal.close();  // Close the Swal loading popup
                Swal.fire('Error', `An error occurred: ${error}`, 'error');
            }
        });

        // Add GUI button to run function
        timecubeFolder.add(exportImageParams, 'startExport').name('Export Image');

    } else { // If not running in electron, let user know option is disabled
        timecubeFolder.add(exportImageParams, 'notAvailableAlert').name('Export Image [Not Available]');
    }
}
// Call the function
userExportImage();



// Let user export video of cross-section, if environment is able to support it
function userExportVideo() {
    var exportVideoParams = {
        startExport : function() { 
                document.getElementById('vidExport').click();
                return;
        },
        notAvailableAlert : function() {
            Swal.fire({
                title: 'Sorry, exporting high-resolution video is not yet available on your computer.\nStay tuned for future compatibility updates!',
                showDenyButton: false,
                confirmButtonText: 'Okay',
                color: '#716add',
                // background: '#fff url(images/treealgorithmic.png)',
              })
        }
    };

    if (isElectron) { // If app is running in electron, let user upload video files
        document.getElementById('vidExport').addEventListener('click', async () => {

            // Start the Swal loading popup
            Swal.fire({
                title: 'Loading...\n(This may take a few minutes if your video resolution is high)',
                allowEscapeKey: false,
                allowOutsideClick: false,
                didOpen: () => {
                Swal.showLoading();
                }
            });

            try {
                // Get cooordinates of plane corners
                let corners = planeDataExporter.getPlaneCorners(plane, bbox);
                    let pathOfOutputFile = '../' + 'cross_section_of_TIMECUBE.png';
                    let nameOfImageForUsers = 'TIMESLICED ' + nameOfFile + '.png';

                // // Copy the text inside the text field
                // navigator.clipboard.writeText(JSON.stringify(corners))

                // let pointsArray = [[51.787123933939604, -1.2069462425104982, -7.17036082012239],[104.91694554306812, 21.7691466321827, 74.38618749385326],[54.622052382430184, 67.39184842565481, 9.830320134079496]];
                let resolutionPercentage = [100, 100];  // percent (out of 100) resolution of image
                // let video = './' + file.replace('.ply', '');
                // let video = '../dist/timecube_models/' + nameOfFile + '.mp4';
                let video = '../dist/' + file.replace('TINY ', '').replace('.ply', '');
                console.log('video: ' + video + ' resolutionPercentage: ' + JSON.stringify(resolutionPercentage));
                // console.log('corner coordinates: ' + JSON.stringify(corners));
                const scriptName = 'takeVideoCrossSection.py';
                const args = ['VideoExport', video, JSON.stringify(animationPlaneStart), JSON.stringify(resolutionPercentage), JSON.stringify(animationPlaneEnd)];
                window.runPythonScript(scriptName, args)
                    .then(result => {
                        console.log(result);
                        sleep(500) // wait so image can update
                        .then(() => Swal.close())  // Close the Swal loading popupSwal.close();  // Close the Swal loading popup
                        .then(() => Swal.fire({
                            // icon: 'success',
                            // title: 'TIMECUBE sliced!',
                            imageUrl: `${pathOfOutputFile}?${new Date().getTime()}`, //adds timestamp to avoid the image getting cached
                            imageAlt: 'cross section of TIMECUBE',
                            text: 'Save image?',
                            showCancelButton: true,
                            confirmButtonText: 'Save',
                            color: '#716add',
                            // background: '#fff url(images/treealgorithmic.png)',
                            }).then((result) => {
                            if (result.isConfirmed) {
                                makeDownloadableFile(pathOfOutputFile, nameOfImageForUsers);
                            }
                            }))
                    })
                    .catch(error => {
                        Swal.close();  // Close the Swal loading popup
                        Swal.fire('Error', `An error occurred: ${error}`, 'error');
                    });
            } catch (error) {
                console.error(`An error occurred: ${error}`);
                Swal.close();  // Close the Swal loading popup
                Swal.fire('Error', `An error occurred: ${error}`, 'error');
            }
        });

        // Add GUI button to run function
        timecubeFolder.add(exportVideoParams, 'startExport').name('Export Video');

    } else { // If not running in electron, let user know option is disabled
        timecubeFolder.add(exportVideoParams, 'notAvailableAlert').name('Export Video [Not Available]');
    }
}
// Call the function
userExportVideo();




// // Let user upload their own video files to be converted to timecube
// function userVidUploadOption() {
//     // Set up file input event listener
//     document.getElementById('vidFile').addEventListener('change', function(event) {
//         const file = event.target.files[0];
//         if (!file) {
//             console.log('No file selected!');
//             return;
//         }

//         // This line creates a URL representing the File object
//         const url = URL.createObjectURL(file);
        
//         // Now turn the video into a .ply file, and load it
//         // Send the video to the serverless function
//         sendFile(file);
//         //loadPly(url);
//     });

//     // Let user upload .mp4 file of their choice
//     var params = {
//         loadFile : function() { 
//                 document.getElementById('vidFile').click();
//         }
//     };
//     // Add .ply loader to GUI
//     timecubeFolder.add(params, 'loadFile').name('Upload Video');
// }
// // Call the function
// userVidUploadOption();


// //function for sending the file over to our Python script in Vercel
// function sendFile(file) {
//     fetch('/api/convert', {
//         method: 'POST',
//         body: file
//     })
//     .then(response => response.blob())
//     .then(blob => {
//         // Create a URL for the blob
//         const url = window.URL.createObjectURL(blob);

//         // Call the loadPly function with the URL
//         loadPly(url);
//         if (points) {
//             window.URL.revokeObjectURL(url);
//         }
//     });
// }



// Set background color
let backColor = {
    backgroundColor: 'rgb(40, 40, 40)', //dark grey
    planeBackgroundColor: 'rgba(0, 0, 0, 0)',
}
timecubeFolder.addColor( backColor, 'backgroundColor' ).name('Background').onChange(function(value) {
    scene.background = new THREE.Color( backColor.backgroundColor )});;
scene.background = new THREE.Color( backColor.backgroundColor );

// Set plane background color if moved outside TIMECUBE
planeFolder.addColor(backColor, 'planeBackgroundColor').name('Plane Background');

// Log camera position and sort points by distance from camera (if required)
var lastMove = 0;
orbitControls.addEventListener( "change", event => {  
    // do nothing if last move was less than 1 second ago
    if(Date.now() - lastMove > 1000) {
        if (debug) {
            console.log('camera position: ', orbitControls.object.position ); 
        }
        //onCameraChange();
        lastMove = Date.now();
    }
} )


//add red cube in center for debugging + troubleshooting
    var testCubeGeometry = new THREE.BoxGeometry(1, 1, 1);
    var testCubeMaterial = new THREE.MeshBasicMaterial({color: 0xff0000});
    var testCube = new THREE.Mesh(testCubeGeometry, testCubeMaterial);
    testCube.position.set(0, 0, 0);
    scene.add(testCube);


// create a 2D array to store the color values for each pixel in the GUI display:
let displayColors = new Array(displayHeight).fill(0).map(() => new Array(displayWidth).fill([0, 0, 0, 0]));  // Initialize to black

// Create a 2D canvas for the GUI
canvas = document.createElement('canvas');
canvas.width = displayWidth;
canvas.height = displayHeight;
document.body.appendChild(canvas);
ctx = canvas.getContext('2d');
//append the canvas to a <div> in the html instead of to the body
const canvasContainer = document.getElementById('canvasContainer');
canvasContainer.appendChild(canvas);

// Create a second canvas for buffering
let bufferCanvas = document.createElement('canvas');
bufferCanvas.width = displayWidth;
bufferCanvas.height = displayHeight;
let bufferCtx = bufferCanvas.getContext('2d');

// Function to toggle canvas and transform helper visibility
function toggleCanvasVisibility(isVisible) {
    if (isVisible) {
      canvas.style.display = 'block'; // Show the canvas
      planeTransformControls.visible = true; //show transform helper for plane
    } else {
      canvas.style.display = 'none'; // Hide the canvas
      planeTransformControls.visible = false; //hide transform helper for plane
    }
  }

// Create the texture here, after the canvas is created
planeTexture = new THREE.Texture(canvas);
planeTexture.format = THREE.RGBAFormat; //make sure alpha channel is being read correctly
planeTexture.type = THREE.UnsignedByteType;
planeTexture.minFilter = THREE.NearestFilter; // Disable minification filtering with THREE.NearestFilter
planeTexture.magFilter = THREE.NearestFilter; // Disable magnification filtering with THREE.NearestFilter


// Set up material setting for plane so it shows projection of the canvas
// (thereby showing the nearest neighbor pixels of point cloud).

//let planeMaterial = new THREE.MeshBasicMaterial({color: 'white', side: THREE.DoubleSide});
//const planeMaterial = new THREE.MeshBasicMaterial({ map: planeTexture, side: THREE.DoubleSide });

function definePlaneMaterial(planeTexture) {
    //Modify plane material to correct gamma miscalibration problem and display the same thing canvas does
    planeMaterial = new THREE.ShaderMaterial({
        uniforms: {
        map: { value: planeTexture },
        },
        vertexShader: `
        varying vec2 vUv;
    
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
        `,
        fragmentShader: `
        precision mediump float; // Make floating point medium resolution
        uniform sampler2D map;
        varying vec2 vUv;
    
        void main() {
            vec4 texColor = texture2D(map, vUv);
            vec3 color = texColor.rgb;
            float alpha = texColor.a;
        
            vec3 gamma = vec3(1.0 / 1.0);
            vec3 correctedColor = pow(color, gamma);
        
            gl_FragColor = vec4(correctedColor, alpha);
        }
        `,
        depthTest: true,

        side: THREE.DoubleSide,
        transparent: true,
    }); 
}
definePlaneMaterial(planeTexture);

//add intersecting plane to the scene
let planeGeometry = new THREE.PlaneGeometry(planeWidth, planeHeight); //width and height of plane  
plane = new THREE.Mesh(planeGeometry, planeMaterial);
plane.name = 'plane';
// create infinite plane to use for clipping parallel to visible plane
let globalPlane = new THREE.Plane();
globalPlane.name = 'globalPlane';
//have plane be child of planeContainer (an invisible point in the center of world)
const planeContainer = new THREE.Object3D(); //this is what we are rotating around
planeContainer.name = 'planeContainer'
planeContainer.add(plane);
scene.add(planeContainer);

// Create wireframe outline of plane so it can be seen even if transparent
var lineMaterial = new THREE.LineBasicMaterial( { color: 0xffffff, linewidth: 2 } );
var outlineGeometry = new THREE.EdgesGeometry( planeGeometry );
var planeWireframe = new THREE.LineSegments( outlineGeometry, lineMaterial );
planeWireframe.name = 'planeWireframe';
plane.add(planeWireframe);

// In-scene controller GUI for plane
let planeTransformControls = new tControls.TransformControls(camera, renderer.domElement);
planeTransformControls.name = 'plane transform controls';
// console.log(planeTransformControls);
planeTransformControls.attach(planeContainer);
planeTransformControls.setMode('combined');
planeTransformControls.setSpace('local');
//localtransformControls.worldPosition = new THREE.Vector3(3, 3, 3);; //localtransformControls.position
scene.add(planeTransformControls);
// Make sure the scene controls aren't activated when we change the local controls
planeTransformControls.addEventListener('dragging-changed', function (event) {
    orbitControls.enabled = !event.value;
    isDragging = event.value;
});
planeTransformControls.addEventListener('change', function() {
    if (isDragging) {
        doWhileMoving();
    }
});

// Allow switching of transformation modes
window.addEventListener('keydown', function (event) {
    switch (event.key) {
        case 't':
            planeTransformControls.setMode('translate');
            break
        case 'r':
            planeTransformControls.setMode('rotate');
            break
        case 's':
            planeTransformControls.setMode('scale');
            break
        case 'e':
            planeTransformControls.setMode('combined');
            break
    }
})


// Call updatePlane() whenever you move or rotate the planeContainer
function updatePlane() {
    // Obtain the world position of the plane
    let worldPosition = new THREE.Vector3();
    plane.getWorldPosition(worldPosition);

    // Obtain the world "up" direction of the plane
    let worldUp = new THREE.Vector3();
    plane.getWorldDirection(worldUp);

    // Update the globalPlane to match the position and orientation of the plane
    globalPlane.setFromNormalAndCoplanarPoint(worldUp, worldPosition);

    // // Update the position and quaternion of the Plane visualizer
    if (debug) {
        globalPlaneVisualizer.position.copy(worldPosition);
        globalPlaneVisualizer.lookAt(worldPosition.clone().add(worldUp));
        globalPlaneVisualizer.updateMatrixWorld(true);  // force the update of world matrix
    }
}



// Allow user to manipulate the location and visibility of the plane
function planeManipulation(){
    const planeMoveFolder = planeFolder.addFolder('Location & Rotation');
    //directions to manipulate plane in, and setting vars to check if user is moving the plane
    planeMoveFolder.add(planeContainer.position, 'z', -100, 100).name('Plane Position').onChange(function() {doWhileMoving()}); //coordinates are how far to go in either direction
    // Create objects to hold the user-friendly rotation values
    let planeRotationHolder = {
        rotationX: 0,
        rotationY: 0,
        rotationZ: 0,
    };
    
    function mapValue(value, start1, stop1, start2, stop2) {
        return start2 + (stop2 - start2) * ((value - start1) / (stop1 - start1));
    }
    
    planeMoveFolder.add(planeRotationHolder, 'rotationX', -180, 180).name('Plane Rotation X').onChange(function(value) {
        planeContainer.rotation.x = mapValue(value, -180, 180, -Math.PI, Math.PI);
        doWhileMoving();
    });
    
    planeMoveFolder.add(planeRotationHolder, 'rotationY', -180, 180).name('Plane Rotation Y').onChange(function(value) {
        planeContainer.rotation.y = mapValue(value, -180, 180, -Math.PI, Math.PI);
        doWhileMoving();
    });
    
    planeMoveFolder.add(planeRotationHolder, 'rotationZ', -180, 180).name('Plane Rotation Z').onChange(function(value) {
        planeContainer.rotation.z = mapValue(value, -180, 180, -Math.PI, Math.PI);
        doWhileMoving();
    });

    //let player turn plane invisible (by default shown) by toggling which layer its on
    let showPlane = { value: false };
    planeFolder.add(showPlane, 'value').name('Hide Plane').onChange(function() {
        plane.layers.toggle( 0 );
    });
    // planeFolder.open(); //have the folder start off with all options showing
}
planeManipulation();


// Add option to reset plane location/rotation
function resetPlaneLocation() {
    let worldPosition = new THREE.Vector3();
    let worldQuaternion = new THREE.Quaternion();
    let worldScale = new THREE.Vector3();

    // desired absolute transformation
    worldPosition.set(0, 0, 0);
    worldQuaternion.setFromEuler(new THREE.Euler(0, 0, 0, 'XYZ'));
    worldScale.set(1, 1, 1);

    // inverse of the parent's world transformation
    let parentWorldMatrix = new THREE.Matrix4();

    if (planeContainer.parent) {
        parentWorldMatrix.copy(planeContainer.parent.matrixWorld);
    }

    let inverseParentWorldMatrix = new THREE.Matrix4();
    inverseParentWorldMatrix.copy(parentWorldMatrix).invert();

    // apply the inverse parent world matrix to the desired world matrix
    let matrix = new THREE.Matrix4();
    matrix.compose(worldPosition, worldQuaternion, worldScale);
    matrix.premultiply(inverseParentWorldMatrix);

    // Apply the resulting matrix to the planeContainer
    planeContainer.matrix.copy(matrix);
    planeContainer.matrix.decompose(planeContainer.position, planeContainer.quaternion, planeContainer.scale);
    planeContainer.updateMatrixWorld(true); // update the world matrix

    // Update the transform controls to reflect the new position of the planeContainer
    // planeTransformControls.update(); // Function now depricated

    doWhileMoving();
    console.log('plane reset');
}

planeFolder.add(optionOptions, 'resetPlane').name('Reset Plane');


// Set up different material properties
basicMaterial = new THREE.ShaderMaterial({
    uniforms: uniforms,
    vertexShader: `
        uniform float size;
        varying vec3 vColor;

        #include <clipping_planes_pars_vertex> //clipping plane
        
        void main() {
            #include <begin_vertex> //clipping plane
            #include <project_vertex> //clipping plane
            #include <clipping_planes_vertex> //clipping plane
            vColor = color; // Original code
            vec4 mvPositionNew = modelViewMatrix * vec4( position, 1.0 );
            gl_PointSize = size * ( 300.0 / -mvPositionNew.z );
            gl_Position = projectionMatrix * mvPositionNew;
        }
    `,
    fragmentShader: `
        precision mediump float; // Make floating point medium resolution
        uniform vec3 color;
        uniform float gammaCorrection;
        varying vec3 vColor;
        #include <clipping_planes_pars_fragment> //clipping plane
        
        void main() {
            #include <clipping_planes_fragment> //clipping plane
            vec3 gamma = vec3(1.0 / gammaCorrection);
            vec3 correctedColor = pow(vColor, gamma);
            gl_FragColor = vec4( correctedColor, 1.0 );
        }
    `,
    transparent: false, // Basic material is opaque
    depthTest: true, //set to true, as false will make the object render on top of everything else
    depthWrite: true, // set to false for translucent objects
    vertexColors: true, // ensures that the colors from geometry.attributes.color are used
    blending: THREE.NoBlending, // Was THREE.NormalBlending for normal scene shading
    clipping: true,
    //clippingPlanes : [globalPlanes]
});
thresholdMaterial = new THREE.ShaderMaterial({
    uniforms: uniforms,
    vertexShader: `
        uniform float size;
        varying vec3 vColor;
        #include <clipping_planes_pars_vertex> //clipping plane
        
        void main() {
            #include <begin_vertex> //clipping plane
            #include <project_vertex> //clipping plane
            #include <clipping_planes_vertex> //clipping plane
            vColor = color;
            vec4 mvPositionNew = modelViewMatrix * vec4( position, 1.0 );
            gl_PointSize = size * ( 300.0 / -mvPositionNew.z );
            gl_Position = projectionMatrix * mvPositionNew;
        }
    `,
    fragmentShader: `
        precision mediump float; // Make floating point medium resolution
        uniform vec3 color;
        uniform float gammaCorrection;
        uniform float brightnessThreshold;
        uniform int invertAlpha;
        varying vec3 vColor;
        #include <clipping_planes_pars_fragment> //clipping plane
        
        void main() {
            #include <clipping_planes_fragment> //clipping plane
            vec3 gamma = vec3(1.0 / gammaCorrection);
            vec3 correctedColor = pow(vColor, gamma);

            float brightness = dot(correctedColor, vec3(0.299, 0.587, 0.114)); // calculate brightness
            if (invertAlpha == 0) {
                brightness = 1.0 - brightness;
            }
            if (brightness < brightnessThreshold) {
                discard;
            } else {
                gl_FragColor = vec4( correctedColor, 1.0 );
            }
        }
    `,
    transparent: true,
    depthTest: true, //set to true, as false will make the object render on top of everything else
    depthWrite: true, // set to false for translucent objects
    vertexColors: true, // ensures that the colors from geometry.attributes.color are used
    blending: THREE.NormalBlending
});
translucentMaterial = new THREE.ShaderMaterial({
    uniforms: uniforms,
    vertexShader: `
        uniform float size;
        varying vec3 vColor;
        #include <clipping_planes_pars_vertex> //clipping plane
        
        void main() {
            #include <begin_vertex> //clipping plane
            #include <project_vertex> //clipping plane
            #include <clipping_planes_vertex> //clipping plane
            vColor = color;
            vec4 mvPositionNew = modelViewMatrix * vec4( position, 1.0 );
            gl_PointSize = size * ( 300.0 / -mvPositionNew.z );
            gl_Position = projectionMatrix * mvPositionNew;
        }
    `,
    fragmentShader: `
        precision mediump float; // Make floating point medium resolution
        uniform vec3 color;
        uniform float gammaCorrection;
        uniform float brightnessThreshold;
        uniform int invertAlpha;
        uniform float transparencyIntensity;
        varying vec3 vColor;
        #include <clipping_planes_pars_fragment> //clipping plane
        
        void main() {
            #include <clipping_planes_fragment> //clipping plane
            vec3 gamma = vec3(1.0 / gammaCorrection);
            vec3 correctedColor = pow(vColor, gamma);

            float brightness = dot(correctedColor, vec3(0.299, 0.587, 0.114));
            float alpha = brightness * transparencyIntensity; // Modified alpha calculation
            if (invertAlpha == 0) {
                alpha = 1.0 - alpha;
            }
            gl_FragColor = vec4( correctedColor, alpha );
            //// Reverse depth value
            //gl_FragDepth = 1.0 - gl_FragCoord.z;
        }
    `,
    transparent: true,
    depthTest: true, // enable depth testing
    depthWrite: false, // disable depth writing
    vertexColors: true,
    blending: THREE.NormalBlending,
    // blending: THREE.CustomBlending,
    // blendEquation: THREE.AddEquation,
    // blendSrc: THREE.SrcAlphaFactor,
    // blendDst: THREE.OneMinusSrcAlphaFactor,

});
// Initialize material, should be basicMaterial normally
material = basicMaterial;


// Shader GUI options
shaderFolder.add(uniforms.size, 'value', 0, 2).name('Voxel Size'); // Add size option to GUI
shaderFolder.add(uniforms.gammaCorrection, 'value', 0.1, 10).name('Gamma correction'); // change Gamma correction amount
// Choose transparency shader.
let toggleTransparency = { value: 0 };
let pointSortingType = { sortingType: 0 };

shaderFolder.add(toggleTransparency, 'value', { Solid: 0, Threshold: 1, Translucent: 2 }).name('Transparency').onChange(function(value) {
    const storeToggle = [basicMaterial, thresholdMaterial, translucentMaterial];    
    points.material = storeToggle[value];

    // Remove existing controllers, if any
    if (cutoffController) {
        shaderFolder.remove(cutoffController);
        cutoffController = null;
    }
    if (invertController) {
        shaderFolder.remove(invertController);
        invertController = null;
    }
    if (opacityController) {
        shaderFolder.remove(opacityController);
        opacityController = null;
    }
    if (opacityPointSortingController) {
        shaderFolder.remove(opacityPointSortingController);
        opacityPointSortingController = null;
    }

    if (value == 1) { // if threshold shader is on, show extra options
        cutoffController = shaderFolder.add(bThreshold, 'value', 0, 1).name('Cut-off Level').onChange(function(value) {
            thresholdMaterial.uniforms.brightnessThreshold.value = value;
        });

        invertController = shaderFolder.add(uniforms.invertAlpha, 'value').name('Invert');
    } else if (value == 2) { // if transparency shader is on, show extra options
        invertController = shaderFolder.add(uniforms.invertAlpha, 'value').name('Invert');
        opacityController = shaderFolder.add(uniforms.transparencyIntensity, 'value', 0, 8).name('Opacity');
    
        // Transparency rendering/point sorting algorithm choice
        opacityPointSortingController = shaderFolder.add(pointSortingType, 'sortingType', 
            {'default': 0, 'random': 1, 'sort by depth': 2}).name('Transparency Sorting').onChange(function(sortingType) {
                if (sortingType == 0){ //if default sorting, make geometry normal
                    randomSortMaterial = false;
                    loadPly(defaultPlyFile);
                } else if (sortingType == 1) { // if sorting is random, let's mix things up
                    randomSortMaterial = true;
                    loadPly(defaultPlyFile);
                } // third option to be added here...
        });

    }
});
let opacityPointSortingController = null; //move this to top of code


// ***** Clipping planes: *****
const globalPlanes = [ globalPlane ], Empty = [] //Object.freeze( [] );
renderer.clippingPlanes = Empty; // GUI sets it to globalPlanes
renderer.localClippingEnabled = true;

let folderGlobal = gui.addFolder( 'Global Clipping' );
let propsGlobal = {
    get 'Enabled'() {
        return renderer.clippingPlanes !== Empty;
    },
    set 'Enabled'( v ) {
        renderer.clippingPlanes = v ? globalPlanes : Empty;
    },
    get 'Plane'() {
        return globalPlane.constant;
    },
    set 'Plane'( v ) {
        globalPlane.constant = v;
    },
};
folderGlobal.add( propsGlobal, 'Enabled' );


// Function to reset GUI user options on reload of new ply file
function resetUserOptions() {
    planeFolder.__controllers.forEach(function(controller) {
      controller.setValue(controller.initialValue);
    });
    shaderFolder.__controllers.forEach(function(controller) {
        controller.setValue(controller.initialValue);
      });

      planeContainer.position.set(0, 0, 0); //move plane back to original location
  }


//.ply loader
function loadPly(url) {
    return new Promise((resolve, reject) => {
        // Remove the old Points object from the scene, if it exists
        if (points) {
            scene.remove(points);
            points = null;
        }
        //load new ply file
        const loader = new PLYLoader();
        loader.load(url, function (geometry) {
            if (randomSortMaterial) { // if our material type is randomDepthSort, randomize geometry loading
                const shuffledGeometry = shuffleGeometry(geometry);
                geometry = shuffledGeometry;
                console.log('geometry shuffled!');
            }

            geometry.rotateZ(Math.PI);
            geometry.center(); 
            // geometry.scale(-1, -1, -1); // flip along every axis


            // Make the GUI canvas and plane the width and height of the ply's bounding box
            // Compute the bounding box and get dimensions
            geometry.computeBoundingBox();
            bbox = geometry.boundingBox;
            let width = bbox.max.x - bbox.min.x;
            let height = bbox.max.y - bbox.min.y;
            let depth = bbox.max.z - bbox.min.z;
            console.log('Width of bounding box: ', Math.round(width), ', Height of bounding box: ', Math.round(height));

            // Set camera to twice as far away as point cloud's longest side
            camera.position.z = Math.max(width, height, depth);

            // Update the display size and low resolution size of plane / GUI
            displayWidth = displayWidthOriginal = Math.round(width);
            displayHeight = displayHeightOriginal = Math.round(height);
            lowResWidth = Math.round(displayWidth / 2);
            lowResHeight = Math.round(displayHeight / 2);

            // Update canvas, buffer canvas, and color array dimensions
            canvas.width = displayWidth;
            canvas.height = displayHeight;
            bufferCanvas.width = displayWidth;
            bufferCanvas.height = displayHeight;
            displayColors = new Array(displayHeight).fill(0).map(() => new Array(displayWidth).fill([0, 0, 0]));

            // Update the plane geometry's size
            planeGeometry.dispose(); // free memory from the old geometry
            planeGeometry = new THREE.PlaneGeometry(displayWidth, displayHeight);

            // Dispose of old texture & material, and remake with the updated canvas
            planeTexture.dispose();
            planeTexture = new THREE.Texture(canvas);
            planeTexture.minFilter = THREE.NearestFilter; // Disable minification filtering with THREE.NearestFilter
            planeTexture.magFilter = THREE.NearestFilter; // Disable magnification filtering with THREE.NearestFilter
            planeMaterial.dispose;
            definePlaneMaterial(planeTexture);

            // // Update the plane itself
            plane.geometry.dispose();
            plane.material.dispose();
            plane.geometry = planeGeometry;
            plane.material = planeMaterial;

            //update plane outline
            outlineGeometry.dispose();
            outlineGeometry = new THREE.EdgesGeometry( planeGeometry );
            planeWireframe.geometry.dispose();
            planeWireframe.geometry = outlineGeometry;

            // Update point cloud material
            material.needsUpdate = true;
            points = new THREE.Points(geometry, material);
            scene.add(points);

            // And run function we always run when making a change to plane settings
            doWhileMoving();

            // Then, create the grid after the points have been added to the scene
            grid = createGrid(points, cellSize);

            // Finally, resolve the Promise after everything is done
            resolve('PLY file loaded');
        }, undefined, function (error) {
            console.error(error);
            reject(error);
        });
    });
}
// Load a default PLY file from a URL when the script runs for the first time
loadPly(defaultPlyFile).then((message) => {
    console.log(message); // logs 'PLY file loaded' when the promise is resolved
}).catch((error) => {
    console.error('Failed to load PLY file', error);
});


// This function updates the canvas
function updateCanvas() {
    if (updateAfterMoving && !planeIsMoving) {
        forceRefreshDisplay = true;
        displayWidth = displayWidthOriginal;
        displayHeight = displayHeightOriginal;
        displayColors = new Array(displayHeight).fill(0).map(() => new Array(displayWidth).fill([0, 0, 0]));
        updateAfterMoving = false;
    }

    if (points && (planeIsMoving || displayWidth !== displayWidthOriginal || displayHeight !== displayHeightOriginal || forceRefreshDisplay === true)) {

        // Update displayColors at the current resolution
        for (let y = 0; y < displayHeight; y++) {
            for (let x = 0; x < displayWidth; x++) {
                // Map the pixel coordinates to the corresponding coordinates on the plane in 3D space.
                let localPos = new THREE.Vector3(
                    x / displayWidth * planeGeometry.parameters.width - planeGeometry.parameters.width / 2,
                        // Subtract y from displayHeight to flip the y-axis
                        (displayHeight - y) / displayHeight * planeGeometry.parameters.height - planeGeometry.parameters.height / 2,
                        //y / displayHeight * planeGeometry.parameters.height - planeGeometry.parameters.height / 2,
                    0
                );
                // Transform the local position to world space according to the plane's world matrix
                let worldPos = localPos.applyMatrix4(plane.matrixWorld);

                // //Find the vertex in the point cloud which is closest to the given coordinate
                let closestVertexIndex = findNearestNeighbor(grid, worldPos, cellSize);
                if (closestVertexIndex !== null) {
                    // Proceed with getting the color and updating displayColors
                    // Sample the RGB color value of the given vertex, to be stored in `color`
                    let color = new THREE.Color();
                    color.fromBufferAttribute(points.geometry.attributes.color, closestVertexIndex);
                    // Store the color in the displayColors array
                    displayColors[y][x] = [color.r, color.g, color.b];
                } else {
                    //displayColors[y][x] = [0, 0, 0]; //[1, 1, 1] for white canvas background, set to [0, 0, 0] for black
                    displayColors[y][x] = "blank";
                }
            }
        }
        forceRefreshDisplay = false;
        areArraysReady = true;
    } else {areArraysReady = true;}
}


// This function draws the new frame
function drawFrame() {
    if (areArraysReady) {
        // Calculate scaling factors
        let scaleX = canvas.width / displayWidth;
        let scaleY = canvas.height / displayHeight;

        // Code for drawing the new frame
            // Draw the displayColors onto the canvas
        if (areArraysReady) {
            for (let y = 0; y < displayHeight; y++) {
                for (let x = 0; x < displayWidth; x++) {
                    if (displayColors[y][x] !== "blank") { //if canvas isn't showing nothing
                        let [r, g, b] = displayColors[y][x];
                                // Apply gamma correction, becuase we need to do that for some reason
                                gammaPowerAmount = 1 / uniforms.gammaCorrection.value;
                                r = Math.pow(r, gammaPowerAmount);
                                g = Math.pow(g, gammaPowerAmount);
                                b = Math.pow(b, gammaPowerAmount);
                                
                        //bufferCtx.fillStyle = `rgb(${Math.round(r*255)}, ${Math.round(g*255)}, ${Math.round(b*255)})`; //Original code
                        bufferCtx.fillStyle = `rgba(${r*255}, ${g*255}, ${b*255}, 1)`;
                        bufferCtx.fillRect(x * scaleX, y * scaleY, scaleX, scaleY);  // Draw a rectangle for each pixel
                    } else { //if canvas is blank, make invisible
                        //bufferCtx.fillStyle = 'rgb(100, 100, 100)';
                        bufferCtx.clearRect(x * scaleX, y * scaleY, scaleX, scaleY);
                        //bufferCtx.fillStyle = 'rgba(0, 0, 0, 0)'; // Fill in with transparent rgba value
                        bufferCtx.fillStyle = backColor.planeBackgroundColor;
                        bufferCtx.fillRect(x * scaleX, y * scaleY, scaleX, scaleY);
                    }
                }
            }

            // Only when you're done drawing, copy the content of the bufferCanvas onto the visible canvas
            ctx.reset();
            ctx.drawImage(bufferCanvas, 0, 0);


            areArraysReady = false;
        

            // Update the texture
            planeTexture.needsUpdate = true;
        }
    }
}


// Animation loop
function animate() {
    fpsCounter.begin()

    //check if loading is finished or not
    if (points || dontShowLoading){
        document.getElementById('overlay').style.display = 'none'; // hide loading overlay
    } else {
        document.getElementById('overlay').style.display = 'flex';
    }

    // Update and draw canvas on plane and GUI
    updateCanvas();
    drawFrame();

    // Render the scene
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
    // requestAnimationFrame(animate);

    // reset flag
    if (planeIsMoving) {
        planeIsMoving = false;
    }
    fpsCounter.end()
}
animate();