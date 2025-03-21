import React, { useEffect, useMemo } from 'react';
import { useModelWithMaterials } from '../lib/loaders';
import * as THREE from 'three';

const VehicleModel = ({ 
  vehicleType = 'vehicle-racer', 
  color = null, 
  scale = [0.5, 0.5, 0.5], 
  rotation = [0, Math.PI, 0],
  boosting = false
}) => {
  // Ensure vehicle type is valid, fallback to racer if not
  const modelName = useMemo(() => {
    const validModels = [
      'vehicle-racer',
      'vehicle-truck',
      'vehicle-suv',
      'vehicle-monster-truck',
      'vehicle-vintage-racer',
      'vehicle-racer-low',
      'vehicle-speedster',
      'vehicle-drag-racer'
    ];
    
    return validModels.includes(vehicleType) ? vehicleType : 'vehicle-racer';
  }, [vehicleType]);
  
  // Load the vehicle model based on the vehicle type
  const vehicleModel = useModelWithMaterials(
    `/banana-racer/assets/${modelName}.obj`,
    `/banana-racer/assets/${modelName}.mtl`
  );
  
  // Create a cloned model to avoid sharing materials
  const clonedModel = useMemo(() => {
    if (!vehicleModel) return null;
    
    const clone = vehicleModel.clone();
    
    // Ensure all materials are cloned
    clone.traverse((child) => {
      if (child.isMesh && child.material) {
        if (Array.isArray(child.material)) {
          child.material = child.material.map(m => m.clone());
        } else {
          child.material = child.material.clone();
        }
      }
    });
    
    return clone;
  }, [vehicleModel]);
  
  // Apply color when specified
  useEffect(() => {
    if (!clonedModel || !color) return;
    
    // Apply the color to all materials in the model
    clonedModel.traverse((child) => {
      if (child.isMesh && child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(mat => {
            mat.color.set(color);
          });
        } else {
          child.material.color.set(color);
        }
      }
    });
  }, [clonedModel, color]);
  
  if (!clonedModel) {
    return null;
  }
  
  return (
    <group>
      <primitive 
        object={clonedModel} 
        scale={scale} 
        rotation={rotation} 
      />
      
      {/* Show boost visual effect when boosting */}
      {boosting && (
        <>
          {/* Main boost cone - position behind the car */}
          <mesh position={[0, 0.15, -1.2]} rotation={[Math.PI/2, 0, 0]}>
            <coneGeometry args={[0.2, 0.8, 16]} />
            <meshBasicMaterial color="#3399ff" transparent opacity={0.7} />
          </mesh>
          
          {/* Inner boost flame */}
          <mesh position={[0, 0.15, -1.0]} rotation={[Math.PI/2, 0, 0]}>
            <coneGeometry args={[0.12, 0.5, 16]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.9} />
          </mesh>
          
          {/* Outer boost trail particles */}
          <mesh position={[0, 0.15, -1.4]} rotation={[Math.PI/2, 0, 0]}>
            <coneGeometry args={[0.25, 1.0, 16]} />
            <meshBasicMaterial color="#66ccff" transparent opacity={0.4} />
          </mesh>
        </>
      )}
    </group>
  );
};

export default VehicleModel; 