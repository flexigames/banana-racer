import React, { useMemo } from "react";
import * as THREE from "three";
import { getBlockMaterial } from "../lib/textures";

function BlockyRamp({ position = [0, 0, 0], rotation = 0, scale = [4, 2, 8] }) {
  // Create a simple blocky ramp shape using a custom geometry
  const rampGeometry = useMemo(() => {
    // Define the vertices for a rectangular ramp shape
    const vertices = [
      // Bottom face (4 corners)
      new THREE.Vector3(-0.5, 0, -0.5), // Bottom left back
      new THREE.Vector3(0.5, 0, -0.5), // Bottom right back
      new THREE.Vector3(0.5, 0, 0.5), // Bottom right front
      new THREE.Vector3(-0.5, 0, 0.5), // Bottom left front

      // Top face (4 corners, but with higher back edge)
      new THREE.Vector3(-0.5, 1, -0.5), // Top left back
      new THREE.Vector3(0.5, 1, -0.5), // Top right back
      new THREE.Vector3(0.5, 0, 0.5), // Top right front (at ground level)
      new THREE.Vector3(-0.5, 0, 0.5), // Top left front (at ground level)
    ];

    // Create faces from vertices (triangles)
    const indices = [
      // Bottom face
      0, 1, 2, 0, 2, 3,

      // Top face
      4, 6, 5, 4, 7, 6,

      // Front face (rectangular)
      3, 2, 6, 3, 6, 7,

      // Back face (rectangular)
      0, 4, 5, 0, 5, 1,

      // Left face (rectangular)
      0, 3, 7, 0, 7, 4,

      // Right face (rectangular)
      1, 5, 6, 1, 6, 2,
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

    const uvs = [
      // UVs matching each vertex
      // Bottom face
      0,
      0, // vertex 0
      1,
      0, // vertex 1
      1,
      1, // vertex 2
      0,
      1, // vertex 3

      // Top face
      0,
      0, // vertex 4
      1,
      0, // vertex 5
      1,
      1, // vertex 6
      0,
      1, // vertex 7
    ];

    // Set indices
    geometry.setIndex(indices);
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute(
      "uv",
      new THREE.BufferAttribute(new Float32Array(uvs), 2)
    );

    // Calculate normals
    geometry.computeVertexNormals();

    return geometry;
  }, []);

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh geometry={rampGeometry} scale={scale}>
        <primitive object={getBlockMaterial('gray')} />
      </mesh>
    </group>
  );
}

export default BlockyRamp;
