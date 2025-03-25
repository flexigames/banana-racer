import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { ARENA_SIZE, BATTLE_BLOCKS, RAMPS } from "../lib/gameConfig";
import BlockyRamp from "./BlockyRamp";
import {
  SKYBOX_TEXTURE,
  WALL_TEXTURE,
  GROUND_TEXTURE,
  BLOCK_COLORS,
  BLOCK_TEXTURES,
} from "../lib/textures";

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

  // Set up ground texture
  useEffect(() => {
    if (groundRef.current) {
      const groundMaterial = new THREE.MeshStandardMaterial({
        map: GROUND_TEXTURE,
        roughness: 0.8,
        metalness: 0.2,
      });
      groundMaterial.map.repeat.set(ARENA_SIZE / 4, ARENA_SIZE / 4);
      groundRef.current.material = groundMaterial;
    }
  }, []);

  return (
    <group>
      {/* Skybox */}
      <mesh>
        <sphereGeometry args={[500, 60, 40]} />
        <meshBasicMaterial
          side={THREE.BackSide}
          map={SKYBOX_TEXTURE}
          transparent={true}
        />
      </mesh>

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
        WALL_TEXTURE.repeat.set(wall.scale[0] / 2, wall.scale[1] / 2);

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
              map={WALL_TEXTURE}
            />
          </mesh>
        );
      })}

      {/* Battle Blocks */}
      {BATTLE_BLOCKS.positions.map((block, index) => {
        const baseColor = BLOCK_COLORS[index];
        const brickTexture = BLOCK_TEXTURES[index];

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

      {/* Blocky Ramps */}
      {RAMPS.map((ramp, index) => (
        <BlockyRamp
          key={`ramp-${index}`}
          position={ramp.position}
          rotation={ramp.rotation}
          scale={ramp.scale}
        />
      ))}
    </group>
  );
};

export default Arena;
