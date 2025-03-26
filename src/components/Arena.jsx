import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { SKYBOX_TEXTURE, WALL_TEXTURE, GROUND_TEXTURE } from "../lib/textures";
import { blocks, ramps, mapSize } from "../lib/map";

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
          block.position.y + block.size.y / 2,
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

      {/* Ramps from map */}
      {ramps.map((ramp, index) => {
        // Create a custom geometry for the ramp
        const rampGeometry = new THREE.BufferGeometry();
        
        // Define vertices for a ramp that goes up from left to right
        const vertices = new Float32Array([
          
          // Left face (low end)
          -0.5, 0, -0.5,    // bottom front
          -0.5, 0, 0.5,     // bottom back
          -0.5, 0, 0.5,     // top back
          -0.5, 0, -0.5,    // bottom front
          -0.5, 0, 0.5,     // top back
          -0.5, 0, -0.5,    // top front
          
          // Right face (high end)
          0.5, 0, -0.5,     // bottom front
          0.5, 0, 0.5,      // bottom back
          0.5, 4, 0.5,      // top back
          0.5, 0, -0.5,     // bottom front
          0.5, 4, 0.5,      // top back
          0.5, 4, -0.5,     // top front
          
          // Front face
          -0.5, 0, -0.5,    // left bottom
          0.5, 0, -0.5,     // right bottom
          0.5, 4, -0.5,     // right top
          -0.5, 0, -0.5,    // left bottom
          0.5, 4, -0.5,     // right top
          -0.5, 0, -0.5,    // left top
          
          // Back face
          -0.5, 0, 0.5,     // left bottom
          0.5, 0, 0.5,      // right bottom
          0.5, 4, 0.5,      // right top
          -0.5, 0, 0.5,     // left bottom
          0.5, 4, 0.5,      // right top
          -0.5, 0, 0.5,     // left top
          
          // Top face (sloped)
          -0.5, 0, -0.5,    // left front
          -0.5, 0, 0.5,     // left back
          0.5, 4, 0.5,      // right back
          -0.5, 0, -0.5,    // left front
          0.5, 4, 0.5,      // right back
          0.5, 4, -0.5,     // right front
        ]);

        rampGeometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        rampGeometry.computeVertexNormals();

        return (
          <mesh
            key={`ramp-${index}`}
            position={ramp.position}
            scale={[
              Math.abs(Math.cos(ramp.rotation)) * ramp.scale[0] + Math.abs(Math.sin(ramp.rotation)) * ramp.scale[2],
              ramp.scale[1],
              Math.abs(Math.sin(ramp.rotation)) * ramp.scale[0] + Math.abs(Math.cos(ramp.rotation)) * ramp.scale[2]
            ]}  
            rotation={[0, ramp.rotation, 0]}
            geometry={rampGeometry}
          >
            <meshStandardMaterial
              color="#8B4513"
              roughness={0.8}
              metalness={0.2}
              side={THREE.DoubleSide}
            />
          </mesh>
        );
      })}
    </group>
  );
};

export default Arena;
