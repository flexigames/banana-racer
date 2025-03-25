import React from 'react';
import * as THREE from 'three';

const Arena = () => {
  const arenaSize = 61;
  const wallHeight = 5;
  const wallThickness = 1;

  const walls = [
    // North wall
    {
      position: [0, wallHeight / 2, -arenaSize / 2],
      scale: [arenaSize + wallThickness, wallHeight, wallThickness],
      rotation: [0, 0, 0],
      color: '#8B4513',
    },
    // South wall
    {
      position: [0, wallHeight / 2, arenaSize / 2],
      scale: [arenaSize + wallThickness, wallHeight, wallThickness],
      rotation: [0, 0, 0],
      color: '#8B4513',
    },
    // East wall
    {
      position: [arenaSize / 2, wallHeight / 2, 0],
      scale: [arenaSize + wallThickness, wallHeight, wallThickness],
      rotation: [0, Math.PI / 2, 0],
      color: '#8B4513',
    },
    // West wall
    {
      position: [-arenaSize / 2, wallHeight / 2, 0],
      scale: [arenaSize + wallThickness, wallHeight, wallThickness],
      rotation: [0, Math.PI / 2, 0],
      color: '#8B4513',
    },
  ];

  return (
    <group>
      {/* Ground */}
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[arenaSize, arenaSize]} />
        <meshStandardMaterial color="#90EE90" roughness={0.8} />
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