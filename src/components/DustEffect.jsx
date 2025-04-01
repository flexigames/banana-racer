import React, { useRef, useEffect, useMemo } from "react";
import * as THREE from "three";

function DustEffect({ position }) {
  const dustRef = useRef();
  const positionRef = useRef(new THREE.Vector3());
  const animationFrameRef = useRef(null);
  const targetPosition = useRef(new THREE.Vector3());
  const particlePositions = useRef(new Float32Array(100 * 3));
  const particleOpacities = useRef(new Float32Array(100));
  const particleSpeeds = useRef(new Float32Array(100));
  const particleDeathHeights = useRef(new Float32Array(100));

  const particleGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const particleCount = 100;
    const positions = new Float32Array(particleCount * 3);
    const opacities = new Float32Array(particleCount);
    const speeds = new Float32Array(particleCount);
    const deathHeights = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 0.2;
      positions[i * 3 + 1] = Math.random() * 0.1;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 0.2;
      opacities[i] = 0.8;
      speeds[i] = 0.01 + (Math.random() - 0.5) * 0.005;
      deathHeights[i] = 0.2 + Math.random() * 0.1; // Random death height between 0.4 and 0.6
    }

    particlePositions.current = positions;
    particleOpacities.current = opacities;
    particleSpeeds.current = speeds;
    particleDeathHeights.current = deathHeights;
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("opacity", new THREE.BufferAttribute(opacities, 1));
    return geometry;
  }, []);

  const particleMaterial = useMemo(() => {
    return new THREE.PointsMaterial({
      color: 0xAAAAAA,
      size: 0.05,
      transparent: true,
      opacity: 0.5,
    });
  }, []);

  useEffect(() => {
    if (!dustRef.current) return;
    targetPosition.current.copy(position);
  }, [position]);

  useEffect(() => {
    if (!dustRef.current) return;

    const animate = (timestamp) => {
      // Smoothly update position
      positionRef.current.lerp(targetPosition.current, 0.05);

      // Update particle positions and opacities
      for (let i = 0; i < 100; i++) {
        const index = i * 3;
        const y = particlePositions.current[index + 1];
        
        // Reset particles individually when they reach their death height
        if (y > particleDeathHeights.current[i]) {
          particlePositions.current[index] = (Math.random() - 0.5) * 0.2;
          particlePositions.current[index + 1] = 0;
          particlePositions.current[index + 2] = (Math.random() - 0.5) * 0.2;
          particleOpacities.current[i] = 0.8;
          particleSpeeds.current[i] = 0.01 + (Math.random() - 0.5) * 0.005;
          particleDeathHeights.current[i] = 0.2 + Math.random() * 0.1;
        } else {
          // Use individual speed for each particle
          particlePositions.current[index + 1] += particleSpeeds.current[i];
          
          // Fade out based on height
          const fadeStart = 0.3;
          const fadeEnd = particleDeathHeights.current[i];
          if (y > fadeStart) {
            const fadeProgress = Math.min((y - fadeStart) / (fadeEnd - fadeStart), 1);
            particleOpacities.current[i] = 0.8 * (1 - fadeProgress);
          }
        }
      }

      // Update geometry with new positions and opacities
      dustRef.current.geometry.attributes.position.needsUpdate = true;
      dustRef.current.geometry.attributes.opacity.needsUpdate = true;
      dustRef.current.position.copy(positionRef.current);

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <points ref={dustRef} geometry={particleGeometry} material={particleMaterial} />
  );
}

export default DustEffect; 