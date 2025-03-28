import React, { useRef, useEffect } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

const GreenShell = ({ position = [0, 0, 0], rotation = 0, scale = 0.5 }) => {
  const shell = useRef();
  const rotationSpeed = 2;

  useFrame((state, delta) => {
    if (shell.current) {
      shell.current.rotation.z += delta * rotationSpeed;
    }
  });

  useEffect(() => {
    if (!shell.current) return;

    const group = shell.current;
    group.clear();

    const topShellGeometry = new THREE.SphereGeometry(0.4, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2);
    const topShellMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0.05, 0.4, 0.05),
      metalness: 0.3,
      roughness: 0.7,
    });
    const topShell = new THREE.Mesh(topShellGeometry, topShellMaterial);
    topShell.position.y = 0;
    group.add(topShell);

    const bottomShellGeometry = new THREE.SphereGeometry(0.4, 32, 32, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
    const bottomShellMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0.95, 0.9, 0.6),
      metalness: 0.1,
      roughness: 0.8,
    });
    const bottomShell = new THREE.Mesh(bottomShellGeometry, bottomShellMaterial);
    bottomShell.position.y = 0;
    group.add(bottomShell);

    const rimGeometry = new THREE.TorusGeometry(0.4, 0.04, 16, 32, Math.PI * 2);
    const rimMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.2,
      roughness: 0.5,
    });

    const rimTop = new THREE.Mesh(rimGeometry, rimMaterial);
    rimTop.rotation.x = Math.PI / 2;
    rimTop.rotation.z = Math.PI / 6;
    rimTop.scale.x = 0.7;
    group.add(rimTop);

    const rimBottom = new THREE.Mesh(rimGeometry, rimMaterial);
    rimBottom.rotation.x = Math.PI / 2;
    rimBottom.rotation.z = -Math.PI / 6;
    rimBottom.scale.x = 0.7;
    group.add(rimBottom);

    const eyeGeometry = new THREE.SphereGeometry(0.08, 16, 16);
    const eyeMaterial = new THREE.MeshStandardMaterial({
      color: 0x000000,
      metalness: 0,
      roughness: 1,
    });
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    
    leftEye.position.set(-0.15, 0, 0.3);
    rightEye.position.set(0.15, 0, 0.3);
    
    group.add(leftEye);
    group.add(rightEye);

    const shellPatternGeometry = new THREE.CircleGeometry(0.35, 6);
    const shellPatternMaterial = new THREE.LineBasicMaterial({ color: 0x003300, linewidth: 2 });
    const shellPattern = new THREE.LineSegments(
      new THREE.EdgesGeometry(shellPatternGeometry),
      shellPatternMaterial
    );
    shellPattern.rotation.x = -Math.PI / 2;
    shellPattern.position.y = 0.2;
    group.add(shellPattern);

    group.position.set(position[0], position[1], position[2]);
    group.rotation.y = rotation;
    group.scale.set(scale, scale, scale);
  }, [position, rotation, scale]);

  return <group ref={shell} />;
};

export default GreenShell; 