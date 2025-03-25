import { ARENA_SIZE, ARENA_HALF_SIZE, BATTLE_BLOCKS } from './gameConfig';

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
  const baseTurnSpeed = 0.08; // Higher base turn speed
  const minTurnSpeed = 0.04; // Minimum turn speed at max velocity

  // Update speed based on input
  if (movement.forward > 0) {
    // Accelerating forward
    movement.speed += movement.forward * acceleration;
  } else if (movement.forward < 0) {
    if (movement.speed > 0.5) {
      // Reduced threshold from 1
      // Only allow braking if not boosting
      if (boostFactor === 1.0) {
        movement.speed -= braking;
      }
    } else if (boostFactor === 1.0) {
      // Only allow reverse if not boosting
      // Accelerating in reverse
      movement.speed += movement.forward * acceleration * 0.7;
    }
  } else {
    // No input - only decelerate if not boosting
    if (boostFactor === 1.0) {
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
  }

  // Enforce minimum speed when boosting
  if (boostFactor > 1.0) {
    movement.speed = Math.max(movement.speed, minBoostSpeed);
  }

  // Clamp speed
  movement.speed = Math.max(
    Math.min(movement.speed, maxSpeed),
    -maxReverseSpeed
  );

  // Update rotation based on speed and turning input
  if (Math.abs(movement.speed) > 0.1) {
    // Calculate speed ratio (0 to 1)
    const speedRatio = Math.abs(movement.speed) / maxSpeed;

    // Calculate turn speed based on current speed
    // - At low speeds: use baseTurnSpeed for tight turning
    // - At high speeds: reduce to minTurnSpeed for stability
    const currentTurnSpeed =
      baseTurnSpeed - speedRatio * (baseTurnSpeed - minTurnSpeed);

    // Apply turning with speed-dependent turn rate
    movement.rotation +=
      movement.turn * currentTurnSpeed * Math.sign(movement.speed);
  }

  return movement;
};

/**
 * Update object position based on physics
 * @param {Object} object - Reference to the object to move
 * @param {Object} movement - Movement state
 * @param {number} delta - Time delta from useFrame
 */
export const updateObjectPosition = (object, movement, delta) => {
  if (!object) return;

  // Apply rotation
  object.rotation.y = movement.rotation;

  // Calculate movement vector
  const moveX = Math.sin(movement.rotation) * movement.speed * delta;
  const moveZ = Math.cos(movement.rotation) * movement.speed * delta;

  // Calculate new position
  const newX = object.position.x + moveX;
  const newZ = object.position.z + moveZ;

  // Arena boundaries
  const wallThickness = 1;
  const carRadius = 0.5; // Approximate car collision radius

  // Check wall collisions
  const buffer = carRadius + wallThickness / 2;
  if (newX < -ARENA_HALF_SIZE + buffer && moveX < 0) return; // Left wall
  if (newX > ARENA_HALF_SIZE - buffer && moveX > 0) return; // Right wall
  if (newZ < -ARENA_HALF_SIZE + buffer && moveZ < 0) return; // Front wall
  if (newZ > ARENA_HALF_SIZE - buffer && moveZ > 0) return; // Back wall

  // Check battle block collisions
  for (const block of BATTLE_BLOCKS.positions) {
    const blockHalfSize = BATTLE_BLOCKS.size / 2;
    const dx = Math.abs(newX - block.x);
    const dz = Math.abs(newZ - block.z);
    
    if (dx < blockHalfSize + carRadius && dz < blockHalfSize + carRadius) {
      // Determine which side was hit
      if (dx > dz) {
        // Hit vertical side
        if (newX < block.x) {
          object.position.x = block.x - blockHalfSize - carRadius;
        } else {
          object.position.x = block.x + blockHalfSize + carRadius;
        }
      } else {
        // Hit horizontal side
        if (newZ < block.z) {
          object.position.z = block.z - blockHalfSize - carRadius;
        } else {
          object.position.z = block.z + blockHalfSize + carRadius;
        }
      }
      return;
    }
  }

  // Apply movement if no collision
  object.position.x = newX;
  object.position.z = newZ;

  // Keep car on the ground
  object.position.y = 0.1;
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
