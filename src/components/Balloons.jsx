import React, { useRef, useEffect, useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { starVertexShader, starFragmentShader } from "../shaders/star";

const floatingOffsets = [0.7, 0.5, 0.6];

const balloonOpacity = 0.8;
const floatingAmplitude = 0.0005;
const floatingSpeed = 2;
const balloonSpacing = 0.14;
const balloonScale = 0.075;
const balloonsVerticalOffset = 0.3;

function Balloons({ color, lives, isStarred = false }) {
  const balloonsGroup = useRef();
  const startTime = useRef(Date.now());

  // Create star shader material
  const starMaterial = useMemo(() => {
    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        texture1: { value: new THREE.Texture() }, // Empty texture since we don't need it for balloons
      },
      vertexShader: starVertexShader,
      fragmentShader: starFragmentShader,
      transparent: false,
    });
    return material;
  }, []);

  useFrame((state) => {
    if (!balloonsGroup.current) return;

    // Update shader time if starred
    if (isStarred && starMaterial) {
      const elapsed = Date.now() - startTime.current;
      starMaterial.uniforms.time.value = elapsed / 1000;
    }

    balloonsGroup.current.children.forEach((balloon, i) => {
      // Add gentle floating motion
      balloon.position.y +=
        Math.sin(state.clock.elapsedTime * floatingSpeed + floatingOffsets[i]) *
        floatingAmplitude;
    });
  });

  return (
    <group position={[0, 0.7, 0]}>
      <group ref={balloonsGroup}>
        {[...Array(lives)].map((_, index) => {
          // Calculate angle for outer balloons with more extreme angles
          const isCenter = index === Math.floor((lives - 1) / 2);
          const isLeftSide = index < Math.floor((lives - 1) / 2);

          // Calculate angle based on distance from center
          const distanceFromCenter = Math.abs(
            index - Math.floor((lives - 1) / 2)
          );
          const angleOffset = isCenter
            ? 0
            : isLeftSide
            ? 0.5 * distanceFromCenter
            : -0.5 * distanceFromCenter;

          // Add vertical offset for middle balloon when there are exactly 3 balloons
          const verticalOffset = lives === 3 && isCenter ? balloonScale : 0;

          return (
            <group
              key={index}
              position={[
                index * balloonSpacing - ((lives - 1) * balloonSpacing) / 2,
                -balloonsVerticalOffset + verticalOffset,
                0,
              ]}
              rotation={[0, 0, angleOffset]}
            >
              {/* Balloon body */}
              <mesh scale={[balloonScale, balloonScale * 1.2, balloonScale]}>
                <sphereGeometry args={[1, 24, 24]} />
                {isStarred ? (
                  <primitive object={starMaterial} />
                ) : (
                  <meshStandardMaterial
                    color={color}
                    metalness={0.1}
                    roughness={0.2}
                    emissive={color}
                    emissiveIntensity={0.2}
                    transparent
                    opacity={balloonOpacity}
                  />
                )}
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
                {isStarred ? (
                  <primitive object={starMaterial} />
                ) : (
                  <meshStandardMaterial
                    color={color}
                    metalness={0.3}
                    roughness={0.6}
                    transparent
                    opacity={balloonOpacity}
                  />
                )}
              </mesh>
            </group>
          );
        })}
      </group>
    </group>
  );
}

export default Balloons;
