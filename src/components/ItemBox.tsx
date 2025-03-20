import React, { useRef, useEffect, useMemo } from 'react';
import { useModelWithMaterials, prepareModel } from '../lib/loaders';
import * as THREE from 'three';
import { ITEM_BOX_COLLISION_RADIUS } from '../constants';
import { Group, Mesh, Material } from 'three';

interface ItemBoxProps {
  position?: [number, number, number];
  rotation?: number;
  scale?: number;
  showCollisionRadius?: boolean;
}

const ItemBox: React.FC<ItemBoxProps> = ({ 
  position = [0, 0, 0], 
  rotation = 0, 
  scale = 0.5, 
  showCollisionRadius = false 
}) => {
  const itemBox = useRef<Group>(null);
  
  // Load the item box model
  const itemBoxModel = useModelWithMaterials(
    './assets/item-box.obj',
    './assets/item-box.mtl'
  );
  
  // Clone the model with properly cloned materials
  const model = useMemo(() => {
    if (!itemBoxModel) return null;
    
    const clone = itemBoxModel.clone();
    
    // Ensure all materials are cloned
    clone.traverse((child: THREE.Object3D) => {
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
      itemBox.current.position.set(position[0], position[1] + 0.5, position[2]);
      itemBox.current.rotation.y = rotation;
      
      // Add animation
      const startTime = Date.now();
      const animate = () => {
        const elapsed = Date.now() - startTime;
        // Gentle floating motion
        const floatHeight = Math.sin(elapsed / 600) * 0.15;
        // Rotation animation
        if (itemBox.current) {
          itemBox.current.rotation.y = rotation + elapsed / 1000;
          itemBox.current.position.y = position[1] + 0.5 + floatHeight;
        }
        
        requestAnimationFrame(animate);
      };
      
      const animationId = requestAnimationFrame(animate);
      
      return () => cancelAnimationFrame(animationId);
    }
  }, [position, rotation]);

  if (!model) return null;

  return (
    <group ref={itemBox}>
      <primitive 
        object={model} 
        scale={[scale, scale, scale]} 
      />
      
      {/* Visualization of collision radius */}
      {showCollisionRadius && (
        <mesh>
          <sphereGeometry args={[ITEM_BOX_COLLISION_RADIUS, 16, 12]} />
          <meshBasicMaterial 
            color={0x00aaff} 
            transparent={true} 
            opacity={0.15} 
            side={THREE.DoubleSide}
          />
          <mesh>
            <sphereGeometry args={[ITEM_BOX_COLLISION_RADIUS, 16, 12]} />
            <meshBasicMaterial 
              color={0x0088ff}
              wireframe={true}
              transparent={true}
              opacity={0.4}
            />
          </mesh>
        </mesh>
      )}
    </group>
  );
};

export default ItemBox; 