import React, { useEffect, useMemo } from 'react';
import { useModelWithMaterials } from '../lib/loaders';
import * as THREE from 'three';
import { Color, Object3D, Mesh, Material, MeshStandardMaterial } from 'three';

export type VehicleType = 
  | 'vehicle-racer'
  | 'vehicle-truck'
  | 'vehicle-suv'
  | 'vehicle-monster-truck'
  | 'vehicle-vintage-racer'
  | 'vehicle-racer-low'
  | 'vehicle-speedster'
  | 'vehicle-drag-racer';

interface VehicleModelProps {
  vehicleType?: VehicleType;
  color?: Color | null | undefined;
  scale?: number | [number, number, number];
  rotation?: [number, number, number];
}

const VehicleModel: React.FC<VehicleModelProps> = ({ 
  vehicleType = 'vehicle-racer', 
  color = null, 
  scale = [0.5, 0.5, 0.5], 
  rotation = [0, Math.PI, 0] 
}) => {
  // Ensure vehicle type is valid, fallback to racer if not
  const modelName = useMemo(() => {
    const validModels: VehicleType[] = [
      'vehicle-racer',
      'vehicle-truck',
      'vehicle-suv',
      'vehicle-monster-truck',
      'vehicle-vintage-racer',
      'vehicle-racer-low',
      'vehicle-speedster',
      'vehicle-drag-racer'
    ];
    
    return validModels.includes(vehicleType as VehicleType) ? vehicleType : 'vehicle-racer';
  }, [vehicleType]);
  
  // Load the vehicle model based on the vehicle type
  const vehicleModel = useModelWithMaterials(
    `/banana-racer/assets/${modelName}.obj`,
    `/banana-racer/assets/${modelName}.mtl`
  ) as THREE.Group | null;
  
  // Create a cloned model to avoid sharing materials
  const clonedModel = useMemo(() => {
    if (!vehicleModel) return null;
    
    const clone = vehicleModel.clone();
    
    // Ensure all materials are cloned
    clone.traverse((child: Object3D) => {
      if ((child as Mesh).isMesh && (child as Mesh).material) {
        const mesh = child as Mesh;
        if (Array.isArray(mesh.material)) {
          mesh.material = mesh.material.map(m => m.clone());
        } else {
          mesh.material = mesh.material.clone();
        }
      }
    });
    
    return clone;
  }, [vehicleModel]);
  
  // Apply color when specified
  useEffect(() => {
    if (!clonedModel || !color) return;
    
    // Apply the color to all materials in the model
    clonedModel.traverse((child: Object3D) => {
      if ((child as Mesh).isMesh && (child as Mesh).material) {
        const mesh = child as Mesh;
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach(mat => {
            // Check if material has a color property (like MeshStandardMaterial)
            if ('color' in mat && mat.color) {
              (mat as MeshStandardMaterial).color.copy(color);
            }
          });
        } else if ('color' in mesh.material && mesh.material.color) {
          (mesh.material as MeshStandardMaterial).color.copy(color);
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