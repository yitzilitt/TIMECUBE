//to run in local server: go to Command Prompt, 
//navigate to folder with this script, and type: `npx parcel index.html --public-url ./`
//Then, you can go to http://localhost:1234/ in your web browser to see it.

import * as THREE from 'three';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as dat from 'dat.gui';
import { createGrid, findNearestNeighbor } from './nearestNeighbor.js'; //import custom code
import Stats from 'stats.js' //check framerate


//Declaring (most) global variables here
let nameOfPLY = 'timecube.ply'; //replace with name of .ply file to load
let plane;
let planeIsMoving = true; //flag to indicate whether the plane has moved, begins as on
let points;
let displayWidth = 50;
let displayWidthOriginal = displayWidth; //in order to reset display to original once we change it
let displayHeight = 50;
let displayHeightOriginal = displayHeight; //in order to reset display to original once we change it
const lowResWidth = displayWidth / 2;
const lowResHeight = displayHeight / 2;
const planeWidth = displayWidth
const planeHeight = displayHeight
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
let updateAfterMoving = false; //new flag
let forceRefreshDisplay = true;
let areArraysReady = false;
let debug = false; //set to true if you want to see fps counter, etc.

// Scene, Camera, Renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
//const renderer = new THREE.WebGLRenderer( { antialias : false } ); //for fps improvements if required
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
// Set camera position
camera.position.z = 5;

// Orbit Controls
const controls = new OrbitControls(camera, renderer.domElement);


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
planeTexture.minFilter = THREE.NearestFilter; // Disable minification filtering
planeTexture.magFilter = THREE.NearestFilter; // Disable magnification filtering


//add intersecting plane to the scene
const planeGeometry = new THREE.PlaneGeometry(planeWidth, planeHeight); //width and height of plane
//const planeMaterial = new THREE.MeshBasicMaterial({color: 'white', side: THREE.DoubleSide});
const planeMaterial = new THREE.MeshBasicMaterial({ map: planeTexture, side: THREE.DoubleSide });
plane = new THREE.Mesh(planeGeometry, planeMaterial);
//have plane be child of planeContainer (an invisible point in the center of world)
const planeContainer = new THREE.Object3D(); //this is what we are rotating around
planeContainer.add(plane);
scene.add(planeContainer);



//create GUI
const gui = new dat.GUI();
const planeFolder = gui.addFolder('Basic Controls');

//directions to manipulate plane in, and setting vars to check if user is moving the plane
planeFolder.add(plane.position, 'z', -100, 100).name('Plane Position').onChange(function() {doWhileMoving()}); //coordinates are how far to go in either direction
// Create objects to hold the user-friendly rotation values
let userFriendly = {
    rotationX: 0,
    rotationY: 0,
    rotationZ: 0,
  };
  
  function mapValue(value, start1, stop1, start2, stop2) {
    return start2 + (stop2 - start2) * ((value - start1) / (stop1 - start1));
  }
  
  planeFolder.add(userFriendly, 'rotationX', -180, 180).name('Plane Rotation X').onChange(function(value) {
    planeContainer.rotation.x = mapValue(value, -180, 180, -Math.PI, Math.PI);
    doWhileMoving();
  });
  
  planeFolder.add(userFriendly, 'rotationY', -180, 180).name('Plane Rotation Y').onChange(function(value) {
    planeContainer.rotation.y = mapValue(value, -180, 180, -Math.PI, Math.PI);
    doWhileMoving();
  });
  
  planeFolder.add(userFriendly, 'rotationZ', -180, 180).name('Plane Rotation Z').onChange(function(value) {
    planeContainer.rotation.z = mapValue(value, -180, 180, -Math.PI, Math.PI);
    doWhileMoving();
  });

  //let player turn plane invisible (by default shown) by toggling which layer its on
  let showPlane = { value: false };
  planeFolder.add(showPlane, 'value').name('Hide Plane').onChange(function() {
    plane.layers.toggle( 0 );
  });
planeFolder.open(); //have the folder start off with all options showing



// Set up materials here, before loading mesh
const uniforms = { //These are defaults for brightness threshold options
    color: { value: new THREE.Color(0xffffff) },
    brightnessThreshold: { value: 0.5 }, //set `value: 0.5` for 50% threshhold
    size: { value: 0.2 }, // this defines the size of the points in the point cloud
    invertAlpha: { value: 1 } // this defines if the alpha channel is inverted or not in translucency
};
basicMaterial = new THREE.PointsMaterial({ size: 0.2, vertexColors: true }); //`size: 0.2`, usually
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
        uniform float brightnessThreshold;
        varying vec3 vColor;
        
        void main() {
            float brightness = dot(vColor, vec3(0.299, 0.587, 0.114)); // correct way to calculate brightness
            if (brightness < brightnessThreshold) {
                discard;
            } else {
                gl_FragColor = vec4( vColor * color, 1.0 );
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
        uniform float brightnessThreshold;
        uniform int invertAlpha;
        varying vec3 vColor;
        
        void main() {
            float brightness = dot(vColor, vec3(0.299, 0.587, 0.114));
            float alpha = brightness;
            if (invertAlpha == 1) {
                alpha = 1.0 - alpha;
            }
            gl_FragColor = vec4( vColor * color, alpha );
        }
    `,
    transparent: true,
    depthTest: true, // enable depth testing
    depthWrite: false, // disable depth writing
    vertexColors: true,
    //blending: THREE.NormalBlending
    blending: THREE.CustomBlending,
    blendSrc: THREE.SrcAlphaFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
    blendEquation: THREE.AddEquation
});

material = basicMaterial; //initialize material, should be basicMaterial normally



// Choose transparency shader.
let toggleTransparency = { value: 0 };
planeFolder.add(toggleTransparency, 'value', { Normal: 0, Threshold: 1, Translucent: 2 }).name('Transparency').onChange(function(value) {
    const storeToggle = [basicMaterial, thresholdMaterial, translucentMaterial];    
    points.material = storeToggle[value];
    if (planeFolder.__controllers[6]) { //if extra option exists and shouldn't be, remove
        if(planeFolder.__controllers[7]) {planeFolder.__controllers[7].remove();} //in case another's out there
        planeFolder.__controllers[6].remove(); // = true;
    }

    if (value == 1) { //if threshold shader is on, show extra options
        //bThreshold.value = 0.5 //reset to default
        planeFolder.add(bThreshold, 'value', 0, 1).name('Brightness-Based Threshold').onChange(function(value) {
            thresholdMaterial.uniforms.brightnessThreshold.value = value;
        });
    } else if (value == 2) { //if transculency shader is on, show extra options
        //bThreshold.value = 0.0 //set to nothing so it doesn't interfere

        planeFolder.add(bThreshold, 'value', 0, 1).name('Brightness-Based Threshold').onChange(function(value) {
        thresholdMaterial.uniforms.brightnessThreshold.value = value;
        });

        let invertTranslucency = { value: false };
        planeFolder.add(invertTranslucency, 'value').name('Invert').onChange(function(value) {
            translucentMaterial.uniforms.invertAlpha.value = value; // Invert if max opacity is on white or black
        });
    }
  });



//.ply loader
const loader = new PLYLoader();
loader.load(nameOfPLY, function (geometry) {
    geometry.rotateZ(Math.PI);
    geometry.center(); 
    //const material = new THREE.PointsMaterial({ size: 0.2, vertexColors: true }); //`size: 0.2`, usually
    material.needsUpdate = true;

    points = new THREE.Points(geometry, material);
    scene.add(points);

    // Create the grid after the points have been added to the scene
    grid = createGrid(points, cellSize);

}, undefined, function (error) {
    console.error(error);
});



// Add GUI folder to let user filter the alpha value
const brightnessFilterFolder = gui.addFolder('Threshold Filter');

// if (toggleTransparency === 1) {
//     getController('Brightness-Based Threshold').__li.style.display = "none";
//   } 
    
// // The brightness value should be between 0 (black) and 1 (white).
// let bThreshold = { value: 0.5 };
// brightnessFilterFolder.add(bThreshold, 'value', 0, 1).name('Brightness-Based Threshold').onChange(function(value) {
//     thresholdMaterial.uniforms.brightnessThreshold.value = value;
// });

// The default value for the brightness filter should be false (i.e., not enabled).
let brightnessFilterEnabled = { value: false };
brightnessFilterFolder.add(brightnessFilterEnabled, 'value').name('Invert').onChange(function(value) {
    thresholdMaterial.uniforms.brightnessThreshold.value = 1 - bThreshold.value; // Invert the threshold value
});
if (points) {
    brightnessFilterFolder.show();
}



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
                    displayColors[y][x] = [1, 1, 1];
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
                    bufferCtx.fillStyle = `rgb(${Math.round(r*255)}, ${Math.round(g*255)}, ${Math.round(b*255)})`;
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