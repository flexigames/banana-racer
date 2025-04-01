import { useLoader } from "@react-three/fiber";
import { MTLLoader } from "three/examples/jsm/loaders/MTLLoader";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader";

/**
 * Load an OBJ model with its MTL materials
 * @param {string} objPath - Path to the OBJ file
 * @param {string} mtlPath - Path to the MTL file
 * @returns {Object} The loaded model
 */
export const useModelWithMaterials = (objPath, mtlPath) => {
  const materials = useLoader(MTLLoader, mtlPath);
  const model = useLoader(OBJLoader, objPath, (loader) => {
    materials.preload();
    loader.setMaterials(materials);
  });

  return model;
};

export const useModel = (objPath) => {
  const model = useLoader(OBJLoader, objPath);
  model.traverse((child) => {
    if (child.isMesh) {
      child.material.color.setHex(0x000000);
    }
  });
  return model;
};

/**
 * Prepare a model for use in the scene (add shadows, etc.)
 * @param {Object} model - The loaded model
 */
export const prepareModel = (model) => {
  if (!model) return;

  model.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  return model;
};
