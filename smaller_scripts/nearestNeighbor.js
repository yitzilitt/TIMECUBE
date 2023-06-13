import * as THREE from 'three';

// Function to divide 3D space into a 3D grid, with each cell containing
// the points that fall within its bounds.
// To find the nearest neighbor,
// just search the points in the same cell and the neighboring cells.
function createGrid(points, cellSize) {
    let grid = {};

    for (let i = 0; i < points.geometry.attributes.position.count; i++) {
        let vertex = new THREE.Vector3();
        vertex.fromBufferAttribute(points.geometry.attributes.position, i);
        let cellCoords = vertex.clone().divideScalar(cellSize).floor();

        let cellKey = `${cellCoords.x},${cellCoords.y},${cellCoords.z}`;
        if (!grid[cellKey]) {
            grid[cellKey] = [];
        }
        grid[cellKey].push({index: i, position: vertex});
    }

    return grid;
}

// Function to find nearest neighbor inside of grid
function findNearestNeighbor(grid, worldPos, cellSize) {
    let cellCoords = worldPos.clone().divideScalar(cellSize).floor();
    let closestVertexIndex = null;
    let minDistance = Infinity;

    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
            for (let dz = -1; dz <= 1; dz++) {
                let neighborCellKey = `${cellCoords.x+dx},${cellCoords.y+dy},${cellCoords.z+dz}`;
                if (grid[neighborCellKey]) {
                    for (let point of grid[neighborCellKey]) {
                        let distance = worldPos.distanceTo(point.position);
                        if (distance < minDistance) {
                            closestVertexIndex = point.index;
                            minDistance = distance;
                        }
                    }
                }
            }
        }
    }

    return closestVertexIndex;
}

export { createGrid, findNearestNeighbor };