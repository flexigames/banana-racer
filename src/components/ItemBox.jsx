import React, { useRef, useEffect, useMemo } from "react";
import { useModelWithMaterials, prepareModel } from "../lib/loaders";

const ItemBox = ({ position = [0, 0, 0], isFakeCube = false }) => {
  const itemBox = useRef();
  const scale = 1;

  // Load the item box model
  const itemBoxModel = useModelWithMaterials(
    "/banana-racer/assets/item-box.obj",
    "/banana-racer/assets/item-box.mtl"
  );

  // Clone the model with properly cloned materials
  const model = useMemo(() => {
    if (!itemBoxModel) return null;

    const clone = itemBoxModel.clone();

    // Ensure all materials are cloned
    clone.traverse((child) => {
      if (child.isMesh && child.material) {
        if (Array.isArray(child.material)) {
          child.material = child.material.map((m) => {
            const clonedMaterial = m.clone();
            clonedMaterial.transparent = true;
            clonedMaterial.opacity = isFakeCube ? 0.9 : 0.6;
            return clonedMaterial;
          });
        } else {
          child.material = child.material.clone();
          child.material.transparent = true;
          child.material.opacity = isFakeCube ? 0.9 : 0.6;
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

  // Add floating animation
  useEffect(() => {
    if (itemBox.current) {
      // Set initial position
      itemBox.current.position.set(position[0], position[1] + 0.3, position[2]);

      if (isFakeCube) return;

      // Add animation
      const startTime = Date.now();
      const animate = () => {
        const elapsed = Date.now() - startTime;
        // Gentle floating motion
        const floatHeight = Math.sin(elapsed / 600) * 0.15;

        itemBox.current.rotation.y = elapsed / 1000;

        itemBox.current.position.y = position[1] + 0.3 + floatHeight;

        requestAnimationFrame(animate);
      };

      const animationId = requestAnimationFrame(animate);

      return () => cancelAnimationFrame(animationId);
    }
  }, [position.x, position.y, position.z]);

  if (!model) return null;

  return (
    <group ref={itemBox}>
      <primitive object={model} scale={[scale, scale, scale]} />
    </group>
  );
};

export default ItemBox;
