import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { ARENA_SIZE, BATTLE_BLOCKS } from "../lib/gameConfig";

const Arena = () => {
  const wallHeight = 2;
  const wallThickness = 1;
  const blockHeight = 2;
  const groundRef = useRef();
  const wallColor = "#fa5858";

  const walls = [
    // North wall
    {
      position: [0, wallHeight / 2, -ARENA_SIZE / 2],
      scale: [ARENA_SIZE + wallThickness, wallHeight, wallThickness],
      rotation: [0, 0, 0],
    },
    // South wall
    {
      position: [0, wallHeight / 2, ARENA_SIZE / 2],
      scale: [ARENA_SIZE + wallThickness, wallHeight, wallThickness],
      rotation: [0, 0, 0],
    },
    // East wall
    {
      position: [ARENA_SIZE / 2, wallHeight / 2, 0],
      scale: [ARENA_SIZE + wallThickness, wallHeight, wallThickness],
      rotation: [0, Math.PI / 2, 0],
    },
    // West wall
    {
      position: [-ARENA_SIZE / 2, wallHeight / 2, 0],
      scale: [ARENA_SIZE + wallThickness, wallHeight, wallThickness],
      rotation: [0, Math.PI / 2, 0],
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
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const tileSize = 64;
    canvas.width = tileSize;
    canvas.height = tileSize;

    // Draw tile pattern
    ctx.fillStyle = "#A9A9A9";
    ctx.fillRect(0, 0, tileSize, tileSize);

    // Draw tile lines
    ctx.strokeStyle = "#808080";
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, tileSize, tileSize);
    ctx.strokeRect(tileSize / 2, 0, tileSize / 2, tileSize);
    ctx.strokeRect(0, tileSize / 2, tileSize, tileSize / 2);

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

  // Create brick texture
  const createBrickTexture = (baseColor) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const brickWidth = 200;
    const brickHeight = 150;
    const mortarThickness = 9;
    const numBricksX = 2;
    const numBricksY = 2;

    canvas.width = brickWidth * numBricksX;
    canvas.height = brickHeight * numBricksY;

    // Draw background (mortar color)
    ctx.fillStyle = "#808080";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw brick pattern with multiple offsets
    ctx.fillStyle = baseColor;

    for (let y = 0; y < numBricksY; y++) {
      const rowOffset = (y % 3) * (brickWidth / 3);

      for (let x = -1; x < numBricksX + 1; x++) {
        ctx.fillRect(
          ((x * brickWidth + rowOffset) % canvas.width) + mortarThickness,
          y * brickHeight + mortarThickness,
          brickWidth - mortarThickness * 2,
          brickHeight - mortarThickness * 2
        );

        const brickX =
          ((x * brickWidth + rowOffset) % canvas.width) + mortarThickness;
        const brickY = y * brickHeight + mortarThickness;

        // Add shading to create depth
        const gradient = ctx.createLinearGradient(
          brickX,
          brickY,
          brickX,
          brickY + brickHeight - mortarThickness * 2
        );
        gradient.addColorStop(0, adjustColor(baseColor, 20));
        gradient.addColorStop(1, adjustColor(baseColor, -20));
        ctx.fillStyle = gradient;
        ctx.fillRect(
          brickX,
          brickY,
          brickWidth - mortarThickness * 2,
          brickHeight - mortarThickness * 2
        );

        // Add highlight line
        ctx.strokeStyle = adjustColor(baseColor, 30);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(brickX + 2, brickY + 2);
        ctx.lineTo(brickX + brickWidth - mortarThickness * 2 - 2, brickY + 2);
        ctx.stroke();
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(6, 6);

    return texture;
  };

  // Create wall texture once and reuse
  const createWallTexture = () => {
    const texture = createBrickTexture("#A0A0A0");
    // Don't set repeat here as it will be set per wall
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  };

  const wallBrickTexture = createWallTexture();

  // Helper function to adjust color brightness
  function adjustColor(color, amount) {
    const hex = color.replace("#", "");
    const r = Math.max(
      0,
      Math.min(255, parseInt(hex.substring(0, 2), 16) + amount)
    );
    const g = Math.max(
      0,
      Math.min(255, parseInt(hex.substring(2, 4), 16) + amount)
    );
    const b = Math.max(
      0,
      Math.min(255, parseInt(hex.substring(4, 6), 16) + amount)
    );
    return `#${r.toString(16).padStart(2, "0")}${g
      .toString(16)
      .padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
  }

  return (
    <group>
      {/* Ground with grid for better movement visibility */}
      <mesh
        ref={groundRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
      >
        <planeGeometry args={[ARENA_SIZE, ARENA_SIZE]} />
        <meshStandardMaterial color="#A9A9A9" />
      </mesh>

      {/* Walls */}
      {walls.map((wall, index) => {
        // Clone the texture for each wall to have independent repeat settings
        const wallTexture = wallBrickTexture.clone();
        // Set repeat based on wall dimensions
        // The scale[0] is width, scale[1] is height
        wallTexture.repeat.set(wall.scale[0] / 2, wall.scale[1] / 2);
        
        return (
          <mesh
            key={`wall-${index}`}
            position={wall.position}
            rotation={wall.rotation}
            scale={wall.scale}
          >
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial
              color={wallColor}
              roughness={0.7}
              metalness={0.2}
              map={wallTexture}
            />
          </mesh>
        );
      })}

      {/* Battle Blocks */}
      {BATTLE_BLOCKS.positions.map((block, index) => {
        const baseColor = blockColors[index];
        const brickTexture = createBrickTexture(baseColor);

        return (
          <mesh
            key={`block-${index}`}
            position={[block.x, blockHeight / 2, block.z]}
            scale={[BATTLE_BLOCKS.size, blockHeight, BATTLE_BLOCKS.size]}
          >
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial
              color={baseColor}
              roughness={0.5}
              metalness={0.3}
              emissive={baseColor}
              emissiveIntensity={0.2}
              map={brickTexture}
            />
          </mesh>
        );
      })}
    </group>
  );
};

export default Arena;
