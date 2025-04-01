import { blocks, ramps, bridges, mapSize } from "./map";
import { calculateHeightAtPosition } from "./calculate-height";

const carRadius = 0.26; // Approximate car collision radius
const FIXED_TIMESTEP = 1 / 60; // Fixed physics timestep (60 Hz)
const MAX_STEPS = 3; // Maximum number of physics steps per frame to prevent spiral of death
const MAX_FRAME_DELTA = 1 / 30; // Cap frame delta at 30fps to prevent physics spikes

// Physics state
let physicsTimeAccumulator = 0;
let lastPhysicsTime = 0;
let lastPhysicsState = null;

/**
 * Improved arcade-style vehicle physics
 * @param {Object} movement - Reference to movement state
 * @param {number} delta - Time delta from useFrame
 * @param {number} boostFactor - Optional boost multiplier (default: 1.0)
 * @returns {Object} Updated movement state
 */
export const updateVehiclePhysics = (movement, delta, boostFactor = 1.0) => {
  // Vehicle characteristics - reduced speeds by half
  const maxSpeed = 7.5 * boostFactor; // Boost affects max speed
  const maxReverseSpeed = 2.5; // Was 5
  const acceleration = 0.1 * boostFactor; // Boost affects acceleration
  const braking = 0.2; // Was 0.4
  const minBoostSpeed = 10; // Minimum speed when boosting

  // Increased deceleration for quicker stops
  const deceleration = 0.1; // Adjusted from 0.15

  // Base turn speed and speed-dependent factors
  const baseTurnSpeed = 0.06; // Reduced from 0.08 for smoother turning
  const minTurnSpeed = 0.03; // Reduced from 0.04 for smoother high-speed turns

  // Add movement smoothing
  if (!movement.smoothedSpeed) movement.smoothedSpeed = movement.speed;
  if (!movement.smoothedTurn) movement.smoothedTurn = movement.turn;

  // Smoothly interpolate speed and turn values
  const speedSmoothFactor = 0.2;
  const turnSmoothFactor = 0.15;
  movement.smoothedSpeed =
    movement.smoothedSpeed +
    (movement.speed - movement.smoothedSpeed) * speedSmoothFactor;
  movement.smoothedTurn =
    movement.smoothedTurn +
    (movement.turn - movement.smoothedTurn) * turnSmoothFactor;

  // Update speed based on input
  if (movement.forward > 0) {
    // Accelerating forward with smoothing
    movement.speed +=
      movement.forward *
      acceleration *
      (1 + 0.2 * Math.abs(movement.smoothedTurn));
  } else if (movement.forward < 0) {
    if (movement.speed > 0.5) {
      // Only allow braking if not boosting
      if (boostFactor === 1.0) {
        movement.speed -= braking * (1 - 0.3 * Math.abs(movement.smoothedTurn));
      }
    } else if (boostFactor === 1.0) {
      // Only allow reverse if not boosting
      movement.speed += movement.forward * acceleration * 0.7;
    }
  } else {
    // No input - only decelerate if not boosting
    if (boostFactor === 1.0) {
      if (movement.speed > 0) {
        // Apply stronger deceleration when not accelerating
        movement.speed -=
          deceleration * (1 - 0.2 * Math.abs(movement.smoothedTurn));
      } else if (movement.speed < 0) {
        movement.speed += deceleration;
      }

      // Ensure we come to a complete stop
      if (Math.abs(movement.speed) < deceleration) {
        movement.speed = 0;
      }
    }
  }

  // Handle boost transition
  if (boostFactor > 1.0) {
    // When boosting, ensure minimum speed
    movement.speed = Math.max(movement.speed, minBoostSpeed);
  } else if (boostFactor === 1.0 && movement.speed > maxSpeed) {
    // When boost ends, smoothly reduce speed to normal max
    movement.speed = Math.max(movement.speed - deceleration, maxSpeed);
  }

  // Clamp speed with smoothing
  movement.speed = Math.max(
    Math.min(movement.speed, maxSpeed),
    -maxReverseSpeed
  );

  // Update rotation based on speed and turning input with improved smoothing
  if (Math.abs(movement.smoothedSpeed) > 0.1) {
    // Calculate speed ratio (0 to 1) with smoothing and ensure it's not negative
    const speedRatio = Math.max(
      0,
      Math.min(1, Math.abs(movement.smoothedSpeed) / maxSpeed)
    );

    // Calculate turn speed based on current speed with improved curve
    const turnSpeedCurve = Math.pow(1 - speedRatio, 1.5); // More gradual reduction at high speeds
    const currentTurnSpeed = baseTurnSpeed * turnSpeedCurve + minTurnSpeed;

    // Apply turning with smoothed values
    movement.rotation +=
      movement.smoothedTurn *
      currentTurnSpeed *
      Math.sign(movement.smoothedSpeed);
  }

  return movement;
};

/**
 * Update player position based on physics
 * @param {Object} object - Reference to the object to move
 * @param {Object} movement - Movement state
 * @param {number} delta - Time delta from useFrame
 * @param {Object} players - Object containing all players' states
 */
export const updatePlayerPositionLocal = (object, movement, delta, players) => {
  if (!object) return;

  // Apply rotation
  object.rotation.y = movement.rotation;

  // Calculate movement vector
  const moveX = Math.sin(movement.rotation) * movement.speed * delta;
  const moveZ = Math.cos(movement.rotation) * movement.speed * delta;

  // Calculate new position
  const newX = object.position.x + moveX;
  const newZ = object.position.z + moveZ;

  let slideX = newX;
  let slideZ = newZ;

  // Check player collisions
  for (const otherPlayer of Object.values(players)) {
    if (otherPlayer.id === object.userData?.playerId || otherPlayer.lives <= 0)
      continue;

    const dx = Math.abs(newX - otherPlayer.position.x);
    const dz = Math.abs(newZ - otherPlayer.position.z);

    if (dx < carRadius * 2 && dz < carRadius * 2) {
      // Determine which side was hit and apply sliding collision response
      const relativeX = newX - otherPlayer.position.x;
      const relativeZ = newZ - otherPlayer.position.z;

      const penetrationX = carRadius * 2 - Math.abs(relativeX);
      const penetrationZ = carRadius * 2 - Math.abs(relativeZ);

      // Calculate slide direction - preserve momentum along the wall
      if (penetrationX < penetrationZ) {
        // Sliding along X axis (Z movement preserved)
        slideX =
          otherPlayer.position.x + (relativeX > 0 ? 1 : -1) * (carRadius * 2);
        // Keep Z movement (sliding)
        slideZ = newZ;
      } else {
        // Sliding along Z axis (X movement preserved)
        slideZ =
          otherPlayer.position.z + (relativeZ > 0 ? 1 : -1) * (carRadius * 2);
        // Keep X movement (sliding)
        slideX = newX;
      }

      // Apply a small speed reduction when sliding
      movement.speed *= 0.85;
      
      // Apply a bounce effect to make collisions more responsive
      const bounceForce = 0.3;
      if (penetrationX < penetrationZ) {
        movement.speed *= (1 - Math.abs(Math.sin(movement.rotation)) * bounceForce);
      } else {
        movement.speed *= (1 - Math.abs(Math.cos(movement.rotation)) * bounceForce);
      }
      
      break;
    }
  }

  // Calculate target height at new position
  const { height: targetHeight, collisionObject: newCollision } =
    calculateHeightAtPosition(newX, newZ, object.position.y);

  // Apply gravity
  const gravity = 9.8; // Gravity acceleration in m/s²
  const terminalVelocity = 20; // Maximum falling speed

  // Initialize vertical velocity if not exists
  if (movement.verticalVelocity === undefined) {
    movement.verticalVelocity = 0;
  }

  // Store current target height for wall collision detection
  const currentTargetHeight = calculateHeightAtPosition(
    object.position.x,
    object.position.z,
    object.position.y
  ).height;

  // Check for wall collision (significant height difference)
  const heightDifference = targetHeight - object.position.y;
  const isWallCollision = heightDifference > 1.0 && newCollision; // Threshold for wall detection

  if (isWallCollision) {
    // Wall collision detected - slide along the wall instead of climbing it
    // Find the direction parallel to the wall
    const wallNormalX = newX - object.position.x;
    const wallNormalZ = newZ - object.position.z;
    const wallLength = Math.sqrt(
      wallNormalX * wallNormalX + wallNormalZ * wallNormalZ
    );

    if (wallLength > 0) {
      const normalizedX = wallNormalX / wallLength;
      const normalizedZ = wallNormalZ / wallLength;

      // Project movement along the wall
      const dotProduct = moveX * normalizedX + moveZ * normalizedZ;

      // Calculate sliding vector (remove normal component)
      const slideVectorX = moveX - dotProduct * normalizedX;
      const slideVectorZ = moveZ - dotProduct * normalizedZ;

      // Apply sliding movement (reduced to prevent sticking to walls)
      slideX = object.position.x + slideVectorX * 0.8;
      slideZ = object.position.z + slideVectorZ * 0.8;

      // Recalculate height at slide position
      const slideHeight = calculateHeightAtPosition(
        slideX,
        slideZ,
        object.position.y
      ).height;

      // Only apply slide if it doesn't cause another wall collision
      if (Math.abs(slideHeight - currentTargetHeight) <= 1.0) {
        object.position.x = slideX;
        object.position.z = slideZ;
      } else {
        // If sliding also causes collision, just stop
        // Keep current position
      }

      // Reduce speed when hitting walls
      movement.speed *= 0.7;
    } else {
      // Fallback if calculation fails
      // Keep current position
    }
  } else if (newCollision) {
    // Regular collision but not a wall - apply sliding
    object.position.x = slideX;
    object.position.z = slideZ;
  } else {
    // No collision - normal movement
    object.position.x = newX;
    object.position.z = newZ;
  }

  // Apply gravity to vertical velocity
  movement.verticalVelocity -= gravity * delta;

  // Limit falling speed
  movement.verticalVelocity = Math.max(
    -terminalVelocity,
    movement.verticalVelocity
  );

  // Calculate new height
  const newHeight = object.position.y + movement.verticalVelocity * delta;

  // Get the current target height after position update
  const finalTargetHeight = calculateHeightAtPosition(
    object.position.x,
    object.position.z,
    object.position.y
  ).height;

  // Check if we've hit the ground
  if (newHeight <= finalTargetHeight) {
    // We've hit the ground
    object.position.y = finalTargetHeight;
    movement.verticalVelocity = 0;
  } else {
    // We're in the air
    object.position.y = newHeight;
  }
};

/**
 * Run physics with fixed timestep and interpolation
 * @param {Object} movement - Reference to movement state
 * @param {Object} object - Reference to the object to move
 * @param {number} delta - Time delta from useFrame
 * @param {number} boostFactor - Optional boost multiplier (default: 1.0)
 * @param {Object} players - Object containing all players' states
 * @returns {Object} Updated movement state
 */
export const runFixedStepPhysics = (
  movement,
  object,
  delta,
  boostFactor = 1.0,
  players
) => {
  const currentTime = performance.now();
  let frameDelta = (currentTime - lastPhysicsTime) / 1000; // Convert to seconds

  // Cap frame delta to prevent physics spikes
  frameDelta = Math.min(frameDelta, MAX_FRAME_DELTA);

  lastPhysicsTime = currentTime;

  // Accumulate time
  physicsTimeAccumulator += frameDelta;

  // Store previous state for interpolation
  if (lastPhysicsState) {
    object.position.copy(lastPhysicsState.position);
    object.rotation.copy(lastPhysicsState.rotation);
  }

  // Run physics steps
  let steps = 0;
  while (physicsTimeAccumulator >= FIXED_TIMESTEP && steps < MAX_STEPS) {
    updateVehiclePhysics(movement, FIXED_TIMESTEP, boostFactor);
    updatePlayerPositionLocal(object, movement, FIXED_TIMESTEP, players);
    physicsTimeAccumulator -= FIXED_TIMESTEP;
    steps++;
  }

  // If we still have remaining time, do one final update with the remaining delta
  if (physicsTimeAccumulator > 0 && steps < MAX_STEPS) {
    updateVehiclePhysics(movement, physicsTimeAccumulator, boostFactor);
    updatePlayerPositionLocal(
      object,
      movement,
      physicsTimeAccumulator,
      players
    );
    physicsTimeAccumulator = 0;
  }

  // Store current state for next frame's interpolation
  lastPhysicsState = {
    position: object.position.clone(),
    rotation: object.rotation.clone(),
  };

  return movement;
};
