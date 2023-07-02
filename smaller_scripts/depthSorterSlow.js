// Sorts points in a geometry by depth for transparency rendering
// Warning: this may be slow
import * as THREE from 'three';


export function depthSortGeometry(geometry, camera) {
    const positionAttribute = geometry.attributes.position;
    const colorAttribute = geometry.attributes.color;

    // Calculate the depth of each point relative to the camera
    const depthArray = Array.from({ length: positionAttribute.count }, (_, i) => {
        const position = new THREE.Vector3().fromBufferAttribute(positionAttribute, i);
        return camera.position.distanceTo(position);
    });

    // Get indices sorted by depth (in descending order)
    const indices = depthArray.map((depth, i) => i).sort((a, b) => depthArray[b] - depthArray[a]);

    // Create new position and color attributes based on sorted indices
    const newPositionAttribute = new THREE.BufferAttribute(new Float32Array(positionAttribute.count * 3), 3);
    const newColorAttribute = new THREE.BufferAttribute(new Float32Array(colorAttribute.count * 3), 3);
    for (let i = 0; i < indices.length; i++) {
        newPositionAttribute.setXYZ(i, positionAttribute.getX(indices[i]), positionAttribute.getY(indices[i]), positionAttribute.getZ(indices[i]));
        newColorAttribute.setXYZ(i, colorAttribute.getX(indices[i]), colorAttribute.getY(indices[i]), colorAttribute.getZ(indices[i]));
    }

    // Create a new geometry with the sorted attributes
    const sortedGeometry = new THREE.BufferGeometry();
    sortedGeometry.setAttribute('position', newPositionAttribute);
    sortedGeometry.setAttribute('color', newColorAttribute);

    return sortedGeometry;
}


// Returns a new geometry (`coloredGeometry`) where points are colored based on their existing order in the geometry
export function colorByOrder(geometry) {
    const positionAttribute = geometry.attributes.position;

    // Create a new color attribute based on existing order of points
    const newColorAttribute = new THREE.BufferAttribute(new Float32Array(positionAttribute.count * 3), 3);

    const startColor = new THREE.Color("red");
    const endColor = new THREE.Color("blue");

    for (let i = 0; i < positionAttribute.count; i++) {
        let color = startColor.clone().lerp(endColor, i / (positionAttribute.count - 1));
        newColorAttribute.setXYZ(i, color.r, color.g, color.b);
    }

    // Create a new geometry with the colored attribute
    const coloredGeometry = geometry.clone(); // Clone the original geometry
    coloredGeometry.setAttribute('color', newColorAttribute);

    return coloredGeometry;
}



// Get lossy cell-based aproximation of distance from camera
export function createNewGrid(geometry, cellSize) {
    let grid = {};
    const positionAttribute = geometry.attributes.position;

    for (let i = 0; i < positionAttribute.count; i++) {
        let vertex = new THREE.Vector3();
        vertex.fromBufferAttribute(positionAttribute, i);
        let cellCoords = vertex.clone().divideScalar(cellSize).floor();

        let cellKey = `${cellCoords.x},${cellCoords.y},${cellCoords.z}`;
        if (!grid[cellKey]) {
            grid[cellKey] = [];
        }
        grid[cellKey].push({index: i, position: vertex});
    }

    return grid;
}

export function lossyDepthSortGeometry(geometry, camera, cellSize = 10) { //cellSize originally 1
    const positionAttribute = geometry.attributes.position;
    const colorAttribute = geometry.attributes.color;

    //console.log('geometry: ', geometry, 'cell size: ', cellSize);

    // Create a spatial grid for the points
    const grid = createNewGrid(geometry, cellSize);

    // Calculate the depth of each cell relative to the camera
    const cellKeys = Object.keys(grid);
    const depthArray = cellKeys.map(cellKey => {
        const pointsInCell = grid[cellKey];
        const firstPointInCell = pointsInCell[0];
        return camera.position.distanceTo(firstPointInCell.position);
    });

    console.log('depthArray: ', depthArray);

    // Get cell keys sorted by depth (in descending order)
    const sortedCellKeys = cellKeys.sort((a, b) => {
        // Get the first point in each cell
        const pointA = grid[a][0];
        const pointB = grid[b][0];
    
        // Calculate the depth of each point
        const depthA = camera.position.distanceTo(pointA.position);
        const depthB = camera.position.distanceTo(pointB.position);
    
        // Compare the depths
        return depthB - depthA;
    });
    
    console.log('sortedCellKeys: ', sortedCellKeys);
    // Create new position and color attributes based on sorted cell keys
    const newPositionAttribute = new THREE.BufferAttribute(new Float32Array(positionAttribute.count * 3), 3);
    const newColorAttribute = new THREE.BufferAttribute(new Float32Array(colorAttribute.count * 3), 3);

    let i = 0;
    for (const cellKey of sortedCellKeys) {
        const pointsInCell = grid[cellKey];
        for (const point of pointsInCell) {
            newPositionAttribute.setXYZ(i, positionAttribute.getX(point.index), positionAttribute.getY(point.index), positionAttribute.getZ(point.index));
            newColorAttribute.setXYZ(i, colorAttribute.getX(point.index), colorAttribute.getY(point.index), colorAttribute.getZ(point.index));
            i++;
        }
    }

    // Create a new geometry with the sorted attributes
    const sortedGeometry = new THREE.BufferGeometry();
    sortedGeometry.setAttribute('position', newPositionAttribute);
    sortedGeometry.setAttribute('color', newColorAttribute);

    return sortedGeometry;
}


