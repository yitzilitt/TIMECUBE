import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { calculateSegmentCenters } from './getPixelPointsFromPlane';

/**
 * Given an array of 3D points, this function will create a 3D space and plot these points.
 * 
 * @param {Array.<Array.<number>>} points - An array of points, each an array of three numbers (x,y,z).
 */
function visualizePoints(points) {
    //Create a scene
    const scene = new THREE.Scene();

    // Create a camera
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 10;

    // Create a renderer
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Orbit Controls for the scene as a whole
    const orbitControls = new OrbitControls(camera, renderer.domElement);
    
    // Add depth visualizers to scene
    var axesHelper = new THREE.AxesHelper( 1 );
    const size = 10;
    const divisions = 10;
    const gridHelper = new THREE.GridHelper( size, divisions );
    scene.add( gridHelper, axesHelper );


    // Create a geometry for all points
    const geometry = new THREE.BufferGeometry();

    // Create a typed array to hold the point data
    const positions = new Float32Array(points.length * 3);

    for (let i = 0; i < points.length; i++) {
        positions[i * 3] = points[i][0];
        positions[i * 3 + 1] = points[i][1];
        positions[i * 3 + 2] = points[i][2];
    }

    // Attach the positions array to the geometry
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    // Create a material for all points
    const material = new THREE.PointsMaterial({
        color: 0xff0000,
        size: 4,
        sizeAttenuation: false // This causes the dots to stay the same size regardless of distance
    });

    // Create a Points (point cloud) and add it to the scene
    const pointsCloud = new THREE.Points(geometry, material);
    scene.add(pointsCloud);

    // Animation loop
    function animate() {
        requestAnimationFrame(animate);
        renderer.render(scene, camera);
    }
    animate();
}


// // Run the visualizer if points are imported
// // let inputPointCloud = calculateSegmentCenters([[0, 0, 0], [1,1,1], [], [1,2,1]], [3, 4]);
// // if (inputPointCloud) {
// //     visualizePoints(inputPointCloud);
    
// // }
visualizePoints(calculateSegmentCenters([[0, 0, 0], [100, 0, 0], [100, 100, 0], [0, 100, 110]], [10, 10]));
// visualizePoints(calculateSegmentCenters([[0, 0, 0], [1,1,1], [], [1,2,1]], [3, 4]));