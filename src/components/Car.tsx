import React, { useRef, useEffect, forwardRef, useImperativeHandle, useMemo, useState, Ref } from 'react';
import { useFrame } from '@react-three/fiber';
import { updateVehiclePhysics, updateObjectPosition } from '../lib/physics';
import { useVehicleControls } from '../lib/input';
import { useMultiplayer } from '../contexts/MultiplayerContext';
import * as THREE from 'three';
import VehicleModel from './VehicleModel';
import { CarRef, VehicleType } from '../types';
import { Group } from 'three';

interface CarProps {
  color?: {
    h: number;
    s: number;
    l: number;
  };
  vehicle?: string;
}

interface CarMovement {
  forward: number;
  turn: number;
  speed: number;
  rotation: number;
  handbrake: boolean;
  tireSlip: number;
}

const Car = forwardRef<CarRef, CarProps>((props, ref) => {
  const { color: colorProp, vehicle: vehicleProp } = props;
  const car = useRef<Group>(new THREE.Group());
  const lastUpdateTime = useRef<number>(0);
  const [spinningOut, setSpinningOut] = useState<boolean>(false);
  const [boosting, setBoosting] = useState<boolean>(false);
  const spinTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const boostTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const spinDirection = useRef<number>(1); // 1 or -1 for spin direction
  const spinSpeed = useRef<number>(0);
  const boostFactor = useRef<number>(1); // Multiplier for speed while boosting
  
  // Get multiplayer context
  const { 
    connected, 
    playerId, 
    players,
    updatePosition 
  } = useMultiplayer();
  
  // Get player color and vehicle from the players state
  const playerData = players[playerId];
  const playerColor = playerData?.color;
  const playerVehicle = playerData?.vehicle;
  
  // Expose the car ref to parent components
  useImperativeHandle(ref, () => {
    if (car.current) {
      return Object.assign(car.current, {
        speed: movement.current.speed,
        isSpinningOut: () => spinningOut,
        triggerSpinOut,
        applyBoost
      });
    }
    return null as unknown as CarRef;
  });
  
  // Use props first, then fall back to context
  const effectiveColor = colorProp || playerColor;
  const effectiveVehicle = vehicleProp || playerVehicle || 'vehicle-racer';
  
  // Create a THREE.Color from player color data
  const carColor = useMemo(() => {
    if (!effectiveColor) return new THREE.Color(0xffffff);
    
    return new THREE.Color().setHSL(
      effectiveColor.h,
      effectiveColor.s,
      effectiveColor.l
    );
  }, [effectiveColor]);
  
  // Car movement state
  const movement = useRef<CarMovement>({
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
  const getRandomSpawnPosition = (): { x: number, y: number, z: number } => {
    // Generate a random position within a 40x40 area
    // But not too close to the center to avoid walls
    let x: number, z: number;
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
  const triggerSpinOut = (): void => {
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
    
    // Set timer to restore control after 2 seconds
    spinTimer.current = setTimeout(() => {
      setSpinningOut(false);
      // Restore partial speed
      movement.current.speed = spinSpeed.current * 0.5;
      spinTimer.current = null;
    }, 2000);
  };
  
  // Function to apply boost effect
  const applyBoost = (): void => {
    if (boosting) return; // Already boosting
    
    console.log('Applying boost!');
    setBoosting(true);
    boostFactor.current = 2.0; // Double speed while boosting
    
    // Clear any existing timer
    if (boostTimer.current) {
      clearTimeout(boostTimer.current);
    }
    
    // Set timer to end boost after 3 seconds
    boostTimer.current = setTimeout(() => {
      setBoosting(false);
      boostFactor.current = 1.0;
      boostTimer.current = null;
    }, 3000);
  };
  
  // Unmount cleanup
  useEffect(() => {
    return () => {
      if (spinTimer.current) {
        clearTimeout(spinTimer.current);
      }
      if (boostTimer.current) {
        clearTimeout(boostTimer.current);
      }
    };
  }, []);
  
  // Update the vehicle position in each frame
  useFrame((_, delta) => {
    // Skip if not initialized 
    if (!car.current) return;
    
    // Get current time
    const now = performance.now();
    const frameTime = (now - lastUpdateTime.current) / 1000;
    lastUpdateTime.current = now;
    
    // Apply spin rotation if spinning out
    if (spinningOut) {
      car.current.rotation.y += spinDirection.current * 5 * delta;
      return; // Skip regular physics while spinning out
    }
    
    // Apply boost velocity multiplier if boosting
    const speedMultiplier = boosting ? boostFactor.current : 1;
    
    // Apply physics update
    updateVehiclePhysics(
      car.current, 
      movement.current,
      delta,
      boosting ? boostFactor.current : 1.0
    );
    
    // Update physics position in the object
    if (car.current) {
      movement.current.speed = car.current.userData.speed || 0;
      movement.current.rotation = car.current.rotation.y;
      movement.current.tireSlip = car.current.userData.tireSlip || 0;
    }
    
    // Send position update to multiplayer server
    // But limit the rate to avoid spamming
    if (connected && playerId && car.current) {
      const position = car.current.position;
      const rotation = car.current.rotation.y;
      
      // Send our current position to the server
      updatePosition(
        [position.x, position.y, position.z],
        rotation,
        movement.current.speed
      );
    }
  });
  
  // Function to teleport this car to another player
  const teleportToPlayer = (targetPlayerId: string): void => {
    const targetPlayer = players[targetPlayerId];
    if (targetPlayer && car.current) {
      car.current.position.set(
        targetPlayer.position.x,
        targetPlayer.position.y,
        targetPlayer.position.z
      );
      car.current.rotation.y = targetPlayer.rotation;
      
      // Reset movement
      movement.current.speed = 0;
      movement.current.turn = 0;
      movement.current.forward = 0;
    }
  };
  
  // Add visual boost effect if boosting
  const boostEffects = boosting ? (
    <>
      <mesh
        position={[0, 0.3, 1.3]}
        rotation={[0, Math.PI, 0]}
      >
        <coneGeometry args={[0.2, 1, 8]} />
        <meshBasicMaterial color="orange" transparent opacity={0.7} />
      </mesh>
      <pointLight
        position={[0, 0.3, 1.5]}
        color="orange"
        intensity={2}
        distance={3}
      />
    </>
  ) : null;
  
  // Add ghost trail effect if spinning out
  const trailEffect = spinningOut ? (
    <group>
      <mesh position={[0, 0.1, 0]}>
        <circleGeometry args={[1.5, 32]} />
        <meshBasicMaterial color="red" transparent opacity={0.3} />
      </mesh>
      <mesh position={[0, 0.15, 0]}>
        <circleGeometry args={[1, 32]} />
        <meshBasicMaterial color="yellow" transparent opacity={0.3} />
      </mesh>
    </group>
  ) : null;

  return (
    <group ref={car}>
      <VehicleModel 
        vehicleType={effectiveVehicle as VehicleType}
        color={carColor} 
      />
      {boostEffects}
      {trailEffect}
    </group>
  );
});

export default Car; 