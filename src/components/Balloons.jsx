import React from "react";
import * as THREE from "three";

function Balloons({ color, lives }) {
  const balloonSpacing = 0.4;
  const balloonScale = 0.2;

  return (
    <group position={[0, 1.5, 0]}>
      {[...Array(lives)].map((_, index) => (
        <mesh
          key={index}
          position={[
            index * balloonSpacing - ((lives - 1) * balloonSpacing) / 2,
            -0.5,
            0,
          ]}
          scale={[balloonScale, balloonScale, balloonScale]}
        >
          <sphereGeometry args={[1, 16, 16]} />
          <meshStandardMaterial color={color} metalness={0.3} roughness={0.4} />
        </mesh>
      ))}
    </group>
  );
}

export default Balloons;
