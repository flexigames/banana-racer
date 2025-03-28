import React, { useRef, useEffect, useMemo } from "react";
import { useModelWithMaterials, prepareModel } from "../lib/loaders";
import { rainbowVertexShader, rainbowFragmentShader } from "../shaders/rainbow";
import * as THREE from "three";

const ItemBox = ({ position = [0, 0, 0], isFakeCube = false }) => {
  const itemBox = useRef();
  const scale = 1;
  const shaderRef = useRef();

  // Load the item box model
  const itemBoxModel = useModelWithMaterials(
    "/banana-racer/assets/item-box.obj",
    "/banana-racer/assets/item-box.mtl"
  );

  // Create rainbow shader material
  const rainbowMaterial = useMemo(() => {
    if (!itemBoxModel) return null;

    // Find the first texture from the model
    let texture = null;
    itemBoxModel.traverse((child) => {
      if (child.isMesh && child.material && child.material.map && !texture) {
        texture = child.material.map;
        console.log("Found texture:", texture);
      }
    });

    if (!texture) {
      console.log("No texture found in model");
      return null;
    }

    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        texture1: { value: texture },
      },
      vertexShader: rainbowVertexShader,
      fragmentShader: rainbowFragmentShader,
      transparent: true,
      opacity: isFakeCube ? 0.9 : 0.6,
    });

    console.log("Created shader material:", material);
    return material;
  }, [itemBoxModel, isFakeCube]);

  // Clone the model with shader material
  const model = useMemo(() => {
    if (!itemBoxModel || !rainbowMaterial) {
      return null;
    }

    const clone = itemBoxModel.clone();

    // Apply shader material to all meshes
    clone.traverse((child) => {
      if (child.isMesh) {
        child.material = rainbowMaterial;
      }
    });

    return clone;
  }, [itemBoxModel, rainbowMaterial]);

  // Prepare the model (add shadows, etc.)
  useEffect(() => {
    if (model) {
      prepareModel(model);
    }
  }, [model]);

  // Add floating animation and update shader time
  useEffect(() => {
    if (itemBox.current) {
      // Set initial position
      itemBox.current.position.set(position[0], position[1] + 0.3, position[2]);

      if (isFakeCube) return;

      // Add animation
      const startTime = Date.now();
      let animationFrameId;
      const animate = () => {
        if (!itemBox.current || !itemBox.current.rotation) return;
        
        const elapsed = Date.now() - startTime;
        const floatHeight = Math.sin(elapsed / 600) * 0.15;

        itemBox.current.rotation.y = elapsed / 1000;
        itemBox.current.position.y = position[1] + 0.3 + floatHeight;

        if (rainbowMaterial?.uniforms?.time) {
          rainbowMaterial.uniforms.time.value = elapsed / 1000;
        }

        animationFrameId = requestAnimationFrame(animate);
      };

      animate();

      return () => {
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
        }
      };
    }
  }, [position.x, position.y, position.z, rainbowMaterial]);

  if (!model) return null;

  return (
    <group ref={itemBox}>
      <primitive object={model} scale={[scale, scale, scale]} />
    </group>
  );
};

export default ItemBox;
