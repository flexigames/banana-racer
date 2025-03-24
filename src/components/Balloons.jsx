import React, { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

const balloonOpacity = 0.8;

function Balloons({ color, lives }) {
  const balloonSpacing = 0.4;
  const balloonScale = 0.2;
  const balloonsGroup = useRef();

  useFrame((state) => {
    if (!balloonsGroup.current) return;

    balloonsGroup.current.children.forEach((balloon, i) => {
      // Add gentle floating motion
      balloon.position.y += Math.sin(state.clock.elapsedTime * 2 + i) * 0.002;

      // Add subtle swaying
      balloon.rotation.y =
        Math.sin(state.clock.elapsedTime * 0.5 + i * 0.5) * 0.1;
      balloon.rotation.x =
        Math.cos(state.clock.elapsedTime * 0.5 + i * 0.5) * 0.05;
    });
  });

  return (
    <group position={[0, 1.5, 0]}>
      <group ref={balloonsGroup}>
        {[...Array(lives)].map((_, index) => (
          <group
            key={index}
            position={[
              index * balloonSpacing - ((lives - 1) * balloonSpacing) / 2,
              -0.5,
              0,
            ]}
          >
            {/* Balloon body */}
            <mesh scale={[balloonScale, balloonScale * 1.2, balloonScale]}>
              <sphereGeometry args={[1, 24, 24]} />
              <meshStandardMaterial
                color={color}
                metalness={0.1}
                roughness={0.2}
                emissive={color}
                emissiveIntensity={0.2}
                transparent
                opacity={balloonOpacity}
              />
            </mesh>

            {/* Balloon knot */}
            <mesh
              position={[0, -1.3 * balloonScale, 0]}
              scale={[
                balloonScale * 0.3,
                balloonScale * 0.2,
                balloonScale * 0.3,
              ]}
            >
              <cylinderGeometry
                args={[0.2, 0.5, 1, 8, 1, true, 0, Math.PI * 2]}
              />
              <meshStandardMaterial
                color={color}
                metalness={0.3}
                roughness={0.6}
                transparent
                opacity={balloonOpacity}
              />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}

export default Balloons;
