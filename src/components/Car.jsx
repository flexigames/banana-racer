import React, { useRef, useEffect, useMemo } from "react";
import { useModelWithMaterials, prepareModel } from "../lib/loaders";
import { rainbowVertexShader, rainbowFragmentShader } from "../shaders/rainbow";
import * as THREE from "three";
import Balloons from "./Balloons";

const Car = ({
  vehicleType = "vehicle-racer",
  color = null,
  lives,
  scale = [0.5, 0.5, 0.5],
  rotation = [0, Math.PI, 0],
  boosting = false,
  isStarred = false,
}) => {
  const carRef = useRef();
  const shaderRef = useRef();
  const originalMaterials = useRef(new Map());

  // Ensure vehicle type is valid, fallback to racer if not
  const modelName = useMemo(() => {
    const validModels = [
      "vehicle-racer",
      "vehicle-truck",
      "vehicle-suv",
      "vehicle-monster-truck",
      "vehicle-vintage-racer",
      "vehicle-racer-low",
      "vehicle-speedster",
      "vehicle-drag-racer",
    ];

    return validModels.includes(vehicleType) ? vehicleType : "vehicle-racer";
  }, [vehicleType]);

  // Load the vehicle model based on the vehicle type
  const vehicleModel = useModelWithMaterials(
    `/banana-racer/assets/${modelName}.obj`,
    `/banana-racer/assets/${modelName}.mtl`
  );

  // Create rainbow shader material
  const rainbowMaterial = useMemo(() => {
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
      vertexShader: rainbowVertexShader,
      fragmentShader: rainbowFragmentShader,
      transparent: true,
      opacity: 0.8,
    });

    return material;
  }, [vehicleModel]);

  // Create a cloned model to avoid sharing materials
  const clonedModel = useMemo(() => {
    if (!vehicleModel) return null;

    const clone = vehicleModel.clone();

    // Ensure all materials are cloned
    clone.traverse((child) => {
      if (child.isMesh && child.material) {
        if (Array.isArray(child.material)) {
          child.material = child.material.map((m) => m.clone());
        } else {
          child.material = child.material.clone();
        }
      }
    });

    return clone;
  }, [vehicleModel]);

  // Store original materials when model is first loaded
  useEffect(() => {
    if (!clonedModel) return;
    
    originalMaterials.current.clear();
    clonedModel.traverse((child) => {
      if (child.isMesh && child.material) {
        if (Array.isArray(child.material)) {
          originalMaterials.current.set(
            child.uuid,
            child.material.map((m) => m.clone())
          );
        } else {
          originalMaterials.current.set(
            child.uuid,
            child.material.clone()
          );
        }
      }
    });
  }, [clonedModel]);

  // Apply rainbow shader or color
  useEffect(() => {
    if (!clonedModel) return;

    if (isStarred && rainbowMaterial) {
      // Apply rainbow shader to all meshes
      clonedModel.traverse((child) => {
        if (child.isMesh) {
          child.material = rainbowMaterial;
        }
      });
    } else {
      // Restore original materials and apply color if needed
      clonedModel.traverse((child) => {
        if (child.isMesh) {
          // Restore original material
          const originalMaterial = originalMaterials.current.get(child.uuid);
          if (originalMaterial) {
            if (Array.isArray(originalMaterial)) {
              child.material = originalMaterial.map(m => m.clone());
            } else {
              child.material = originalMaterial.clone();
            }
          }

          // Apply color if provided
          if (color) {
            if (Array.isArray(child.material)) {
              child.material.forEach((mat) => {
                mat.color.set(color);
              });
            } else {
              child.material.color.set(color);
            }
          }
        }
      });
    }
  }, [clonedModel, color, isStarred, rainbowMaterial]);

  // Prepare the model
  useEffect(() => {
    if (clonedModel) {
      prepareModel(clonedModel);
    }
  }, [clonedModel]);

  // Update shader time and add star animation
  useEffect(() => {
    if (!carRef.current || !isStarred || !rainbowMaterial) return;

    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      
      // Update shader time uniform
      if (rainbowMaterial) {
        rainbowMaterial.uniforms.time.value = elapsed / 1000;
      }

      requestAnimationFrame(animate);
    };

    const animationId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationId);
  }, [isStarred, rainbowMaterial]);

  if (!clonedModel) {
    return null;
  }

  return (
    <group ref={carRef}>
      <primitive object={clonedModel} scale={scale} rotation={rotation} />
      <Balloons color={color} lives={lives} />

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
