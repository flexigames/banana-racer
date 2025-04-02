import React, { useRef, useEffect, useMemo } from "react";
import { useModelWithMaterials, useModel, prepareModel } from "../lib/loaders";
import { starVertexShader, starFragmentShader } from "../shaders/star";
import * as THREE from "three";
import Balloons from "./Balloons";
import Banana from "./Banana";
import ItemBox from "./ItemBox";
import Shell from "./Shell";
import { ITEM_TYPES } from "../../server/types";
import SoundEffect from "./SoundEffect";

const Car = ({
  color = null,
  lives,
  scale = [0.5, 0.5, 0.5],
  rotation = [0, Math.PI, 0],
  boosting = false,
  isStarred = false,
  trailingItem = null,
  movement = { turn: 0 },
  modelName = "kart",
}) => {
  const carRef = useRef();
  const originalMaterials = useRef(new Map());

  // Load wheel model
  const wheelModel = useModelWithMaterials(
    `/assets/wheel-medium.obj`,
    `/assets/wheel-medium.mtl`
  );

  // Adjust scale and rotation for kart
  const modelConfig = getModelConfig(modelName);

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

    // For kart model, ensure we have a texture for the star shader
    if (!texture) {
      texture = new THREE.TextureLoader().load(`/assets/${modelName}.png`);
    }

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
  }, [vehicleModel, modelName]);

  // Create a cloned model to avoid sharing materials
  const clonedModel = useMemo(() => {
    if (!vehicleModel) return null;

    const clone = vehicleModel.clone();

    // Store original materials and ensure all materials are cloned
    clone.traverse((child) => {
      if (child.isMesh) {
        // For kart model, ensure material is properly set
        if (!child.material || !child.material.map) {
          const material = new THREE.MeshStandardMaterial({
            map: new THREE.TextureLoader().load(`/assets/${modelName}.png`),
            metalness: 0.5,
            roughness: 0.5,
          });
          child.material = material;
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
          // Apply star material to all meshes when starred
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

  if (!clonedModel || !wheelModel) {
    return null;
  }

  return (
    <group ref={carRef}>
      <primitive
        object={clonedModel}
        scale={modelConfig.scale}
        rotation={modelConfig.rotation}
        position={modelConfig.position}
      />

      {/* Add wheels */}
      <primitive
        object={wheelModel.clone()}
        position={[-0.15, 0.07, 0.15]}
        rotation={[Math.PI / 2, 0, -movement.turn * 0.5]}
        scale={[0.5, 0.5, 0.5]}
      />
      <primitive
        object={wheelModel.clone()}
        position={[0.15, 0.07, 0.15]}
        rotation={[Math.PI / 2, Math.PI, movement.turn * 0.5]}
        scale={[0.5, 0.5, 0.5]}
      />
      <primitive
        object={wheelModel.clone()}
        position={[-0.15, 0.07, -0.15]}
        rotation={[Math.PI / 2, 0, 0]}
        scale={[0.5, 0.5, 0.5]}
      />
      <primitive
        object={wheelModel.clone()}
        position={[0.15, 0.07, -0.15]}
        rotation={[Math.PI / 2, Math.PI, 0]}
        scale={[0.5, 0.5, 0.5]}
      />

      <group position={[0, 0.0, -0.15]}>
        <Balloons color={color} lives={lives} isStarred={isStarred} />
      </group>

      {/* Show trailing item if present */}
      {trailingItem && (
        <TrailingItem
          type={trailingItem.type}
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

          <SoundEffect name="use" playOnMount distance={10} />
        </>
      )}
    </group>
  );
};

export default Car;

function TrailingItem({ type, quantity }) {
  const shellsRef = useRef();
  const rotationRef = useRef(0);

  useEffect(() => {
    if (
      type !== ITEM_TYPES.THREE_GREEN_SHELLS &&
      type !== ITEM_TYPES.THREE_RED_SHELLS
    )
      return;

    let lastTime = 0;
    const rotationSpeed = 5; // radians per second
    let animationId;

    function animate(timestamp) {
      if (lastTime === 0) {
        lastTime = timestamp;
      }

      const deltaTime = (timestamp - lastTime) / 1000; // convert to seconds
      lastTime = timestamp;

      rotationRef.current += rotationSpeed * deltaTime;
      if (shellsRef.current) {
        shellsRef.current.rotation.y = rotationRef.current;
      }

      animationId = requestAnimationFrame(animate);
    }

    animationId = requestAnimationFrame(animate);

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [type]);

  switch (type) {
    case ITEM_TYPES.THREE_BANANAS:
      return (
        <>
          {Array.from({ length: quantity || 3 }).map((_, index) => (
            <Banana
              key={index}
              rotation={0}
              position={{
                x: 0,
                y: 0,
                z: -0.5 - index * 0.3,
              }}
              scale={[1, 1, 1]}
            />
          ))}
        </>
      );
    case ITEM_TYPES.BANANA:
      return (
        <Banana
          position={{ x: 0, y: 0, z: -0.5 }}
          rotation={0}
          scale={[1, 1, 1]}
        />
      );
    case ITEM_TYPES.FAKE_CUBE:
      return (
        <ItemBox
          position={[0, -0.25, -0.5]}
          rotation={0}
          scale={0.5}
          isFakeCube
        />
      );
    case ITEM_TYPES.THREE_RED_SHELLS:
    case ITEM_TYPES.THREE_GREEN_SHELLS:
      return (
        <group ref={shellsRef} position={[0, 0.1, 0]}>
          {Array.from({ length: quantity || 3 }).map((_, index) => {
            const angle = (index * 2 * Math.PI) / 3;
            const radius = 0.3;
            return (
              <Shell
                key={index}
                color={type === ITEM_TYPES.THREE_GREEN_SHELLS ? "green" : "red"}
                position={[
                  Math.cos(angle) * radius,
                  0,
                  Math.sin(angle) * radius,
                ]}
                rotation={0}
                scale={0.5}
              />
            );
          })}
        </group>
      );
    case ITEM_TYPES.GREEN_SHELL:
      return (
        <Shell color="green" position={[0, 0, -0.5]} rotation={0} scale={0.5} />
      );
    case ITEM_TYPES.RED_SHELL:
      return (
        <Shell color="red" position={[0, 0, -0.5]} rotation={0} scale={0.5} />
      );
    default:
      return null;
  }
}

function getModelConfig(modelName = "kart") {
  const configs = {
    kart: {
      name: "kart",
      scale: [0.25, 0.25, 0.25],
      rotation: [0, 0, 0],
      position: [0, 0.05, 0],
    },
    boat: {
      name: "boat",
      scale: [0.3, 0.3, 0.3],
      rotation: [0, 0, 0],
      position: [0, 0.05, 0],
    },
    plane: {
      name: "cessna",
      scale: [0.4, 0.4, 0.4],
      rotation: [0, 0, 0],
      position: [0, 0.03, 0],
    },
    goose: {
      name: "goose",
      scale: [0.3, 0.3, 0.3],
      rotation: [0, 0, 0],
      position: [0, 0.03, 0],
    },
  };

  return configs[modelName] || configs.kart;
}
