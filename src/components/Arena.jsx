import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { SKYBOX_TEXTURE, WALL_TEXTURE, GROUND_TEXTURE } from "../lib/textures";
import { blocks, mapSize } from "../lib/map";

const Arena = () => {
  const groundRef = useRef();
  const blockColor = "#fa5858";

  useEffect(() => {
    if (groundRef.current) {
      const groundMaterial = new THREE.MeshStandardMaterial({
        map: GROUND_TEXTURE,
        roughness: 0.8,
        metalness: 0.2,
      });
      groundMaterial.map.repeat.set(mapSize.width / 4, mapSize.height / 4);
      groundRef.current.material = groundMaterial;
    }
  }, [mapSize]);

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
        <planeGeometry args={[mapSize.width, mapSize.height]} />
        <meshStandardMaterial color="#A9A9A9" />
      </mesh>

      {/* Walls from map */}
      {blocks.map((block, index) => {
        // Adjust position to have origin at bottom middle
        const adjustedPosition = [
          block.position.x,
          block.position.y + block.size.y / 2, // Move up by half the height
          block.position.z,
        ];

        return (
          <mesh
            key={`wall-${index}`}
            position={adjustedPosition}
            rotation={block.rotation}
            scale={[block.size.x, block.size.y, block.size.z]}
          >
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial
              color={blockColor}
              roughness={0.7}
              metalness={0.2}
              map={WALL_TEXTURE}
            />
          </mesh>
        );
      })}
    </group>
  );
};

export default Arena;
