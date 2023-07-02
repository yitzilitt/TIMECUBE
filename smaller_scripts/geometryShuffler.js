import * as THREE from 'three';

export function shuffleGeometry(geometry) {
    const positionAttribute = geometry.attributes.position;
    const colorAttribute = geometry.attributes.color;
    const indices = Array.from({ length: positionAttribute.count }, (_, i) => i);
    
    // Shuffle indices
    for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
    }

    // Create new position and color attributes based on shuffled indices
    const newPositionAttribute = new THREE.BufferAttribute(new Float32Array(positionAttribute.count * 3), 3);
    const newColorAttribute = new THREE.BufferAttribute(new Float32Array(colorAttribute.count * 3), 3);
    for (let i = 0; i < indices.length; i++) {
        newPositionAttribute.setXYZ(i, positionAttribute.getX(indices[i]), positionAttribute.getY(indices[i]), positionAttribute.getZ(indices[i]));
        newColorAttribute.setXYZ(i, colorAttribute.getX(indices[i]), colorAttribute.getY(indices[i]), colorAttribute.getZ(indices[i]));
    }

    // Create a new geometry with the shuffled attributes
    const shuffledGeometry = new THREE.BufferGeometry();
    shuffledGeometry.setAttribute('position', newPositionAttribute);
    shuffledGeometry.setAttribute('color', newColorAttribute);

    return shuffledGeometry;
}
