import React, { useRef, useEffect, useMemo } from "react";
import { useModelWithMaterials, prepareModel } from "../lib/loaders";
import * as THREE from "three";

const FakeCube = ({ position = [0, 0, 0], rotation = 0, scale = 0.5 }) => {
  const fakeCube = useRef();

  // Load the item box model (we'll use the same model but with different materials)
  const itemBoxModel = useModelWithMaterials(
    "/banana-racer/assets/item-box.obj",
    "/banana-racer/assets/item-box.mtl"
  );

  // Clone the model with modified materials to make it look slightly different
  const model = useMemo(() => {
    if (!itemBoxModel) return null;

    const clone = itemBoxModel.clone();

    // Modify materials to make it look slightly different
    clone.traverse((child) => {
      if (child.isMesh && child.material) {
        if (Array.isArray(child.material)) {
          child.material = child.material.map((m) => {
            const newMat = m.clone();
            // Make it slightly darker and more reddish
            newMat.color = new THREE.Color(0.8, 0.6, 0.6);
            newMat.opacity = 0.9;
            return newMat;
          });
        } else {
          const newMat = child.material.clone();
          newMat.color = new THREE.Color(0.8, 0.6, 0.6);
          newMat.opacity = 0.9;
          child.material = newMat;
        }
      }
    });

    return clone;
  }, [itemBoxModel]);

  // Prepare the model (add shadows, etc.)
  useEffect(() => {
    if (model) {
      prepareModel(model);
    }
  }, [model]);

  // Set the initial position and rotation
  useEffect(() => {
    if (fakeCube.current) {
      fakeCube.current.position.set(position[0], position[1], position[2]);
      fakeCube.current.rotation.y = rotation;
    }
  }, [position, rotation]);

  return (
    <group ref={fakeCube}>
      <primitive object={model} scale={[scale, scale, scale]} />
    </group>
  );
};

export default FakeCube;
