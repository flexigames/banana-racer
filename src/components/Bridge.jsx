import React from "react";
import * as THREE from "three";

const Bridge = ({ position, scale = [1, 1, 1] }) => {
  return (
    <group position={position} rotation={[0, 0, 0]} scale={scale}>
      <mesh position={[0, 0.95, 0]}>
        <boxGeometry args={[1, 0.1, 1]} />
        <meshStandardMaterial color="#A9A9A9" roughness={0.8} metalness={0.2} />
      </mesh>
    </group>
  );
};

export default Bridge;
