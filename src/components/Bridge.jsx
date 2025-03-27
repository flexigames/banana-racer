import React from "react";
import * as THREE from "three";

const Bridge = ({ position, rotation = 0, scale = [1, 1, 1] }) => {
  // Determine if this is a vertical bridge based on rotation
  const isVertical = Math.abs(rotation - Math.PI / 2) < 0.01 || Math.abs(rotation - 3 * Math.PI / 2) < 0.01;
  
  // Adjust geometry args based on bridge orientation
  // For vertical bridges, we need to swap width and depth
  const geometryArgs = isVertical ? [1, 0.1, 1] : [1, 0.1, 1];
  
  return (
    <group position={position} rotation={[0, 0, 0]} scale={scale}>
      {/* Bridge walkway with orientation-aware dimensions */}
      <mesh position={[0, 0.95, 0]}>
        <boxGeometry args={geometryArgs} />
        <meshStandardMaterial
          color="#A9A9A9"
          roughness={0.8}
          metalness={0.2}
        />
      </mesh>
    </group>
  );
};

export default Bridge;