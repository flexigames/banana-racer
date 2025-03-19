import React, { useMemo } from 'react';
import * as THREE from 'three';

// Component to add scattered elements to the ground for better movement reference
const ScatteredElements = () => {
  // Generate random positions for rocks
  const rocks = useMemo(() => {
    const elements = [];
    // Create 200 randomly positioned rocks
    for (let i = 0; i < 200; i++) {
      // Random position within a 100x100 area, but avoid the center area where players start
      let x, z;
      do {
        x = (Math.random() - 0.5) * 100;
        z = (Math.random() - 0.5) * 100;
      } while (Math.sqrt(x * x + z * z) < 10); // Keep away from center
      
      const scale = Math.random() * 0.3 + 0.1; // Random size between 0.1 and 0.4
      const rotation = Math.random() * Math.PI * 2; // Random rotation
      
      elements.push({
        position: [x, 0.05, z],
        scale: [scale, scale, scale],
        rotation: [0, rotation, 0],
        color: Math.random() > 0.5 ? '#6d6d6d' : '#8a8a8a', // Random gray shades
      });
    }
    return elements;
  }, []);
  
  // Generate patches of different grass colors
  const grassPatches = useMemo(() => {
    const patches = [];
    // Create 50 randomly positioned grass patches
    for (let i = 0; i < 50; i++) {
      // Random position within a 100x100 area
      const x = (Math.random() - 0.5) * 100;
      const z = (Math.random() - 0.5) * 100;
      
      const scale = Math.random() * 5 + 3; // Random size between 3 and 8
      const rotation = Math.random() * Math.PI * 2; // Random rotation
      
      patches.push({
        position: [x, 0.02, z],
        scale: [scale, 1, scale],
        rotation: [0, rotation, 0],
        color: Math.random() > 0.5 ? '#416319' : '#567d2c', // Different grass shades
      });
    }
    return patches;
  }, []);

  return (
    <group>
      {/* Render grass patches */}
      {grassPatches.map((patch, index) => (
        <mesh
          key={`grass-${index}`}
          position={patch.position}
          rotation={patch.rotation}
          scale={patch.scale}
        >
          <circleGeometry args={[1, 8]} />
          <meshStandardMaterial color={patch.color} />
        </mesh>
      ))}
      
      {/* Render rocks */}
      {rocks.map((rock, index) => (
        <mesh
          key={`rock-${index}`}
          position={rock.position}
          rotation={rock.rotation}
          scale={rock.scale}
        >
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color={rock.color} roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
};

export default ScatteredElements; 