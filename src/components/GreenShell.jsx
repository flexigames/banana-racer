import React, { useRef, useEffect } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

const GreenShell = ({ position = [0, 0, 0], rotation = 0 }) => {
  const shell = useRef();
  const scale = 0.35;

  useEffect(() => {
    if (!shell.current) return;

    const group = shell.current;
    group.clear();

    // Top half (green)
    const topHalfGeometry = new THREE.SphereGeometry(
      0.4,
      32,
      32,
      0,
      Math.PI * 2,
      0,
      Math.PI / 2
    );
    const topHalfMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0.05, 0.4, 0.05), // Green
      metalness: 0.3,
      roughness: 0.7,
    });
    const topHalf = new THREE.Mesh(topHalfGeometry, topHalfMaterial);
    topHalf.position.y = 0;
    group.add(topHalf);

    // Bottom half (white)
    const bottomHalfGeometry = new THREE.SphereGeometry(
      0.4,
      32,
      32,
      0,
      Math.PI * 2,
      Math.PI / 2,
      Math.PI / 2
    );
    const bottomHalfMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(1, 1, 1), // White
      metalness: 0.1,
      roughness: 0.8,
    });
    const bottomHalf = new THREE.Mesh(bottomHalfGeometry, bottomHalfMaterial);
    bottomHalf.position.y = 0;
    group.add(bottomHalf);

    group.position.set(position[0], position[1], position[2]);
    group.rotation.y = rotation;
    group.scale.set(scale, scale, scale);
  }, [position, rotation, scale]);

  return <group ref={shell} />;
};

export default GreenShell;
