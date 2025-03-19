import React, { useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useModelWithMaterials } from '../lib/loaders';

const RemotePlayer = ({ playerId, position, rotation }) => {
  const car = useRef();
  
  // Generate a color based on player ID
  const color = useMemo(() => {
    const hash = playerId.split('').reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);
    
    return new THREE.Color().setHSL(
      Math.abs(hash % 360) / 360,
      0.8,
      0.5
    );
  }, [playerId]);
  
  // Load the vehicle model directly
  const vehicleModel = useModelWithMaterials(
    '/assets/vehicle-racer.obj',
    '/assets/vehicle-racer.mtl'
  );
  
  // Create a cloned model with a unique color
  const coloredModel = useMemo(() => {
    if (!vehicleModel) return null;
    
    const clone = vehicleModel.clone();
    
    // Apply color to all materials
    clone.traverse((child) => {
      if (child.isMesh) {
        if (Array.isArray(child.material)) {
          child.material = child.material.map(mat => {
            const newMat = mat.clone();
            newMat.color.set(color);
            return newMat;
          });
        } else if (child.material) {
          child.material = child.material.clone();
          child.material.color.set(color);
        }
      }
    });
    
    return clone;
  }, [vehicleModel, color]);
  
  // Update position and rotation
  useEffect(() => {
    if (!car.current) return;
    car.current.position.set(position.x, position.y, position.z);
    car.current.rotation.y = rotation;
  }, [position, rotation]);
  
  if (!coloredModel) {
    return null;
  }
  
  return (
    <group ref={car} position={[position.x, position.y, position.z]}>
      <primitive 
        object={coloredModel} 
        scale={[0.5, 0.5, 0.5]} 
        rotation={[0, Math.PI, 0]} 
      />
    </group>
  );
};

export default RemotePlayer; 