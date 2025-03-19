import React, { useRef, useEffect, forwardRef, useImperativeHandle, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { updateVehiclePhysics, updateObjectPosition } from '../lib/physics';
import { useVehicleControls } from '../lib/input';
import multiplayerManager from '../lib/multiplayer';
import * as THREE from 'three';
import VehicleModel from './VehicleModel';

const Car = forwardRef((props, ref) => {
  const car = useRef();
  const lastUpdateTime = useRef(0);
  const [spinningOut, setSpinningOut] = useState(false);
  const spinTimer = useRef(null);
  const spinDirection = useRef(1); // 1 or -1 for spin direction
  const spinSpeed = useRef(0);
  
  // Expose the car ref to parent components
  useImperativeHandle(ref, () => car.current);
  
  // Create a THREE.Color from player color data
  const playerColor = useMemo(() => {
    if (!multiplayerManager.playerColor) return null;
    
    return new THREE.Color().setHSL(
      multiplayerManager.playerColor.h,
      multiplayerManager.playerColor.s,
      multiplayerManager.playerColor.l
    );
  }, [multiplayerManager.playerColor]);
  
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
  
  // Function to get a random spawn position
  const getRandomSpawnPosition = () => {
    // Generate a random position within a 40x40 area
    // But not too close to the center to avoid walls
    let x, z;
    do {
      x = (Math.random() - 0.5) * 40;
      z = (Math.random() - 0.5) * 40;
    } while (Math.sqrt(x * x + z * z) < 5); // Ensure not too close to origin
    
    return { x, y: 0.1, z };
  };
  
  // Position car at random start position
  useEffect(() => {
    if (car.current) {
      const spawnPos = getRandomSpawnPosition();
      car.current.position.set(spawnPos.x, spawnPos.y, spawnPos.z);
      car.current.rotation.y = Math.random() * Math.PI * 2; // Random initial rotation
    }
  }, []);

  // Function to trigger spin out when hitting a banana
  const triggerSpinOut = () => {
    if (spinningOut) return; // Already spinning out
    
    // Store current speed before stopping
    spinSpeed.current = movement.current.speed;
    
    // Set spinning out state
    setSpinningOut(true);
    
    // Block controls during spinout
    movement.current.forward = 0;
    movement.current.turn = 0;
    // Don't completely zero out speed to avoid position jumps
    movement.current.speed *= 0.5; // Reduce speed but don't stop completely
    
    // Random spin direction
    spinDirection.current = Math.random() > 0.5 ? 1 : -1;
    
    // Clear any existing timer
    if (spinTimer.current) {
      clearTimeout(spinTimer.current);
    }
    
    // Set timeout to recover from spinout after 2 seconds
    spinTimer.current = setTimeout(() => {
      setSpinningOut(false);
      spinTimer.current = null;
    }, 2000);
    
    // Notify about the collision
    console.log("Hit a banana! Spinning out for 2 seconds");
  };

  // Track spinout progress
  const spinProgress = useRef(0);
  const MAX_SPIN_RATE = 10; // Maximum spin rate

  // Update physics each frame
  useFrame((state, delta) => {
    if (!car.current) return;
    
    if (spinningOut) {
      // When spinning out, gradually decrease the spinning rate
      // Calculate spin rate based on a decreasing curve
      spinProgress.current += delta;
      const spinDuration = 2; // Should match the spinout timer duration
      const normalizedTime = Math.min(spinProgress.current / spinDuration, 1);
      
      // Start fast, then slow down - using a cosine easing
      const spinRate = MAX_SPIN_RATE * Math.cos(normalizedTime * Math.PI * 0.5);
      
      // Apply the spin
      car.current.rotation.y += spinDirection.current * delta * spinRate;
            
      // Gradually decrease speed
      movement.current.speed *= 0.9
    } else {
      // Reset spin progress when not spinning
      spinProgress.current = 0;
      
      // Normal driving physics
      updateVehiclePhysics(movement.current, delta);
      updateObjectPosition(car.current, movement.current, delta);
    }
    
    // Ensure the car stays on the ground
    car.current.position.y = 0.1;
    
    // Send position updates to server (limit to 10 updates per second)
    if (state.clock.elapsedTime - lastUpdateTime.current > 0.1) {
      lastUpdateTime.current = state.clock.elapsedTime;
      
      if (multiplayerManager.connected) {
        // Format position with precision to reduce network traffic
        const position = {
          x: parseFloat(car.current.position.x.toFixed(2)),
          y: parseFloat(car.current.position.y.toFixed(2)),
          z: parseFloat(car.current.position.z.toFixed(2))
        };
        
        const rotation = parseFloat(car.current.rotation.y.toFixed(2));
        const speed = parseFloat(movement.current.speed.toFixed(2));
        
        multiplayerManager.updatePosition(position, rotation, speed);
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
        car.current.rotation.y,
        0 // Speed is zero after teleporting
      );
    }
  };

  // Expose the car ref and functions to parent components
  useImperativeHandle(ref, () => ({
    ...car.current,
    teleportToPlayer,
    triggerSpinOut,
    isSpinningOut: () => spinningOut
  }));

  return (
    <group ref={car} position={[0, 0.1, 0]}>
      <VehicleModel 
        vehicleType={multiplayerManager.playerVehicle}
        color={playerColor}
        scale={[0.5, 0.5, 0.5]} 
        rotation={[0, Math.PI, 0]} 
      />
    </group>
  );
});

export default Car; 