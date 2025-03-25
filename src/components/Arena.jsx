import React from "react";
import * as THREE from "three";
import { ARENA_SIZE, BATTLE_BLOCKS } from "../lib/gameConfig";

const Arena = () => {
  const wallHeight = 5;
  const wallThickness = 1;
  const blockHeight = 2;

  const walls = [
    // North wall
    {
      position: [0, wallHeight / 2, -ARENA_SIZE / 2],
      scale: [ARENA_SIZE + wallThickness, wallHeight, wallThickness],
      rotation: [0, 0, 0],
      color: "#808080",
    },
    // South wall
    {
      position: [0, wallHeight / 2, ARENA_SIZE / 2],
      scale: [ARENA_SIZE + wallThickness, wallHeight, wallThickness],
      rotation: [0, 0, 0],
      color: "#808080",
    },
    // East wall
    {
      position: [ARENA_SIZE / 2, wallHeight / 2, 0],
      scale: [ARENA_SIZE + wallThickness, wallHeight, wallThickness],
      rotation: [0, Math.PI / 2, 0],
      color: "#808080",
    },
    // West wall
    {
      position: [-ARENA_SIZE / 2, wallHeight / 2, 0],
      scale: [ARENA_SIZE + wallThickness, wallHeight, wallThickness],
      rotation: [0, Math.PI / 2, 0],
      color: "#808080",
    },
  ];

  const blockColors = [
    "#00FFFF", // Cyan
    "#FFD700", // Gold
    "#00FF00", // Lime Green
    "#FF1493", // Deep Pink
  ];

  return (
    <group>
      {/* Ground with grid for better movement visibility */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[ARENA_SIZE, ARENA_SIZE]} />
        <meshStandardMaterial color="#A9A9A9" />
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

      {/* Battle Blocks */}
      {BATTLE_BLOCKS.positions.map((block, index) => (
        <mesh
          key={`block-${index}`}
          position={[block.x, blockHeight / 2, block.z]}
          scale={[BATTLE_BLOCKS.size, blockHeight, BATTLE_BLOCKS.size]}
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial 
            color={blockColors[index]} 
            roughness={0.3}
            metalness={0.7}
            emissive={blockColors[index]}
            emissiveIntensity={0.2}
          />
        </mesh>
      ))}
    </group>
  );
};

export default Arena;
