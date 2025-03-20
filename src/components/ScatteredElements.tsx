import React, { useMemo } from 'react';
import * as THREE from 'three';
import seedrandom from 'seedrandom';

interface ScatteredElementsProps {
  count?: number;
  radius?: number;
}

interface ScatteredElement {
  position: [number, number, number];
  scale: [number, number, number];
  rotation: [number, number, number];
  color: string;
}

// Component to add scattered elements to the ground for better movement reference
const ScatteredElements: React.FC<ScatteredElementsProps> = ({ 
  count = 200, 
  radius = 100 
}) => {
  // Create seeded random number generator using seedrandom library
  const rng = useMemo(() => seedrandom('banana-racer-12345'), []);
  
  // Generate random positions for rocks
  const rocks = useMemo<ScatteredElement[]>(() => {
    const elements: ScatteredElement[] = [];
    // Create randomly positioned rocks
    for (let i = 0; i < count; i++) {
      // Random position within a radius area, but avoid the center area where players start
      let x: number, z: number;
      do {
        x = (rng() - 0.5) * radius;
        z = (rng() - 0.5) * radius;
      } while (Math.sqrt(x * x + z * z) < 10); // Keep away from center
      
      const scale = 0.1 + rng() * 0.3; // Random size between 0.1 and 0.4
      const rotation = rng() * Math.PI * 2; // Random rotation
      
      elements.push({
        position: [x, 0.05, z],
        scale: [scale, scale, scale],
        rotation: [0, rotation, 0],
        color: rng() > 0.5 ? '#6d6d6d' : '#8a8a8a', // Random gray shades
      });
    }
    return elements;
  }, [rng, count, radius]);
  
  // Generate walls for obstacles
  const walls = useMemo<ScatteredElement[]>(() => {
    const obstacles: ScatteredElement[] = [];
    // Create randomly positioned walls (25% of total count)
    const wallCount = Math.floor(count / 4);
    for (let i = 0; i < wallCount; i++) {
      // Random position within a radius area, but avoid the center area where players start
      let x: number, z: number;
      do {
        x = (rng() - 0.5) * radius;
        z = (rng() - 0.5) * radius;
      } while (Math.sqrt(x * x + z * z) < 15); // Keep away from center
      
      const width = 1 + rng() * 3; // Random width between 1 and 4
      const height = 0.5 + rng() * 1.5; // Random height between 0.5 and 2
      const depth = 1 + rng() * 3; // Random depth between 1 and 4
      
      // Only 0 or 90 degree rotations (in radians)
      const rotation = Math.PI / 2 * Math.floor(rng() * 2); // Either 0 or PI/2 (90 degrees)
      
      obstacles.push({
        position: [x, height / 2, z], // Position y at half height to sit on ground
        scale: [width, height, depth],
        rotation: [0, rotation, 0],
        color: rng() > 0.5 ? '#6b5034' : '#7d5c3c', // Brown shades for walls
      });
    }
    return obstacles;
  }, [rng, count, radius]);

  return (
    <group>
      {/* Render walls */}
      {walls.map((wall, index) => (
        <mesh
          key={`wall-${index}`}
          position={wall.position}
          rotation={wall.rotation}
          scale={wall.scale}
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color={wall.color} roughness={0.9} />
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