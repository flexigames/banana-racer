import React from "react";
import * as THREE from "three";

export const ARENA_SIZE = 61;

const Arena = () => {
  const wallHeight = 5;
  const wallThickness = 1;

  const walls = [
    // North wall
    {
      position: [0, wallHeight / 2, -ARENA_SIZE / 2],
      scale: [ARENA_SIZE + wallThickness, wallHeight, wallThickness],
      rotation: [0, 0, 0],
      color: "#8B4513",
    },
    // South wall
    {
      position: [0, wallHeight / 2, ARENA_SIZE / 2],
      scale: [ARENA_SIZE + wallThickness, wallHeight, wallThickness],
      rotation: [0, 0, 0],
      color: "#8B4513",
    },
    // East wall
    {
      position: [ARENA_SIZE / 2, wallHeight / 2, 0],
      scale: [ARENA_SIZE + wallThickness, wallHeight, wallThickness],
      rotation: [0, Math.PI / 2, 0],
      color: "#8B4513",
    },
    // West wall
    {
      position: [-ARENA_SIZE / 2, wallHeight / 2, 0],
      scale: [ARENA_SIZE + wallThickness, wallHeight, wallThickness],
      rotation: [0, Math.PI / 2, 0],
      color: "#8B4513",
    },
  ];

  return (
    <group>
      {/* Ground with grid for better movement visibility */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[ARENA_SIZE, ARENA_SIZE]} />
        <meshStandardMaterial color="#4a7023" />
      </mesh>

      {/* Walls */}
      {walls.map((wall, index) => (
        <mesh
          key={`wall-${index}`}
          position={wall.position}
          rotation={wall.rotation}
          scale={wall.scale}
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color={wall.color} roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
};

export default Arena;
