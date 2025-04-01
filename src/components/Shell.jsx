import React, { useRef, useEffect } from "react";
import * as THREE from "three";
import { useAudio } from "../contexts/AudioContext";

function Shell({ position = [0, 0, 0], rotation = 0, color = "green" }) {
  const shell = useRef();
  const scale = 0.25;

  const { playSoundEffect } = useAudio();

  useEffect(() => {
    return () => {
      playSoundEffect("itemHit");
    };
  }, [playSoundEffect]);

  useEffect(() => {
    if (!shell.current) return;

    const group = shell.current;
    group.clear();

    // Top half (colored)
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
      color: new THREE.Color(
        color === "red" ? 0.4 : 0.05,
        color === "red" ? 0.05 : 0.4,
        0.05
      ),
      metalness: 0.3,
      roughness: 0.7,
    });
    const topHalf = new THREE.Mesh(topHalfGeometry, topHalfMaterial);
    topHalf.position.y = 0;
    group.add(topHalf);

    // Bottom half (white for green shells, yellow for red shells)
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
      color: new THREE.Color(
        1,
        color === "red" ? 0.8 : 1,
        color === "red" ? 0.2 : 1
      ),
      metalness: 0.1,
      roughness: 0.8,
    });
    const bottomHalf = new THREE.Mesh(bottomHalfGeometry, bottomHalfMaterial);
    bottomHalf.position.y = 0;
    group.add(bottomHalf);

    group.position.set(position[0], position[1], position[2]);
    group.rotation.y = rotation;
    group.scale.set(scale, scale, scale);
  }, [position, rotation, scale, color]);

  return <group ref={shell} />;
}

export default Shell;
