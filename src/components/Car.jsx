import React, { useRef, useEffect, forwardRef, useImperativeHandle, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { updateVehiclePhysics, updateObjectPosition } from '../lib/physics';
import { useVehicleControls } from '../lib/input';
import multiplayerManager from '../lib/multiplayer';
import { useModelWithMaterials } from '../lib/loaders';
import * as THREE from 'three';

const Car = forwardRef((props, ref) => {
  const car = useRef();
  const lastUpdateTime = useRef(0);
  
  // Expose the car ref to parent components
  useImperativeHandle(ref, () => car.current);
  
  // Load the vehicle model directly
  const vehicleModel = useModelWithMaterials(
    '/assets/vehicle-racer.obj',
    '/assets/vehicle-racer.mtl'
  );
  
  // Create a cloned model to avoid sharing materials with other components
  const clonedModel = useMemo(() => {
    if (!vehicleModel) return null;
    
    const clone = vehicleModel.clone();
    // Ensure all materials are cloned
    clone.traverse((child) => {
      if (child.isMesh && child.material) {
        if (Array.isArray(child.material)) {
          child.material = child.material.map(m => m.clone());
        } else {
          child.material = child.material.clone();
        }
      }
    });
    
    return clone;
  }, [vehicleModel]);
  
  // Car movement state
  const movement = useRef({
    forward: 0,
    turn: 0,
    speed: 0,
    rotation: 0,
    handbrake: false,
    tireSlip: 0
  });

  // Set up vehicle controls
  useVehicleControls(movement);
  
  // Position car at start position
  useEffect(() => {
    if (car.current) {
      car.current.position.set(0, 0.1, 0);
      car.current.rotation.y = 0;
    }
  }, []);

  // Update physics each frame
  useFrame((state, delta) => {
    // Update physics
    updateVehiclePhysics(movement.current, delta);
    
    // Update position
    updateObjectPosition(car.current, movement.current, delta);
    
    // Ensure the car stays on the ground
    if (car.current) {
      car.current.position.y = 0.1;
      
      // Send position updates to server (limit to 10 updates per second)
      if (state.clock.elapsedTime - lastUpdateTime.current > 0.1) {
        lastUpdateTime.current = state.clock.elapsedTime;
        
        if (multiplayerManager.connected && multiplayerManager.room) {
          // Only send updates if position has changed significantly
          const position = {
            x: parseFloat(car.current.position.x.toFixed(2)),
            y: parseFloat(car.current.position.y.toFixed(2)),
            z: parseFloat(car.current.position.z.toFixed(2))
          };
          
          const rotation = parseFloat(car.current.rotation.y.toFixed(2));
          
          multiplayerManager.updatePosition(position, rotation);
        }
      }
    }
  });

  // Add a new function to teleport to another player
  const teleportToPlayer = (targetPlayerId) => {
    const targetPlayer = multiplayerManager.players[targetPlayerId];
    if (targetPlayer && car.current) {
      car.current.position.set(
        targetPlayer.position.x + 2, // Position slightly to the side
        targetPlayer.position.y,
        targetPlayer.position.z
      );
      // Update the server with our new position
      multiplayerManager.updatePosition(
        {
          x: car.current.position.x,
          y: car.current.position.y,
          z: car.current.position.z
        },
        car.current.rotation.y
      );
    }
  };

  // Expose the teleport function
  useImperativeHandle(ref, () => ({
    ...car.current,
    teleportToPlayer
  }));

  if (!clonedModel) {
    return null;
  }

  return (
    <group ref={car} position={[0, 0.1, 0]}>
      <primitive 
        object={clonedModel} 
        scale={[0.5, 0.5, 0.5]} 
        rotation={[0, Math.PI, 0]} 
      />
    </group>
  );
});

export default Car; 