import * as THREE from 'three';
import { CarMovement } from '../types';

interface PhysicsResult {
  position: THREE.Vector3;
  rotation: number;
  speed: number;
  tireSlip: number;
}

/**
 * Updates vehicle physics and returns a result object
 */
export function updateVehiclePhysics(
  position: THREE.Vector3,
  rotationY: number,
  movement: CarMovement,
  delta: number,
  spinningOut?: boolean,
  spinDirection?: number,
  boostFactor?: number
): PhysicsResult;

/**
 * Updates vehicle physics directly on an object
 */
export function updateVehiclePhysics(
  object: THREE.Object3D,
  movement: CarMovement,
  delta: number,
  boostFactor?: number
): void;

/**
 * Implementation of the vehicle physics function
 */
export function updateVehiclePhysics(
  positionOrObject: THREE.Vector3 | THREE.Object3D,
  rotationOrMovement: number | CarMovement,
  movementOrDelta: CarMovement | number,
  deltaOrBoost?: number,
  spinningOut: boolean = false,
  spinDirection: number = 1,
  boostFactor: number = 1.0
): PhysicsResult | void {
  // Check if the first argument is a Vector3 (position)
  if (positionOrObject instanceof THREE.Vector3) {
    // Handle as the original implementation
    const position = positionOrObject;
    const rotationY = rotationOrMovement as number;
    const movement = movementOrDelta as CarMovement;
    const delta = deltaOrBoost as number;
    
    // Create a new Vector3 for the updated position
    const newPosition = new THREE.Vector3(position.x, position.y, position.z);
    
    // If spinning out, apply spin effect and return
    if (spinningOut) {
      // Apply spin effect - faster at the beginning, slowing at the end
      movement.rotation += spinDirection * 0.1;
      
      // Gradually reduce speed
      movement.speed *= 0.95;
      
      // Calculate movement vector with decreased speed
      const moveX = Math.sin(movement.rotation) * movement.speed * delta;
      const moveZ = Math.cos(movement.rotation) * movement.speed * delta;
      
      // Apply movement
      newPosition.x += moveX;
      newPosition.z += moveZ;
      
      return {
        position: newPosition,
        rotation: movement.rotation,
        speed: movement.speed,
        tireSlip: 0
      };
    }
  
    // Vehicle characteristics
    const maxSpeed = 7.5 * boostFactor;     // Boost affects max speed
    const maxReverseSpeed = 2.5;
    const acceleration = 0.1 * boostFactor; // Boost affects acceleration
    const braking = 0.2;
    const deceleration = 0.1;
    
    // Base turn speed and speed-dependent factors
    const baseTurnSpeed = 0.08;
    const minTurnSpeed = 0.04;
    
    // Update speed based on input
    if (movement.forward > 0) {
      // Accelerating forward
      movement.speed += movement.forward * acceleration;
    } else if (movement.forward < 0) {
      if (movement.speed > 0.5) {
        // Braking
        movement.speed -= braking;
      } else {
        // Accelerating in reverse
        movement.speed += movement.forward * acceleration * 0.7;
      }
    } else {
      // No input - stronger natural deceleration
      if (movement.speed > 0) {
        // Apply stronger deceleration when not accelerating
        movement.speed -= deceleration;
      } else if (movement.speed < 0) {
        movement.speed += deceleration;
      }
      
      // Ensure we come to a complete stop
      if (Math.abs(movement.speed) < deceleration) {
        movement.speed = 0;
      }
    }
    
    // Clamp speed
    movement.speed = Math.max(
      Math.min(movement.speed, maxSpeed),
      -maxReverseSpeed
    );
    
    // Calculate tire slip for drifting effects
    let tireSlip = 0;
    
    // Update rotation based on speed and turning input
    if (Math.abs(movement.speed) > 0.1) {
      // Calculate speed ratio (0 to 1)
      const speedRatio = Math.abs(movement.speed) / maxSpeed;
      
      // Calculate turn speed based on current speed
      // - At low speeds: use baseTurnSpeed for tight turning
      // - At high speeds: reduce to minTurnSpeed for stability
      const currentTurnSpeed = baseTurnSpeed - (speedRatio * (baseTurnSpeed - minTurnSpeed));
      
      // Apply turning with speed-dependent turn rate
      movement.rotation += movement.turn * currentTurnSpeed * Math.sign(movement.speed);
      
      // Calculate tire slip based on turn input and speed
      tireSlip = Math.abs(movement.turn) * speedRatio * 0.1;
      
      // More slip when handbrake is active
      if (movement.handbrake) {
        tireSlip *= 2;
      }
    }
    
    // Calculate movement vector
    const moveX = Math.sin(movement.rotation) * movement.speed * delta;
    const moveZ = Math.cos(movement.rotation) * movement.speed * delta;
    
    // Apply movement
    newPosition.x += moveX;
    newPosition.z += moveZ;
    
    // Keep car on the ground
    newPosition.y = 0.1;
    
    return {
      position: newPosition,
      rotation: movement.rotation,
      speed: movement.speed,
      tireSlip
    };
  } 
  else {
    // Handle as the object version
    const object = positionOrObject as THREE.Object3D;
    const movement = rotationOrMovement as CarMovement;
    const delta = movementOrDelta as number;
    const boost = deltaOrBoost || 1.0;
    
    // Apply physics
    const position = object.position.clone();
    const rotationY = object.rotation.y;
    
    // Calculate using the position-based implementation
    const result = updateVehiclePhysicsImpl(
      position,
      rotationY,
      movement,
      delta,
      spinningOut,
      spinDirection,
      boost
    );
    
    // Apply results to the object
    updateObjectPosition(object, result.position, result.rotation);
    
    // Store physics data in userData for access elsewhere
    object.userData.speed = result.speed;
    object.userData.tireSlip = result.tireSlip;
  }
}

/**
 * Internal implementation used by both overloads
 */
function updateVehiclePhysicsImpl(
  position: THREE.Vector3,
  rotationY: number,
  movement: CarMovement,
  delta: number,
  spinningOut: boolean = false,
  spinDirection: number = 1,
  boostFactor: number = 1.0
): PhysicsResult {
  // Copy of the original implementation
  const newPosition = new THREE.Vector3(position.x, position.y, position.z);
  
  // Simple implementation for now
  if (spinningOut) {
    movement.rotation += spinDirection * 0.1;
    movement.speed *= 0.95;
  } else {
    // Regular driving physics
    const maxSpeed = 15 * boostFactor;
    const acceleration = 20;
    const deceleration = 10;
    const turnSpeed = 2.5;
    
    // Apply acceleration or deceleration
    if (movement.forward !== 0) {
      movement.speed += movement.forward * acceleration * delta;
    } else {
      // Apply gradual deceleration when no input
      if (movement.speed > 0) {
        movement.speed -= deceleration * delta;
        if (movement.speed < 0) movement.speed = 0;
      } else if (movement.speed < 0) {
        movement.speed += deceleration * delta;
        if (movement.speed > 0) movement.speed = 0;
      }
    }
    
    // Apply handbrake
    if (movement.handbrake && Math.abs(movement.speed) > 0.5) {
      movement.speed *= 0.95;
      movement.tireSlip = 1.0;
    } else {
      movement.tireSlip = 0;
    }
    
    // Clamp speed to maximum
    movement.speed = Math.max(Math.min(movement.speed, maxSpeed), -maxSpeed/2);
    
    // Apply turning based on speed
    if (movement.turn !== 0 && Math.abs(movement.speed) > 0.5) {
      // Sharper turns at lower speeds
      const turnFactor = Math.max(0.2, Math.min(1.0, Math.abs(movement.speed) / maxSpeed));
      movement.rotation += movement.turn * turnSpeed * turnFactor * delta * (movement.speed > 0 ? 1 : -1);
    }
  }
  
  // Calculate movement vector
  const moveX = Math.sin(movement.rotation) * movement.speed * delta;
  const moveZ = Math.cos(movement.rotation) * movement.speed * delta;
  
  // Apply movement
  newPosition.x += moveX;
  newPosition.z += moveZ;
  
  return {
    position: newPosition,
    rotation: movement.rotation,
    speed: movement.speed,
    tireSlip: movement.tireSlip
  };
}

/**
 * Update object position based on physics
 * @param object - Reference to the object to move
 * @param newPosition - New position from physics calculation
 * @param newRotation - New rotation from physics calculation
 */
export const updateObjectPosition = (
  object: THREE.Object3D,
  newPosition: THREE.Vector3,
  newRotation: number
): void => {
  if (!object) return;
  
  // Apply rotation
  object.rotation.y = newRotation;
  
  // Apply position
  object.position.copy(newPosition);
};

/**
 * Check if we should create tire marks
 * @param movement - Movement state
 * @returns Whether to create effect
 */
export const shouldCreateTireEffect = (movement: CarMovement): boolean => {
  // Simplified conditions for tire marks
  return (
    (Math.abs(movement.tireSlip) > 0.02) || // Drifting
    movement.handbrake || // Handbraking
    (movement.forward < -0.7 && movement.speed > 5) // Hard braking
  );
}; 