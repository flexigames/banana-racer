import { calculateHeightAtPosition } from "./calculate-height";

const carRadius = 1; // Approximate car collision radius
const FIXED_TIMESTEP = 1 / 60; // Fixed physics timestep (60 Hz)
const MAX_STEPS = 3; // Maximum number of physics steps per frame to prevent spiral of death
const MAX_FRAME_DELTA = 1 / 30; // Cap frame delta at 30fps to prevent physics spikes

// Physics state
let physicsTimeAccumulator = 0;
let lastPhysicsTime = 0;
let lastPhysicsState = null;
const gravity = 9.8; // Gravity acceleration in m/s²
const terminalVelocity = 20; // Maximum falling speed

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
 * @param {Object} player - Reference to the object to move
 * @param {Object} movement - Movement state
 * @param {number} delta - Time delta from useFrame
 * @param {Object} players - Object containing all players' states
 */
export const updatePlayerPositionLocal = (player, movement, delta, players) => {
  if (!player) return;

  // Apply rotation
  player.rotation.y = movement.rotation;

  // Calculate movement vector
  const moveX = Math.sin(movement.rotation) * movement.speed * delta;
  const moveZ = Math.cos(movement.rotation) * movement.speed * delta;

  // Update position
  const newPosition = {
    x: player.position.x + moveX,
    y: player.position.y, // Will be updated below
    z: player.position.z + moveZ,
  };

  // Calculate target height based on terrain
  const { height: targetHeight, collisionObject } = calculateHeightAtPosition(
    newPosition.x,
    newPosition.z,
    player.position.y
  );
  if (targetHeight < player.position.y) {
    if (player.verticalVelocity === undefined) {
      player.verticalVelocity = 0;
    }

    player.verticalVelocity -= gravity * FIXED_TIMESTEP;
    player.verticalVelocity = Math.max(
      -terminalVelocity,
      player.verticalVelocity
    );

    const newHeightBasedOnGravity =
      player.position.y + player.verticalVelocity * FIXED_TIMESTEP;

    newPosition.y = Math.max(targetHeight, newHeightBasedOnGravity);

    player.position.x = newPosition.x;
    player.position.z = newPosition.z;
    player.position.y = newPosition.y;

    return;
  }

  const heightDelta = 0.1;
  if (targetHeight <= player.position.y + heightDelta) {
    player.verticalVelocity = 0;
    newPosition.y = targetHeight;
    player.position.x = newPosition.x;
    player.position.z = newPosition.z;
    player.position.y = newPosition.y;

    return;
  }

  if (collisionObject) {
    const collisionObjectPosition = collisionObject.position;
    const collisionObjectScale = collisionObject.scale;

    const collisionObjectHalfWidth = collisionObjectScale[0] / 2;
    const collisionObjectHalfDepth = collisionObjectScale[2] / 2;

    const carTooHighForCollision =
      collisionObjectPosition[1] + collisionObjectScale[1] - 0.25 <
      player.position.y;
    if (!carTooHighForCollision) {
      // Determine which side was hit based on relative position and penetration depth
      const relativeX = newPosition.x - collisionObjectPosition[0];
      const relativeZ = newPosition.z - collisionObjectPosition[2];

      // Calculate penetration depth in both axes
      const penetrationX =
        collisionObjectHalfWidth + carRadius - Math.abs(relativeX);
      const penetrationZ =
        collisionObjectHalfDepth + carRadius - Math.abs(relativeZ);

      // If penetration is smaller in X axis, we're hitting a Z-aligned wall (left/right)
      // If penetration is smaller in Z axis, we're hitting an X-aligned wall (front/back)
      const isHittingAXWall = penetrationX < penetrationZ;

      if (penetrationX === penetrationZ) {
        newPosition.x = player.position.x;
        newPosition.z = player.position.z;
      } else if (isHittingAXWall) {
        newPosition.x = player.position.x;
        newPosition.z = player.position.z + moveZ;
      } else {
        newPosition.z = player.position.z;
        newPosition.x = player.position.x + moveX;
      }

      // Apply a small speed reduction when sliding
      movement.speed *= 0.95;
    }
  }

  player.position.x = newPosition.x;
  player.position.z = newPosition.z;
  player.position.y = newPosition.y;

  // // Calculate new position
  // const newX = object.position.x + moveX;
  // const newZ = object.position.z + moveZ;

  // const { height: targetHeight, collisionObject } = calculateHeightAtPosition(
  //   newX,
  //   newZ,
  //   object.position.y
  // );

  // // Get current height
  // const currentHeight = object.position.y;

  // // Check if the height difference is small enough to allow the player to go up
  // const heightDifference = Math.abs(targetHeight - currentHeight);
  // const smallHeightThreshold = 0.1;

  // console.log(targetHeight, currentHeight);

  // // If height difference is small or we're going up, update position
  // if (
  //   heightDifference <= smallHeightThreshold &&
  //   targetHeight > currentHeight
  // ) {
  //   object.position.y = targetHeight;
  //   object.position.x = newX;
  //   object.position.z = newZ;
  //   return; // Skip collision checks below if we've already moved
  // }

  // if (collisionObject) {
  //   const collisionObjectHalfWidth = collisionObject.scale[0] / 2;
  //   const collisionObjectHalfDepth = collisionObject.scale[2] / 2;

  //   const dx = Math.abs(newX - collisionObject.position[0]);
  //   const dz = Math.abs(newZ - collisionObject.position[2]);

  //   // Vertical collision check - allow if we're above the block
  //   if (
  //     dx < collisionObjectHalfWidth + carRadius &&
  //     dz < collisionObjectHalfDepth + carRadius
  //   ) {
  //     // Determine which side was hit and apply sliding collision response
  //     const relativeX = newX - collisionObject.position[0];
  //     const relativeZ = newZ - collisionObject.position[2];

  //     const penetrationX =
  //       collisionObjectHalfWidth + carRadius - Math.abs(relativeX);
  //     const penetrationZ =
  //       collisionObjectHalfDepth + carRadius - Math.abs(relativeZ);

  //     // Calculate slide direction - preserve momentum along the wall
  //     if (penetrationX < penetrationZ) {
  //       // Sliding along X axis (Z movement preserved)
  //       object.position.x =
  //         collisionObject.position[0] +
  //         (relativeX > 0 ? 1 : -1) * (collisionObjectHalfWidth + carRadius);
  //       // Keep Z movement (sliding)
  //       object.position.z = newZ;
  //     } else {
  //       // Sliding along Z axis (X movement preserved)
  //       object.position.z =
  //         collisionObject.position[2] +
  //         (relativeZ > 0 ? 1 : -1) * (collisionObjectHalfDepth + carRadius);
  //       // Keep X movement (sliding)
  //       object.position.x = newX;
  //     }

  //     // Apply a small speed reduction when sliding
  //     movement.speed *= 0.95;
  //   }
  // } else {
  //   object.position.x = newX;
  //   object.position.z = newZ;
  // }

  // // Check player collisions
  // if (!collidedWithBlock) {
  //   for (const otherPlayer of Object.values(players)) {
  //     if (
  //       otherPlayer.id === object.userData?.playerId ||
  //       otherPlayer.lives <= 0
  //     )
  //       continue;

  //     const dx = Math.abs(newX - otherPlayer.position.x);
  //     const dz = Math.abs(newZ - otherPlayer.position.z);

  //     if (dx < carRadius * 2 && dz < carRadius * 2) {
  //       collidedWithBlock = true;

  //       // Determine which side was hit and apply sliding collision response
  //       const relativeX = newX - otherPlayer.position.x;
  //       const relativeZ = newZ - otherPlayer.position.z;

  //       const penetrationX = carRadius * 2 - Math.abs(relativeX);
  //       const penetrationZ = carRadius * 2 - Math.abs(relativeZ);

  //       // Calculate slide direction - preserve momentum along the wall
  //       if (penetrationX < penetrationZ) {
  //         // Sliding along X axis (Z movement preserved)
  //         slideX =
  //           otherPlayer.position.x + (relativeX > 0 ? 1 : -1) * (carRadius * 2);
  //         // Keep Z movement (sliding)
  //         slideZ = newZ;
  //       } else {
  //         // Sliding along Z axis (X movement preserved)
  //         slideZ =
  //           otherPlayer.position.z + (relativeZ > 0 ? 1 : -1) * (carRadius * 2);
  //         // Keep X movement (sliding)
  //         slideX = newX;
  //       }

  //       // Apply a small speed reduction when sliding
  //       movement.speed *= 0.95;
  //       break;
  //     }
  //   }
  // }

  // // Apply gravity
  // const gravity = 9.8; // Gravity acceleration in m/s²
  // const terminalVelocity = 20; // Maximum falling speed

  // // Initialize vertical velocity if not exists
  // if (movement.verticalVelocity === undefined) {
  //   movement.verticalVelocity = 0;
  // }

  // // Apply gravity to vertical velocity
  // movement.verticalVelocity -= gravity * delta;

  // // Limit falling speed
  // movement.verticalVelocity = Math.max(
  //   -terminalVelocity,
  //   movement.verticalVelocity
  // );

  // // Calculate new height
  // const newHeight = object.position.y + movement.verticalVelocity * delta;

  // // Check if we're going down a ramp (current height > target height)
  // if (object.position.y > targetHeight) {
  //   // Smoothly transition down the ramp
  //   const transitionSpeed = 5.0; // Adjust this value to control how quickly we follow the ramp
  //   const targetY = Math.max(0, targetHeight);

  //   // Interpolate between current height and target height
  //   object.position.y =
  //     object.position.y +
  //     (targetY - object.position.y) * Math.min(1, transitionSpeed * delta);

  //   // Reset vertical velocity when on a ramp to prevent bouncing
  //   movement.verticalVelocity = Math.min(0, movement.verticalVelocity);
  // }
  // // Check if we've hit the ground
  // else if (newHeight <= targetHeight) {
  //   // We've hit the ground
  //   object.position.y = targetHeight;
  //   movement.verticalVelocity = 0;
  // } else {
  //   // We're in the air
  //   object.position.y = newHeight;
  // }
};

/**
 * Check if we should create tire marks
 * @param {Object} movement - Movement state
 * @returns {boolean} Whether to create effect
 */
export const shouldCreateTireEffect = (movement) => {
  // Simplified conditions for tire marks
  return (
    Math.abs(movement.tireSlip) > 0.02 || // Drifting
    movement.handbrake || // Handbraking
    (movement.forward < -0.7 && movement.speed > 5) // Hard braking
  );
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
