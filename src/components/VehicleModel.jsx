import React, { useEffect, useMemo } from 'react';
import { useModelWithMaterials } from '../lib/loaders';
import * as THREE from 'three';

const VehicleModel = ({ vehicleType = 'vehicle-racer', color = null, scale = [0.5, 0.5, 0.5], rotation = [0, Math.PI, 0] }) => {
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
    `/assets/${modelName}.obj`,
    `/assets/${modelName}.mtl`
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
    <primitive 
      object={clonedModel} 
      scale={scale} 
      rotation={rotation} 
    />
  );
};

export default VehicleModel; 