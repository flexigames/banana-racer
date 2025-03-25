import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { ARENA_SIZE, BATTLE_BLOCKS } from "../lib/gameConfig";

const Arena = () => {
  const wallHeight = 5;
  const wallThickness = 1;
  const blockHeight = 2;
  const groundRef = useRef();

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

  // Create tile texture
  useEffect(() => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const tileSize = 64;
    canvas.width = tileSize;
    canvas.height = tileSize;

    // Draw tile pattern
    ctx.fillStyle = '#A9A9A9';
    ctx.fillRect(0, 0, tileSize, tileSize);

    // Draw tile lines
    ctx.strokeStyle = '#808080';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, tileSize, tileSize);
    ctx.strokeRect(tileSize/2, 0, tileSize/2, tileSize);
    ctx.strokeRect(0, tileSize/2, tileSize, tileSize/2);

    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(ARENA_SIZE / 4, ARENA_SIZE / 4);

    // Apply texture to ground material
    const groundMaterial = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.8,
      metalness: 0.2,
    });

    // Update ground material
    if (groundRef.current) {
      groundRef.current.material = groundMaterial;
    }

    return () => {
      texture.dispose();
    };
  }, []);

  return (
    <group>
      {/* Ground with grid for better movement visibility */}
      <mesh ref={groundRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
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
