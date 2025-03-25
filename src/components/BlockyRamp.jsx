import React, { useMemo } from "react";
import * as THREE from "three";

function BlockyRamp({ position = [0, 0, 0], rotation = 0, scale = [4, 2, 8] }) {
  // Create wood texture
  const woodTexture = useMemo(() => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const size = 256;
    canvas.width = size;
    canvas.height = size;

    // Base color
    ctx.fillStyle = "#B27D51";
    ctx.fillRect(0, 0, size, size);

    // Add wood grain
    for (let i = 0; i < 24; i++) {
      const y = i * (size / 24);
      const width = 2 + Math.random() * 3;
      const colorShift = -15 + Math.random() * 30;
      
      // Create darker grain lines
      ctx.fillStyle = adjustColor("#B27D51", colorShift);
      ctx.fillRect(0, y, size, width);
    }

    // Add some noise for texture
    for (let i = 0; i < 1000; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const brightness = -10 + Math.random() * 20;
      
      ctx.fillStyle = adjustColor("#B27D51", brightness);
      ctx.fillRect(x, y, 1, 1);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }, []);

  // Helper function to adjust color brightness
  function adjustColor(color, amount) {
    const hex = color.replace("#", "");
    const r = Math.max(0, Math.min(255, parseInt(hex.substring(0, 2), 16) + amount));
    const g = Math.max(0, Math.min(255, parseInt(hex.substring(2, 4), 16) + amount));
    const b = Math.max(0, Math.min(255, parseInt(hex.substring(4, 6), 16) + amount));
    return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
  }

  // Create a simple blocky ramp shape using a custom geometry
  const rampGeometry = useMemo(() => {
    // Define the vertices for a rectangular ramp shape
    const vertices = [
      // Bottom face (4 corners)
      new THREE.Vector3(-0.5, 0, -0.5),  // Bottom left back
      new THREE.Vector3(0.5, 0, -0.5),   // Bottom right back
      new THREE.Vector3(0.5, 0, 0.5),    // Bottom right front
      new THREE.Vector3(-0.5, 0, 0.5),   // Bottom left front
      
      // Top face (4 corners, but with higher back edge)
      new THREE.Vector3(-0.5, 1, -0.5),  // Top left back
      new THREE.Vector3(0.5, 1, -0.5),   // Top right back
      new THREE.Vector3(0.5, 0, 0.5),    // Top right front (at ground level)
      new THREE.Vector3(-0.5, 0, 0.5),   // Top left front (at ground level)
    ];

    // Create faces from vertices (triangles)
    const indices = [
      // Bottom face
      0, 1, 2,
      0, 2, 3,
      
      // Top face 
      4, 6, 5,
      4, 7, 6,
      
      // Front face (rectangular)
      3, 2, 6,
      3, 6, 7,
      
      // Back face (rectangular)
      0, 4, 5,
      0, 5, 1,
      
      // Left face (rectangular)
      0, 3, 7,
      0, 7, 4,
      
      // Right face (rectangular)
      1, 5, 6,
      1, 6, 2
    ];

    // Create the geometry
    const geometry = new THREE.BufferGeometry();
    
    // Set positions from vertices
    const positions = new Float32Array(vertices.length * 3);
    for (let i = 0; i < vertices.length; i++) {
      positions[i * 3] = vertices[i].x;
      positions[i * 3 + 1] = vertices[i].y;
      positions[i * 3 + 2] = vertices[i].z;
    }
    
    // Set indices
    geometry.setIndex(indices);
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    // Calculate normals
    geometry.computeVertexNormals();
    
    return geometry;
  }, []);

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh 
        geometry={rampGeometry}
        scale={scale}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial
          map={woodTexture}
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>
    </group>
  );
}

export default BlockyRamp; 