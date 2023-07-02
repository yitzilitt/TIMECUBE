import * as THREE from 'three';

/**
 * Given the four points of a plane and the number of segments to divide the plane into,
 * this function will calculate the centers of each of these segments.
 * 
 * @param {Array.<Array.<number>>} points - An array of four points, each an array of three numbers (x,y,z). 
 *                                          The point p1 is considered to be the reference point or origin for the width and height vectors.
 *                                          The order of points matter: p2 should be along the width and p4 should be along the height with respect to p1. 
 *                                          p3 diagonal point from p1 which is used to form a 2D plane, and isn't used in the calculation.
 * @param {Array.<number>} segments - An array of two integers, the first one representing 
 *                                    the number of segments along the width of the plane,
 *                                    and the second one representing the number of segments 
 *                                    along the height of the plane.
 * @returns {Array.<Array.<number>>} An array of points, each an array of three numbers (x,y,z),
 *                                   representing the centers of each segment.
 */
function calculateSegmentCenters(points, segments) {
    // Extract points
    const [p1, p2, p3, p4] = points;
  
    // Extract segments
    const [widthSegments, heightSegments] = segments;
  
    // Calculate the vectors representing the width and height of the plane
    const widthVector = [
      (p2[0] - p1[0]) / widthSegments,
      (p2[1] - p1[1]) / widthSegments,
      (p2[2] - p1[2]) / widthSegments
    ];
  
    const heightVector = [
      (p4[0] - p1[0]) / heightSegments,
      (p4[1] - p1[1]) / heightSegments,
      (p4[2] - p1[2]) / heightSegments
    ];
  
    // Initialize the centers array
    const centers = [];
  
    // Iterate over each segment
    for (let i = 0; i < widthSegments; i++) {
      for (let j = 0; j < heightSegments; j++) {
  
        // Calculate the center of the current segment
        const center = [
          p1[0] + (i + 0.5) * widthVector[0] + (j + 0.5) * heightVector[0],
          p1[1] + (i + 0.5) * widthVector[1] + (j + 0.5) * heightVector[1],
          p1[2] + (i + 0.5) * widthVector[2] + (j + 0.5) * heightVector[2]
        ];
  
        // Add the center to the centers array
        centers.push(center);
      }
    }
  
    // Return the centers array
    return centers;
  }

export {calculateSegmentCenters};


//calculateSegmentCenters([[0, 0, 0], [1,1,1], [], [1,2,1]], [3, 4])  // example function call



// /**
//  * Given a THREE.PlaneGeometry object, this function will calculate the four corner
//  * points of the plane in 3D space, taking into account any transformations applied to the mesh.
//  *
//  * @param {THREE.Mesh} mesh - The mesh object containing the PlaneGeometry.
//  * @returns {Array.<Array.<number>>} An array of three points, each an array of three numbers (x,y,z),
//  *                                   representing the corners of the plane in global coordinates.
//  */
// function getPlaneGeometryCorners(mesh) {
//   // Get the PlaneGeometry from the mesh
//   const geometry = mesh.geometry;

//   // Make sure the geometry's matrixWorld is up-to-date
//   //mesh.updateMatrixWorld();

//   // The vertices of a PlaneGeometry in its local space are as follows:
//   // v1: (-width/2, -height/2, 0)
//   // v2: ( width/2, -height/2, 0)
//   // v3: ( width/2,  height/2, 0)
//   // v4: (-width/2,  height/2, 0)
//   const corners = [
//     new THREE.Vector3(-geometry.parameters.width / 2, -geometry.parameters.height / 2, 0),
//     new THREE.Vector3( geometry.parameters.width / 2, -geometry.parameters.height / 2, 0),
//     new THREE.Vector3( geometry.parameters.width / 2,  geometry.parameters.height / 2, 0),
//     // new THREE.Vector3(-geometry.parameters.width / 2,  geometry.parameters.height / 2, 0)
//   ];

//   // Transform the corners to world coordinates
//   for (let i = 0; i < corners.length; i++) {
//     corners[i].applyMatrix4(mesh.matrixWorld);
//   }

//   // Convert the Vector3s to arrays and return
//   return corners.map(corner => [corner.x, corner.y, corner.z]);
// }


// export {getPlaneGeometryCorners};



function getPlaneCorners(plane, bbox) {
  // Define plane corners in local space
  let geometry = plane.geometry;
  let width = geometry.parameters.width;
  let height = geometry.parameters.height;
  let halfWidth = width / 2;
  let halfHeight = height / 2;
  let cornersLocal = [
      new THREE.Vector3(halfWidth, halfHeight, 0),
      new THREE.Vector3(-halfWidth, halfHeight, 0),
      new THREE.Vector3(halfWidth, -halfHeight, 0),
  ];

  // Update plane's world matrix
  plane.updateMatrixWorld(true);

  // Transform the corners to the world space
  let corners = cornersLocal.map(corner => corner.applyMatrix4(plane.matrixWorld));

  // Normalize the corners according to the bounding box
  corners = corners.map(corner => {
      let x = (corner.x - bbox.min.x) / (bbox.max.x - bbox.min.x);
      let y = (corner.y - bbox.min.y) / (bbox.max.y - bbox.min.y);
      let z = (corner.z - bbox.min.z) / (bbox.max.z - bbox.min.z);

      // // flip the x-axis if the bounding box is oriented the other way
      // if (bbox.max.x < bbox.min.x) {x = 1 - x};

      //flip the x and z axis, to correct for current issue in 3D renderer
      x = 1 - x;
      y = 1 - y;
      z = 1 - z;

      const coords = [(x * 100), (y * 100), (z * 100)];
      return coords;

      // return new THREE.Vector3(x * 100, y * 100, z * 100);
  });

  // console.log('bbox.max.x - bbox.min.x', bbox.max.x - bbox.min.x);
  return corners;
}

export {getPlaneCorners};
