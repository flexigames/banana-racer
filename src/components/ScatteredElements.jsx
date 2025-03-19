import React, { useMemo } from 'react';
import * as THREE from 'three';

// Simple seeded random number generator
class SeededRandom {
  constructor(seed = 42) {
    this.seed = seed;
  }
  
  // Returns a random number between 0 and 1
  random() {
    const x = Math.sin(this.seed++) * 10000;
    return x - Math.floor(x);
  }
  
  // Returns a random number between min and max
  range(min, max) {
    return min + this.random() * (max - min);
  }
}

// Component to add scattered elements to the ground for better movement reference
const ScatteredElements = () => {
  // Create seeded random number generator to ensure all clients see the same elements
  const rng = useMemo(() => new SeededRandom(12345), []);
  
  // Generate random positions for rocks
  const rocks = useMemo(() => {
    const elements = [];
    // Create 200 randomly positioned rocks
    for (let i = 0; i < 200; i++) {
      // Random position within a 100x100 area, but avoid the center area where players start
      let x, z;
      do {
        x = (rng.random() - 0.5) * 100;
        z = (rng.random() - 0.5) * 100;
      } while (Math.sqrt(x * x + z * z) < 10); // Keep away from center
      
      const scale = rng.range(0.1, 0.4); // Random size between 0.1 and 0.4
      const rotation = rng.random() * Math.PI * 2; // Random rotation
      
      elements.push({
        position: [x, 0.05, z],
        scale: [scale, scale, scale],
        rotation: [0, rotation, 0],
        color: rng.random() > 0.5 ? '#6d6d6d' : '#8a8a8a', // Random gray shades
      });
    }
    return elements;
  }, [rng]);
  
  // Generate patches of different grass colors
  const grassPatches = useMemo(() => {
    const patches = [];
    // Create 50 randomly positioned grass patches
    for (let i = 0; i < 50; i++) {
      // Random position within a 100x100 area
      const x = (rng.random() - 0.5) * 100;
      const z = (rng.random() - 0.5) * 100;
      
      const scale = rng.range(3, 8); // Random size between 3 and 8
      const rotation = rng.random() * Math.PI * 2; // Random rotation
      
      patches.push({
        position: [x, 0.02, z],
        scale: [scale, 1, scale],
        rotation: [0, rotation, 0],
        color: rng.random() > 0.5 ? '#416319' : '#567d2c', // Different grass shades
      });
    }
    return patches;
  }, [rng]);

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