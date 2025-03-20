import { useLoader } from '@react-three/fiber';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import * as THREE from 'three';

/**
 * Load an OBJ model with its MTL materials
 * @param objPath - Path to the OBJ file
 * @param mtlPath - Path to the MTL file
 * @returns The loaded model
 */
export const useModelWithMaterials = (objPath: string, mtlPath: string): THREE.Group => {
  const materials = useLoader(MTLLoader, mtlPath);
  const model = useLoader(OBJLoader, objPath, (loader: OBJLoader) => {
    materials.preload();
    loader.setMaterials(materials);
  });
  
  return model;
};

/**
 * Prepare a model for use in the scene (add shadows, etc.)
 * @param model - The loaded model
 */
export const prepareModel = (model: THREE.Group): THREE.Group | undefined => {
  if (!model) return;
  
  model.traverse((child: THREE.Object3D) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    }
  });
  
  return model;
}; 