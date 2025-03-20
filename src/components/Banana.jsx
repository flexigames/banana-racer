import React, { useRef, useEffect } from 'react';
import { useLoader } from '@react-three/fiber';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader';
import * as THREE from 'three';
import { BANANA_COLLISION_RADIUS } from '../constants';

const Banana = ({ position, rotation, onExpire, showCollisionRadius = false }) => {
  const banana = useRef();
  const creationTime = useRef(Date.now());
  
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
    if (child.isMesh) {
      if (Array.isArray(child.material)) {
        child.material.forEach(material => {
          material.color = new THREE.Color(0xf7e660); // Banana yellow
        });
      } else if (child.material) {
        child.material.color = new THREE.Color(0xf7e660); // Banana yellow
      }
    }
  });
  
  // Set the initial position and rotation
  useEffect(() => {
    if (banana.current) {
      banana.current.position.set(position.x, position.y, position.z);
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