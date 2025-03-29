import React, { useRef, useEffect, useMemo } from "react";
import { useModelWithMaterials, prepareModel } from "../lib/loaders";
import { starVertexShader, starFragmentShader } from "../shaders/star";
import * as THREE from "three";
import Balloons from "./Balloons";
import Banana from "./Banana";
import GreenShell from "./GreenShell";
import ItemBox from "./ItemBox";
import { ITEM_TYPES } from "../../server/types";

const Car = ({
  vehicleType = "vehicle-racer",
  color = null,
  lives,
  scale = [0.5, 0.5, 0.5],
  rotation = [0, Math.PI, 0],
  boosting = false,
  isStarred = false,
  trailingItem = null,
}) => {
  const carRef = useRef();
  const shaderRef = useRef();
  const originalMaterials = useRef(new Map());

  // Ensure vehicle type is valid, fallback to racer if not
  // const modelName = useMemo(() => {
  //   const validModels = [
  //     "vehicle-racer",
  //     "vehicle-truck",
  //     "vehicle-suv",
  //     "vehicle-monster-truck",
  //     "vehicle-vintage-racer",
  //     "vehicle-racer-low",
  //     "vehicle-speedster",
  //     "vehicle-drag-racer",
  //     "kart"
  //   ];

  //   return validModels.includes(vehicleType) ? vehicleType : "vehicle-racer";
  // }, [vehicleType]);

  const modelName = "kart";

  // Adjust scale and rotation based on model type
  const modelConfig = useMemo(() => {
    if (modelName === "kart") {
      return {
        scale: [0.3, 0.3, 0.3],
        rotation: [0, 0, 0]
      };
    }
    return {
      scale,
      rotation
    };
  }, [modelName, scale, rotation]);

  // Load the vehicle model based on the vehicle type
  const vehicleModel = useModelWithMaterials(
    `/assets/${modelName}.obj`,
    `/assets/${modelName}.mtl`
  );

  // Create star shader material
  const starMaterial = useMemo(() => {
    if (!vehicleModel) return null;

    // Find the first texture from the model
    let texture = null;
    vehicleModel.traverse((child) => {
      if (child.isMesh && child.material && child.material.map && !texture) {
        texture = child.material.map;
      }
    });

    if (!texture) {
      return null;
    }

    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        texture1: { value: texture },
      },
      vertexShader: starVertexShader,
      fragmentShader: starFragmentShader,
      transparent: false,
    });

    return material;
  }, [vehicleModel]);

  // Create a cloned model to avoid sharing materials
  const clonedModel = useMemo(() => {
    if (!vehicleModel) return null;

    const clone = vehicleModel.clone();

    // Store original materials and ensure all materials are cloned
    clone.traverse((child) => {
      if (child.isMesh) {
        // For kart model, ensure material is properly set
        if (modelName === "kart") {
          if (!child.material || !child.material.map) {
            const material = new THREE.MeshStandardMaterial({
              map: new THREE.TextureLoader().load('/assets/kart.png'),
              metalness: 0.5,
              roughness: 0.5
            });
            child.material = material;
          }
        }

        if (child.material) {
          if (Array.isArray(child.material)) {
            const clonedMaterials = child.material.map((m) => m.clone());
            child.material = clonedMaterials;
            originalMaterials.current.set(child.uuid, child.material);
          } else {
            const clonedMaterial = child.material.clone();
            child.material = clonedMaterial;
            originalMaterials.current.set(child.uuid, child.material);
          }
        }
      }
    });

    return clone;
  }, [vehicleModel, modelName]);

  // Apply star shader or color
  useEffect(() => {
    if (!clonedModel) return;

    if (isStarred && starMaterial) {
      clonedModel.traverse((child) => {
        if (child.isMesh) {
          child.material = starMaterial;
        }
      });
    } else {
      clonedModel.traverse((child) => {
        if (child.isMesh) {
          const originalMaterial = originalMaterials.current?.get(child.uuid);
          if (originalMaterial) {
            if (Array.isArray(originalMaterial)) {
              child.material = originalMaterial.map((m) => m.clone());
            } else {
              child.material = originalMaterial.clone();
            }
          }

          // Apply color if provided and material exists
          if (color && child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach((mat) => {
                if (mat && mat.color) {
                  mat.color.set(color);
                }
              });
            } else if (child.material.color) {
              child.material.color.set(color);
            }
          }
        }
      });
    }
  }, [clonedModel, color, isStarred, starMaterial]);

  // Prepare the model
  useEffect(() => {
    if (clonedModel) {
      prepareModel(clonedModel);
    }
  }, [clonedModel]);

  // Update shader time and add star animation
  useEffect(() => {
    if (!carRef.current || !isStarred || !starMaterial) return;

    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;

      // Update shader time uniform
      if (starMaterial) {
        starMaterial.uniforms.time.value = elapsed / 1000;
      }

      requestAnimationFrame(animate);
    };

    const animationId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationId);
  }, [isStarred, starMaterial]);

  if (!clonedModel) {
    return null;
  }

  return (
    <group ref={carRef}>
      <primitive object={clonedModel} scale={modelConfig.scale} rotation={modelConfig.rotation} />
      <Balloons color={color} lives={lives} isStarred={isStarred} />

      {/* Show trailing item if present */}
      {trailingItem && (
        <TrailingItem
          type={trailingItem.type}
          position={{ x: 0, y: 0, z: -0.5 }}
          rotation={trailingItem.rotation}
          quantity={trailingItem.quantity}
        />
      )}

      {/* Show boost visual effect when boosting */}
      {boosting && (
        <>
          {/* Main boost cone - position behind the car */}
          <mesh position={[0, 0.15, -1.2]} rotation={[Math.PI / 2, 0, 0]}>
            <coneGeometry args={[0.2, 0.8, 16]} />
            <meshBasicMaterial color="#3399ff" transparent opacity={0.7} />
          </mesh>

          {/* Inner boost flame */}
          <mesh position={[0, 0.15, -1.0]} rotation={[Math.PI / 2, 0, 0]}>
            <coneGeometry args={[0.12, 0.5, 16]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.9} />
          </mesh>

          {/* Outer boost trail particles */}
          <mesh position={[0, 0.15, -1.4]} rotation={[Math.PI / 2, 0, 0]}>
            <coneGeometry args={[0.25, 1.0, 16]} />
            <meshBasicMaterial color="#66ccff" transparent opacity={0.4} />
          </mesh>
        </>
      )}
    </group>
  );
};

export default Car;

function TrailingItem({ type, position, rotation, quantity }) {
  if (!position || rotation === undefined) return null;

  switch (type) {
    case ITEM_TYPES.THREE_BANANAS:
      return (
        <>
          {Array.from({ length: quantity || 3 }).map((_, index) => (
            <Banana
              key={index}
              position={{
                x: position.x,
                y: position.y,
                z: position.z - index * 0.3,
              }}
              rotation={rotation}
              scale={[1, 1, 1]}
            />
          ))}
        </>
      );
    case ITEM_TYPES.BANANA:
      return (
        <Banana position={position} rotation={rotation} scale={[1, 1, 1]} />
      );
    case ITEM_TYPES.FAKE_CUBE:
      return (
        <ItemBox
          position={[position.x, position.y - 0.25, position.z]}
          rotation={rotation}
          scale={0.5}
          isFakeCube
        />
      );
    case ITEM_TYPES.THREE_GREEN_SHELLS:
      return (
        <>
          {Array.from({ length: quantity || 3 }).map((_, index) => (
            <GreenShell
              key={index}
              position={[position.x, position.y, position.z - index * 0.3]}
              rotation={rotation}
              scale={0.5}
            />
          ))}
        </>
      );

    case ITEM_TYPES.GREEN_SHELL:
      return (
        <GreenShell
          position={[position.x, position.y, position.z]}
          rotation={rotation}
          scale={0.5}
        />
      );
    default:
      return null;
  }
}
