import React, { useRef, useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import VehicleModel from './VehicleModel';

const RemotePlayer = ({ playerId, position, rotation, speed = 0, color, vehicle = 'vehicle-racer' }) => {
  const car = useRef();
  const targetPosition = useRef(new THREE.Vector3(position.x, position.y, position.z));
  const targetRotation = useRef(rotation);
  const currentSpeed = useRef(speed);
  const lastPosition = useRef(new THREE.Vector3(position.x, position.y, position.z));
  const lastUpdateTime = useRef(Date.now());
  const [boosting, setBoosting] = useState(false);
  
  // Convert the server color to a THREE.Color object
  const playerColor = useMemo(() => {
    if (color) {
      // Use the server-provided color if available
      return new THREE.Color().setHSL(
        color.h,
        color.s,
        color.l
      );
    } else {
      // Fallback to generating a color from the player ID
      const hash = playerId.split('').reduce((acc, char) => {
        return char.charCodeAt(0) + ((acc << 5) - acc);
      }, 0);
      
      return new THREE.Color().setHSL(
        Math.abs(hash % 360) / 360,
        0.8,
        0.5
      );
    }
  }, [playerId, color]);
  
  // Update target values when position/rotation props change
  useEffect(() => {
    // Calculate direction and save last position before updating
    const direction = new THREE.Vector3()
      .subVectors(new THREE.Vector3(position.x, position.y, position.z), lastPosition.current)
      .normalize();
    
    // Save last position and update time
    lastPosition.current.set(targetPosition.current.x, targetPosition.current.y, targetPosition.current.z);
    const now = Date.now();
    const timeDelta = (now - lastUpdateTime.current) / 1000; // Convert to seconds
    lastUpdateTime.current = now;
    
    // Update target position and rotation
    targetPosition.current.set(position.x, position.y, position.z);
    targetRotation.current = rotation;
    currentSpeed.current = speed;
    
    // Set boosting state based on speed increase
    if (speed > 10) {
      setBoosting(true);
      // Auto-disable boosting after 3 seconds (same as the player car)
      setTimeout(() => {
        setBoosting(false);
      }, 3000);
    }
    
  }, [position, rotation, speed]);
  
  // Smoothly interpolate to target position/rotation on each frame
  useFrame((_, delta) => {
    if (!car.current) return;
    
    // Calculate interpolation factor based on speed and distance
    const distance = car.current.position.distanceTo(targetPosition.current);
    let lerpFactor = Math.min(10 * delta, 1);
    
    // If speed is high, adjust lerp factor
    if (currentSpeed.current > 0) {
      // Use speed to determine how quickly to move toward target (higher speed = faster interpolation)
      lerpFactor = Math.min(Math.max(0.2, currentSpeed.current) * 2 * delta, 1);
      
      // Increase factor for larger distances to avoid falling too far behind
      if (distance > 1) {
        lerpFactor = Math.min(lerpFactor * 1.5, 1);
      }
    }
    
    // Apply predictive movement based on speed and direction
    if (currentSpeed.current > 0.5 && distance > 0.1) {
      // Create a slight prediction in the direction the car is moving
      const predictedPosition = new THREE.Vector3()
        .copy(targetPosition.current);
      
      // Get forward direction based on rotation
      const forward = new THREE.Vector3(0, 0, -1)
        .applyAxisAngle(new THREE.Vector3(0, 1, 0), targetRotation.current);
      
      // Add prediction based on speed and direction
      const prediction = forward.multiplyScalar(currentSpeed.current * 0.05);
      predictedPosition.add(prediction);
      
      // Interpolate toward the predicted position
      car.current.position.lerp(predictedPosition, lerpFactor);
    } else {
      // Standard interpolation for slow or stationary vehicles
      car.current.position.lerp(targetPosition.current, lerpFactor);
    }
    
    // Smoothly rotate to target rotation
    const currentRot = car.current.rotation.y;
    let targetRot = targetRotation.current;
    
    // Handle rotation wrapping (when crossing from 0 to 2π or vice versa)
    if (Math.abs(targetRot - currentRot) > Math.PI) {
      if (targetRot > currentRot) {
        targetRot -= Math.PI * 2;
      } else {
        targetRot += Math.PI * 2;
      }
    }
    
    // Adjust rotation speed based on vehicle speed
    const rotLerpFactor = Math.min(Math.max(5, currentSpeed.current * 3) * delta, 1);
    
    car.current.rotation.y = THREE.MathUtils.lerp(
      currentRot, 
      targetRot, 
      rotLerpFactor
    );
  });
  
  return (
    <group ref={car} position={[position.x, position.y, position.z]} rotation={[0, rotation, 0]}>
      <VehicleModel 
        vehicleType={vehicle}
        color={playerColor}
        scale={[0.5, 0.5, 0.5]} 
        rotation={[0, Math.PI, 0]} 
      />
      
      {/* Show boost visual effect when boosting */}
      {boosting && (
        <>
          {/* Main boost cone - position behind the car */}
          <mesh position={[0, 0.15, -1.2]} rotation={[Math.PI/2, 0, 0]}>
            <coneGeometry args={[0.2, 0.8, 16]} />
            <meshBasicMaterial color="#3399ff" transparent opacity={0.7} />
          </mesh>
          
          {/* Inner boost flame */}
          <mesh position={[0, 0.15, -1.0]} rotation={[Math.PI/2, 0, 0]}>
            <coneGeometry args={[0.12, 0.5, 16]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.9} />
          </mesh>
          
          {/* Outer boost trail particles */}
          <mesh position={[0, 0.15, -1.4]} rotation={[Math.PI/2, 0, 0]}>
            <coneGeometry args={[0.25, 1.0, 16]} />
            <meshBasicMaterial color="#66ccff" transparent opacity={0.4} />
          </mesh>
        </>
      )}
    </group>
  );
};

export default RemotePlayer; 