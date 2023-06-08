//to run in local server: go to Command Prompt, 
//navigate to folder with this script, and type: `npx parcel index.html --public-url ./`
//Then, you can go to http://localhost:1234/ in your web browser to see it.
//You can also use `npm start` for an Electron app

import * as THREE from 'three';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
//import { MeshWboitMaterial, WboitPass } from 'three-wboit';
import * as dat from 'dat.gui';
import { createGrid, findNearestNeighbor } from './nearestNeighbor.js'; //import custom code
import Stats from 'stats.js' //check framerate


//Declaring (most) global variables here
let defaultPlyFile = 'man walking to bench.ply'; //replace with name of default .ply file to load
let plane;
let planeIsMoving = true; //flag to indicate whether the plane has moved, begins as on
let points;
let displayWidth = 100;
let displayWidthOriginal = displayWidth; //in order to reset display to original once we change it
let displayHeight = 100;
let displayHeightOriginal = displayHeight; //in order to reset display to original once we change it
// const lowResWidth = displayWidth / 2;
// const lowResHeight = displayHeight / 2;
// const planeWidth = displayWidth;
// const planeHeight = displayHeight;

let lowResWidth = displayWidth / 2;
let lowResHeight = displayHeight / 2;
let planeWidth = displayWidth;
let planeHeight = displayHeight;

let howMuchToDividePlaneBy; // Set how much smaller resolution  to make the plane display
let grid = {}; // Declare the grid variable outside the loader function
const cellSize = 2; // Set cellSize as a global variable
let bThreshold = { value: 0.5 }; // The brightness value should be between 0 (black) and 1 (white).
let canvas;
let ctx;
let material;
let basicMaterial;
let thresholdMaterial;
let translucentMaterial;
let planeTexture;
let gammaPowerAmount;
let updateAfterMoving = false; //new flag
let forceRefreshDisplay = true;
let areArraysReady = false;
let debug = false; //set to true if you want to see fps counter, other dev help stuff.

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

// Scene, Camera, Renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
//const renderer = new THREE.WebGLRenderer( { antialias : false } ); //for fps improvements if required
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
// Set camera position
camera.position.z = 5;

//transparency settings
renderer.setTransparentSort

// Orbit Controls
const controls = new OrbitControls(camera, renderer.domElement);

//create GUI
const gui = new dat.GUI();
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
if (debug) {
    fpsCounter.showPanel(0) // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild(fpsCounter.dom);
}


//function for lowering resolution while plane is being moved
function doWhileMoving() {
    planeIsMoving = true;
    displayWidth = lowResWidth;
    displayHeight = lowResHeight;
    updateAfterMoving = true;
    displayColors = new Array(lowResHeight).fill(0).map(() => new Array(lowResWidth).fill([0, 0, 0]));
}

// Let user upload their own .ply timecube files
function userPlyUploadOption() {
    // Set up file input event listener
    document.getElementById('plyFile').addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (!file) {
            console.log('No file selected!');
            return;
        }

        // This line creates a URL representing the File object
        const url = URL.createObjectURL(file);
        
        // Now load the PLY from the generated URL
        loadPly(url);
    });

    // Let user upload .ply file of their choice
    var params = {
        loadFile : function() { 
                document.getElementById('plyFile').click();
        }
    };
    // Add .ply loader to GUI
    timecubeFolder.add(params, 'loadFile').name('Load Custom PLY File');
}
// Call the function
userPlyUploadOption();


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
    color: 'rgb(0, 0, 0)',
    //color: [0,0,0],
}
timecubeFolder.addColor( backColor, 'color' ).name('Background').onChange(function(value) {
    scene.background = new THREE.Color( backColor.color )});;
scene.background = new THREE.Color( backColor.color );

//add red cube in center for debugging + troubleshooting
var testCubeGeometry = new THREE.BoxGeometry(1, 1, 1);
var testCubeMaterial = new THREE.MeshBasicMaterial({color: 0xff0000});
var testCube = new THREE.Mesh(testCubeGeometry, testCubeMaterial);
testCube.position.set(0, 0, 0);
scene.add(testCube);


// create a 2D array to store the color values for each pixel in the GUI display:
let displayColors = new Array(displayHeight).fill(0).map(() => new Array(displayWidth).fill([0, 0, 0]));  // Initialize to black

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

// Create the texture here, after the canvas is created
planeTexture = new THREE.Texture(canvas);
planeTexture.minFilter = THREE.NearestFilter; // Disable minification filtering with THREE.NearestFilter
planeTexture.magFilter = THREE.NearestFilter; // Disable magnification filtering with THREE.NearestFilter


// Set up material setting for plane so it shows projection of the canvas
// (thereby showing the nearest neighbor pixels of point cloud).

//const planeMaterial = new THREE.MeshBasicMaterial({color: 'white', side: THREE.DoubleSide});
//const planeMaterial = new THREE.MeshBasicMaterial({ map: planeTexture, side: THREE.DoubleSide });
// Modify plane material to correct gamma miscalibration problem and display the same thing canvas does
let planeMaterial = new THREE.ShaderMaterial({
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
      uniform sampler2D map;
      varying vec2 vUv;
  
      void main() {
        vec4 texColor = texture2D(map, vUv);
        vec3 color = texColor.rgb;
  
        vec3 gamma = vec3(1.0 / 1.0);
        vec3 correctedColor = pow(color, gamma);
  
        gl_FragColor = vec4(correctedColor, 1.0);
      }
    `,
    side: THREE.DoubleSide,
}); 

//add intersecting plane to the scene
let planeGeometry = new THREE.PlaneGeometry(planeWidth, planeHeight); //width and height of plane  
plane = new THREE.Mesh(planeGeometry, planeMaterial);
//have plane be child of planeContainer (an invisible point in the center of world)
const planeContainer = new THREE.Object3D(); //this is what we are rotating around
planeContainer.add(plane);
scene.add(planeContainer);



// Allow user to manipulate the location and visibility of the plane
function planeManipulation(){
    //directions to manipulate plane in, and setting vars to check if user is moving the plane
    planeFolder.add(plane.position, 'z', -100, 100).name('Plane Position').onChange(function() {doWhileMoving()}); //coordinates are how far to go in either direction
    // Create objects to hold the user-friendly rotation values
    let planeRotationHolder = {
        rotationX: 0,
        rotationY: 0,
        rotationZ: 0,
    };
    
    function mapValue(value, start1, stop1, start2, stop2) {
        return start2 + (stop2 - start2) * ((value - start1) / (stop1 - start1));
    }
    
    planeFolder.add(planeRotationHolder, 'rotationX', -180, 180).name('Plane Rotation X').onChange(function(value) {
        planeContainer.rotation.x = mapValue(value, -180, 180, -Math.PI, Math.PI);
        doWhileMoving();
    });
    
    planeFolder.add(planeRotationHolder, 'rotationY', -180, 180).name('Plane Rotation Y').onChange(function(value) {
        planeContainer.rotation.y = mapValue(value, -180, 180, -Math.PI, Math.PI);
        doWhileMoving();
    });
    
    planeFolder.add(planeRotationHolder, 'rotationZ', -180, 180).name('Plane Rotation Z').onChange(function(value) {
        planeContainer.rotation.z = mapValue(value, -180, 180, -Math.PI, Math.PI);
        doWhileMoving();
    });

    //let player turn plane invisible (by default shown) by toggling which layer its on
    let showPlane = { value: false };
    planeFolder.add(showPlane, 'value').name('Hide Plane').onChange(function() {
        plane.layers.toggle( 0 );
    });
    planeFolder.open(); //have the folder start off with all options showing
}
planeManipulation();


// Set up different material properties
basicMaterial = new THREE.ShaderMaterial({
    uniforms: uniforms,
    vertexShader: `
        uniform float size;
        varying vec3 vColor;
        
        void main() {
            vColor = color; // Original code
            vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
            gl_PointSize = size * ( 300.0 / -mvPosition.z );
            gl_Position = projectionMatrix * mvPosition;
        }
    `,
    fragmentShader: `
        uniform vec3 color;
        uniform float gammaCorrection;
        varying vec3 vColor;
        
        void main() {
            vec3 gamma = vec3(1.0 / gammaCorrection);
            vec3 correctedColor = pow(vColor, gamma);
            gl_FragColor = vec4( correctedColor, 1.0 );
        }
    `,
    transparent: false, // Basic material is opaque
    depthTest: true, //set to true, as false will make the object render on top of everything else
    depthWrite: true, // set to false for translucent objects
    vertexColors: true, // ensures that the colors from geometry.attributes.color are used
    blending: THREE.NoBlending // Was THREE.NormalBlending for normal scene shading
});
thresholdMaterial = new THREE.ShaderMaterial({
    uniforms: uniforms,
    vertexShader: `
        uniform float size;
        varying vec3 vColor;
        
        void main() {
            vColor = color;
            vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
            gl_PointSize = size * ( 300.0 / -mvPosition.z );
            gl_Position = projectionMatrix * mvPosition;
        }
    `,
    fragmentShader: `
        uniform vec3 color;
        uniform float gammaCorrection;
        uniform float brightnessThreshold;
        uniform int invertAlpha;
        varying vec3 vColor;
        
        void main() {
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
        
        void main() {
            vColor = color;
            vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
            gl_PointSize = size * ( 300.0 / -mvPosition.z );
            gl_Position = projectionMatrix * mvPosition;
        }
    `,
    fragmentShader: `
        uniform vec3 color;
        uniform float gammaCorrection;
        uniform float brightnessThreshold;
        uniform int invertAlpha;
        uniform float transparencyIntensity;
        varying vec3 vColor;
        
        void main() {
            vec3 gamma = vec3(1.0 / gammaCorrection);
            vec3 correctedColor = pow(vColor, gamma);

            float brightness = dot(correctedColor, vec3(0.299, 0.587, 0.114));
            float alpha = brightness * transparencyIntensity; // Modified alpha calculation
            if (invertAlpha == 0) {
                alpha = 1.0 - alpha;
            }
            gl_FragColor = vec4( correctedColor, alpha );
        }
    `,
    transparent: true,
    depthTest: true, // enable depth testing
    depthWrite: false, // disable depth writing
    vertexColors: true,
    blending: THREE.NormalBlending
});
// Initialize material, should be basicMaterial normally
material = basicMaterial;


// Shader GUI stuff
shaderFolder.add(uniforms.size, 'value', 0, 2).name('Voxel Size'); // Add size option to GUI
shaderFolder.add(uniforms.gammaCorrection, 'value', 0.1, 10).name('Gamma correction'); // change Gamma correction amount
// Choose transparency shader.
let toggleTransparency = { value: 0 };
shaderFolder.add(toggleTransparency, 'value', { Normal: 0, Threshold: 1, Translucent: 2 }).name('Transparency').onChange(function(value) {
    const storeToggle = [basicMaterial, thresholdMaterial, translucentMaterial];    
    points.material = storeToggle[value];
    if (shaderFolder.__controllers[3]) { //if extra option exists and shouldn't be, remove
        if(shaderFolder.__controllers[4]) {
            shaderFolder.__controllers[3].remove();
        } //in case another's out there
        shaderFolder.__controllers[3].remove(); // = true;
    }

    if (value == 1) { //if threshold shader is on, show extra options
        //bThreshold.value = 0.5 //reset to default
        shaderFolder.add(bThreshold, 'value', 0, 1).name('Cut-off Level').onChange(function(value) {
            thresholdMaterial.uniforms.brightnessThreshold.value = value;
        });
        // Invert if max cutoff is for white or black
        shaderFolder.add(uniforms.invertAlpha, 'value').name('Invert')
    } else if (value == 2) { //if transculency shader is on, show extra options
        // Invert if max opacity is for white or black
        shaderFolder.add(uniforms.invertAlpha, 'value').name('Invert')
        //control intensity of opacity
        shaderFolder.add(uniforms.transparencyIntensity, 'value', 0, 8).name('Opacity')

    }
  });


//.ply loader
function loadPly(url) {
    // Remove the old Points object from the scene, if it exists
    if (points) {
        scene.remove(points);
        points = null;
    }
    //load new ply file
    const loader = new PLYLoader();
    loader.load(url, function (geometry) {
        // your original code here, minus the loader.load call
        geometry.rotateZ(Math.PI);
        geometry.center(); 

        // Make the GUI canvas and plane the width and height of the ply's bounding box
        // Compute the bounding box and get dimensions
        geometry.computeBoundingBox();
        let bbox = geometry.boundingBox;
        let width = bbox.max.x - bbox.min.x;
        let height = bbox.max.y - bbox.min.y;
        let depth = bbox.max.z - bbox.min.z;
        console.log('Width of bounding box: ', Math.round(width), ', Height of bounding box: ', Math.round(height));

        // Set camare to twice as far away as point cloud's longest side
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
              uniform sampler2D map;
              varying vec2 vUv;
          
              void main() {
                vec4 texColor = texture2D(map, vUv);
                vec3 color = texColor.rgb;
          
                vec3 gamma = vec3(1.0 / 1.0);
                vec3 correctedColor = pow(color, gamma);
          
                gl_FragColor = vec4(correctedColor, 1.0);
              }
            `,
            side: THREE.DoubleSide,
        }); 

        // // Update the plane itself
        plane.geometry.dispose();
        plane.material.dispose();
        plane.geometry = planeGeometry;
        plane.material = planeMaterial;

        // Update point cloud material
        material.needsUpdate = true;
        points = new THREE.Points(geometry, material);
        scene.add(points);

        // And run function we always run when making a change to plane settings
        doWhileMoving();

        // Finally, create the grid after the points have been added to the scene
        grid = createGrid(points, cellSize);
    }, undefined, function (error) {
        console.error(error);
    });
}
// Load a default PLY file from a URL when the script runs for the first time
loadPly(defaultPlyFile);


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
                    displayColors[y][x] = [0, 0, 0]; //[1, 1, 1] for white canvas background, set to [0, 0, 0] for black
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
                    let [r, g, b] = displayColors[y][x];
                            // Apply gamma correction, becuase we need to do that for some reason
                            gammaPowerAmount = 1 / uniforms.gammaCorrection.value;
                            r = Math.pow(r, gammaPowerAmount);
                            g = Math.pow(g, gammaPowerAmount);
                            b = Math.pow(b, gammaPowerAmount);
                            
                    //bufferCtx.fillStyle = `rgb(${Math.round(r*255)}, ${Math.round(g*255)}, ${Math.round(b*255)})`; //Original code
                    bufferCtx.fillStyle = `rgb(${r*255}, ${g*255}, ${b*255})`;
                    bufferCtx.fillRect(x * scaleX, y * scaleY, scaleX, scaleY);  // Draw a rectangle for each pixel
                }
            }

            // Only when you're done drawing, copy the content of the bufferCanvas onto the visible canvas
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
    if (points){
        document.getElementById('overlay').style.display = 'none'; // hide loading overlay
    }    else {
        document.getElementById('overlay').style.display = 'flex';
    }

    //update and draw canvas on plane and GUI
    updateCanvas();
    drawFrame();

    // Render the scene
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(animate);

    // reset flag
    if (planeIsMoving) {
        planeIsMoving = false;
    }
    fpsCounter.end()
}
animate();