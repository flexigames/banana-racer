import React, { useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useModelWithMaterials } from '../lib/loaders';
import { useFrame } from '@react-three/fiber';

const RemotePlayer = ({ playerId, position, rotation }) => {
  const car = useRef();
  const targetPosition = useRef(new THREE.Vector3(position.x, position.y, position.z));
  const targetRotation = useRef(rotation);
  
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
  
  // Update target values when position/rotation props change
  useEffect(() => {
    targetPosition.current.set(position.x, position.y, position.z);
    targetRotation.current = rotation;
  }, [position, rotation]);
  
  // Smoothly interpolate to target position/rotation on each frame
  useFrame((_, delta) => {
    if (!car.current) return;
    
    // Smoothly move to target position
    car.current.position.lerp(targetPosition.current, Math.min(10 * delta, 1));
    
    // Smoothly rotate to target rotation
    const currentRot = car.current.rotation.y;
    let targetRot = targetRotation.current;
    
    // Handle rotation wrapping (when crossing from 0 to 2π or vice versa)
    if (Math.abs(targetRot - currentRot) > Math.PI) {
      if (targetRot > currentRot) {
        targetRot -= Math.PI * 2;
      } else {
        targetRot += Math.PI * 2;
      }
    }
    
    car.current.rotation.y = THREE.MathUtils.lerp(
      currentRot, 
      targetRot, 
      Math.min(10 * delta, 1)
    );
  });
  
  if (!coloredModel) {
    return null;
  }
  
  return (
    <group ref={car} position={[position.x, position.y, position.z]} rotation={[0, rotation, 0]}>
      <primitive 
        object={coloredModel} 
        scale={[0.5, 0.5, 0.5]} 
        rotation={[0, Math.PI, 0]} 
      />
    </group>
  );
};

export default RemotePlayer; 