import React, { useRef, useEffect } from 'react';
import { useLoader } from '@react-three/fiber';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import * as THREE from 'three';
import { BANANA_COLLISION_RADIUS } from '../constants';
import { Group, Mesh, Material, MeshStandardMaterial } from 'three';

interface BananaProps {
  position: [number, number, number] | { x: number, y: number, z: number };
  rotation: number;
  onExpire: () => void;
  showCollisionRadius?: boolean;
}

const Banana: React.FC<BananaProps> = ({ position, rotation, onExpire, showCollisionRadius = false }) => {
  const banana = useRef<Group>(null);
  const creationTime = useRef<number>(Date.now());
  
  // Load the banana model
  const materials = useLoader(MTLLoader, '/banana-racer/assets/item-banana.mtl');
  const bananaModel = useLoader(OBJLoader, '/banana-racer/assets/item-banana.obj', (loader) => {
    materials.preload();
    loader.setMaterials(materials);
  });
  
  // Clone the model so we can modify it
  const model = bananaModel.clone();
  
  // Apply a yellow color to the banana
  model.traverse((child) => {
    if ((child as Mesh).isMesh) {
      const mesh = child as Mesh;
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach(material => {
          if (material instanceof THREE.Material && 'color' in material) {
            (material as any).color = new THREE.Color(0xf7e660); // Banana yellow
          }
        });
      } else if (mesh.material) {
        const mat = mesh.material as MeshStandardMaterial;
        if (mat.color) {
          mat.color.set(0xf7e660); // Banana yellow
        }
      }
    }
  });
  
  // Set the initial position and rotation
  useEffect(() => {
    if (banana.current) {
      // Handle both position types (array or object)
      if (Array.isArray(position)) {
        banana.current.position.set(position[0], position[1], position[2]);
      } else {
        banana.current.position.set(position.x, position.y, position.z);
      }
      banana.current.rotation.y = rotation;
      
      // Set a timer to remove the banana after a certain time
      const timer = setTimeout(() => {
        if (onExpire) onExpire();
      }, 300000); // Banana disappears after 5 minutes
      
      return () => clearTimeout(timer);
    }
  }, [position, rotation, onExpire]);

  return (
    <group ref={banana}>
      <primitive 
        object={model} 
        scale={[0.6, 0.6, 0.6]} 
      />
      
      {/* Visualization of collision radius */}
      {showCollisionRadius && (
        <mesh>
          <sphereGeometry args={[BANANA_COLLISION_RADIUS, 16, 12]} />
          <meshBasicMaterial 
            color={0xff5500} 
            transparent={true} 
            opacity={0.15} 
            side={THREE.DoubleSide}
          />
          <mesh>
            <sphereGeometry args={[BANANA_COLLISION_RADIUS, 16, 12]} />
            <meshBasicMaterial 
              color={0xff0000}
              wireframe={true}
              transparent={true}
              opacity={0.4}
            />
          </mesh>
        </mesh>
      )}
    </group>
  );
};

export default Banana; 