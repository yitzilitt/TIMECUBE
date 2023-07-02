import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js';

let defaultPlyFile = 'timecube_models/man walking to bench.ply'; //name of default .ply file to load
let originalPointCloud;
let originalPointGeometry;
// Set up material variables here
let uniforms = { // These are defaults for brightness threshold options
    color: { value: new THREE.Color(0xffffff) }, // threshold color to check against
    brightnessThreshold: { value: 0.5 }, // set `value: 0.5` for 50% threshhold
    size: { value: 1.0 }, // this defines the size of the points in the point cloud
    invertAlpha: { value: false }, // defines if translucency alpha channel is inverted or not
    gammaCorrection: {value: 2.2 }, // defines gamma correction amount. Set to 1.0 to turn off
    transparencyIntensity: { value: 1.0 } //  0 would make the object completely opaque; 1 (or greater) would make the object completely transparent
};

let translucentMaterial = new THREE.ShaderMaterial({
    uniforms: uniforms,
    vertexShader: `
        uniform float size;
        varying vec3 vColor;
        
        void main() {
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
        depthTest: true,
        depthWrite: false,
        vertexColors: true,
        blending: THREE.NormalBlending,
});


// Create a renderer
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
renderer.setPixelRatio(window.devicePixelRatio);

// Create a camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 10;
// Create scene
const scene = new THREE.Scene();

//.ply loader
function loadPly(url) {
    //load new ply file and save geometry
    const loader = new PLYLoader();
    loader.load(url, function (geometry) {
        geometry.rotateZ(Math.PI);
        geometry.center(); 
        originalPointGeometry = geometry;
        originalPointCloud = new THREE.Points(originalPointGeometry, translucentMaterial);
        scene.add(originalPointCloud);
        processPointCloud(originalPointCloud);
    }, undefined, function (error) {
        console.error(error);
    });
}


function processPointCloud(pointCloud) {
originalPointCloud = new THREE.Points(originalPointGeometry, translucentMaterial);

if (originalPointCloud) {
    scene.add(originalPointCloud);
    // console.log(originalPointCloud.geometry.attributes.position);

    // Abstracting the names of objects involves
    let existingGeometry = originalPointCloud.geometry;
    let existingPositions = existingGeometry.attributes.position.array;
    let existingColors = existingGeometry.attributes.color.array; 
    
    // for sorting
    let data = [];
    let vertices = [];
    let colors = [];

    for (let i = 0; i < existingPositions.length; i+=3) {
        let x = existingPositions[i];
        let y = existingPositions[i+1];
        let z = existingPositions[i+2];
        
        let r = existingColors[i];
        let g = existingColors[i+1];
        let b = existingColors[i+2];
        
        data[i/3] = [x, y, z, r, g, b];
        vertices.push(x, y, z);
        colors.push(r, g, b);
    }

    const geometry = existingGeometry;
    geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( vertices, 3 ) );
    geometry.setAttribute( 'color', new THREE.Float32BufferAttribute( colors, 3 ) );
    const attr_pos = geometry.attributes.position;
    const attr_clr = geometry.attributes.color;
    const F32A_pos = attr_pos.array;
    const F32A_clr = attr_clr.array;

    // const compByDist = (a, b) => {
    //     const dxA = a[0] - camera.position.x;
    //     const dyA = a[1] - camera.position.y;
    //     const dzA = a[2] - camera.position.z;
      
    //     const dxB = b[0] - camera.position.x;
    //     const dyB = b[1] - camera.position.y;
    //     const dzB = b[2] - camera.position.z;
      
    //     const distA = dxA * dxA + dyA * dyA + dzA * dzA;
    //     const distB = dxB * dxB + dyB * dyB + dzB * dzB;
      
    //     // reversed from distA - distB so points further away are rendered first for transparency sorting
    //     return distB - distA;
    //   }; // This was part of first attempt

    // const sortPoints = () => {
    //     data.sort(compByDist);
    //     for(let i = 0; i < existingPositions.length / 3; i++) {
    //         F32A_pos.set(data[i].slice(0,3), i*3);
    //         F32A_clr.set(data[i].slice(3), i*3);
    //         attr_pos.needsUpdate = true;
    //         attr_clr.needsUpdate = true;
    //     }
    //   };  // This was first attempt, average ~1810 milliseconds run time

    // const sortPoints = () => {
    //     let indexedDistances = [];
    //     for (let i = 0; i < data.length; i++) {
    //         const dx = data[i][0] - camera.position.x;
    //         const dy = data[i][1] - camera.position.y;
    //         const dz = data[i][2] - camera.position.z;
    //         indexedDistances.push([dx * dx + dy * dy + dz * dz, i]);
    //     }
    //     indexedDistances.sort((a, b) => b[0] - a[0]);  // sort in descending order
    //     for(let i = 0; i < indexedDistances.length; i++) {
    //         const idx = indexedDistances[i][1];
    //         F32A_pos.set(data[idx].slice(0,3), i*3);
    //         F32A_clr.set(data[idx].slice(3), i*3);
    //         attr_pos.needsUpdate = true;
    //         attr_clr.needsUpdate = true;
    //     }
    // }; // This was second attempt, average ~1467 millisecond run time


    const sortPoints = () => {
        let indexedDistances = data.map((value, index) => {
            const dx = value[0] - camera.position.x;
            const dy = value[1] - camera.position.y;
            const dz = value[2] - camera.position.z;
            return [dx * dx + dy * dy + dz * dz, index];
        });
        
        indexedDistances.sort((a, b) => b[0] - a[0]);  // sort in descending order

        for(let i = 0; i < indexedDistances.length; i++) {
            const idx = indexedDistances[i][1];
            F32A_pos[i*3] = data[idx][0];
            F32A_pos[i*3 + 1] = data[idx][1];
            F32A_pos[i*3 + 2] = data[idx][2];
            F32A_clr[i*3] = data[idx][3];
            F32A_clr[i*3 + 1] = data[idx][4];
            F32A_clr[i*3 + 2] = data[idx][5];
        }

        attr_pos.needsUpdate = true;
        attr_clr.needsUpdate = true;
    };
    
    // const bucketSortPoints = () => {
    //     // Compute distances and find min and max.
    //     const distances = [];
    //     let minDist = Infinity;
    //     let maxDist = -Infinity;
    //     for (let i = 0; i < data.length; i++) {
    //         const dx = data[i][0] - camera.position.x;
    //         const dy = data[i][1] - camera.position.y;
    //         const dz = data[i][2] - camera.position.z;
    //         const dist = dx * dx + dy * dy + dz * dz;
    //         distances.push(dist);
    //         minDist = Math.min(minDist, dist);
    //         maxDist = Math.max(maxDist, dist);
    //     }
        
    //     // Create buckets.
    //     const numBuckets = 10;  //Math.floor(Math.sqrt(data.length)); // A good number of buckets for uniformly distributed data.
    //     const bucketSize = (maxDist - minDist) / numBuckets;
    //     console.log('number of buckets: ' + numBuckets + 'bucket size: ' + bucketSize);
    //     const buckets = new Array(numBuckets).fill(null).map(() => []);
        
    //     // Assign each point to a bucket.
    //     for (let i = 0; i < data.length; i++) {
    //         const b = Math.min(numBuckets - 1, Math.floor((distances[i] - minDist) / bucketSize));
    //         buckets[b].push(i);
    //     }
        
    //     // Sort each bucket and copy back to the position and color arrays.
    //     let globalIndex = 0;
    //     for (const bucket of buckets) {
    //         bucket.sort((i, j) => distances[j] - distances[i]);
    //         for (let i = 0; i < bucket.length; i++) {
    //             F32A_pos.set(data[bucket[i]].slice(0,3), globalIndex*3);
    //             F32A_clr.set(data[bucket[i]].slice(3), globalIndex*3);
    //             globalIndex++;
    //         }
    //     }
        
    //     attr_pos.needsUpdate = true;
    //     attr_clr.needsUpdate = true;
    // };
    //  // Fourth attempt, this time with bucket sorting.
    // // it makes cool sphere pattern!



    const points = new THREE.Points( geometry, translucentMaterial );

    scene.add( points );

    const render = () => {
        // sortPoints();
        requestAnimationFrame(render);
        renderer.render(scene, camera);
    };

    const orbitControls = new OrbitControls(camera, renderer.domElement);

    // Log camera position and sort points by distance from camera (if required)
    var lastMove = 0;
    orbitControls.addEventListener( "change", event => {  
        // do nothing if last move was less than 1 second ago
        if(Date.now() - lastMove > 1000) {
                let start = Date.now();
                sortPoints();
                let end = Date.now();
                console.log('time of compute ', (end - start) ); 
            }
            lastMove = Date.now();
    } )

    render();

}
}

loadPly(defaultPlyFile);
