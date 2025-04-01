import { blocks, ramps, bridges, mapSize, portals } from "./map";
import { hslToHex } from "./color";

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
 * Check if a position is on a ramp and calculate height
 * @param {number} x - X position to check
 * @param {number} z - Z position to check
 * @returns {number} Height at that position
 */
export const calculateHeightAtPosition = (x, z) => {
  // Check each ramp
  for (const ramp of ramps) {
    // Get ramp properties
    const [rampX, rampY, rampZ] = ramp.position;
    const rotation = Math.PI / 2 - ramp.rotation;
    const [scaleX, scaleY, scaleZ] = ramp.scale;

    // Adjust to ramp's local coordinates
    // First, shift to center of ramp
    const localX = x - rampX;
    const localZ = z - rampZ;

    // Then rotate around Y axis to align with ramp's orientation
    const cosRot = Math.cos(-rotation);
    const sinRot = Math.sin(-rotation);
    const rotatedX = localX * cosRot - localZ * sinRot;
    const rotatedZ = localX * sinRot + localZ * cosRot;

    // Handle different ramp orientations
    let rampWidth, rampLength;

    // Determine orientation based on the rotation value
    if (ramp.rotation === 0 || Math.abs(ramp.rotation) === Math.PI) {
      // Horizontal ramps (< or >)
      rampWidth = scaleZ;
      rampLength = scaleX;
    } else {
      // Vertical ramps (^ or v)
      rampWidth = scaleX;
      rampLength = scaleZ;
    }

    // Add extra width to make ramps wider in the perpendicular direction
    const extraWidth = carRadius;
    const effectiveRampWidth = rampWidth * (1 + extraWidth);

    // Scale to normalized ramp size (-0.5 to 0.5 in each dimension)
    // For width dimension, use the expanded width
    const normalizedX = rotatedX / effectiveRampWidth;
    const normalizedZ = rotatedZ / rampLength;

    // Check if point is within ramp bounds
    if (
      normalizedX >= -0.5 &&
      normalizedX <= 0.5 &&
      normalizedZ >= -0.5 &&
      normalizedZ <= 0.5
    ) {
      // Calculate height based on position on ramp
      // The slope always goes from back to front in local coordinates
      const heightPercentage = 0.5 - normalizedZ;
      const height = heightPercentage * scaleY;

      return rampY + height;
    }
  }

  // Check bridges
  for (const bridge of bridges) {
    const bridgeX = bridge.position[0];
    const bridgeY = bridge.position[1];
    const bridgeZ = bridge.position[2];
    const rotation = bridge.rotation || 0;
    const scale = bridge.scale || [1, 1, 1];

    // Bridge dimensions (based on Bridge.jsx)
    const bridgeWidth = scale[0];
    const bridgeHeight = 0.1; // Height of the bridge walkway
    const bridgeLength = scale[2];

    // Convert to bridge's local coordinates
    const localX = x - bridgeX;
    const localZ = z - bridgeZ;

    // Rotate to align with bridge orientation
    const cosRot = Math.cos(-rotation);
    const sinRot = Math.sin(-rotation);
    const rotatedX = localX * cosRot - localZ * sinRot;
    const rotatedZ = localX * sinRot + localZ * cosRot;

    // Check if point is within bridge bounds
    // For vertical bridges (rotation ~= PI/2), swap width and length
    const isVertical =
      Math.abs(rotation) === Math.PI / 2 ||
      Math.abs(rotation) === (3 * Math.PI) / 2;
    const effectiveWidth = isVertical ? bridgeLength : bridgeWidth;
    const effectiveLength = isVertical ? bridgeWidth : bridgeLength;

    if (
      Math.abs(rotatedX) <= effectiveWidth / 2 &&
      Math.abs(rotatedZ) <= effectiveLength / 2
    ) {
      // Bridge height is at bridgeY + half the bridge height (0.95 + 0.05)
      return bridgeY + 1;
    }
  }

  // Check blocks
  for (const block of blocks) {
    const blockHalfWidth = block.size.x / 2;
    const blockHalfDepth = block.size.z / 2;

    const dx = Math.abs(x - block.position.x);
    const dz = Math.abs(z - block.position.z);

    if (dx <= blockHalfWidth && dz <= blockHalfDepth) {
      return block.position.y + block.size.y;
    }
  }

  // Not on any ramp, block, or bridge
  return 0;
};

/**
 * Check if a position is under a bridge
 * @param {number} x - X position to check
 * @param {number} z - Z position to check
 * @param {number} y - Y position to check
 * @returns {boolean} Whether the position is under a bridge
 */
export const isUnderBridge = (x, z, y) => {
  for (const bridge of bridges) {
    const bridgeX = bridge.position[0];
    const bridgeY = bridge.position[1];
    const bridgeZ = bridge.position[2];
    const rotation = bridge.rotation || 0;
    const scale = bridge.scale || [1, 1, 1];

    // Bridge dimensions
    const bridgeWidth = scale[0];
    const bridgeLength = scale[2];

    // Convert to bridge's local coordinates
    const localX = x - bridgeX;
    const localZ = z - bridgeZ;

    // Rotate to align with bridge orientation
    const cosRot = Math.cos(-rotation);
    const sinRot = Math.sin(-rotation);
    const rotatedX = localX * cosRot - localZ * sinRot;
    const rotatedZ = localX * sinRot + localZ * cosRot;

    // Check if point is within bridge bounds horizontally and below bridge vertically
    // For vertical bridges (rotation ~= PI/2), swap width and length
    const isVertical =
      Math.abs(rotation) === Math.PI / 2 ||
      Math.abs(rotation) === (3 * Math.PI) / 2;
    const effectiveWidth = isVertical ? bridgeLength : bridgeWidth;
    const effectiveLength = isVertical ? bridgeWidth : bridgeLength;

    // Allow driving under bridge if the vertical distance is sufficient
    const verticalClearance = 0.01; // Minimum clearance needed to drive under
    if (
      Math.abs(rotatedX) <= effectiveWidth / 2 &&
      Math.abs(rotatedZ) <= effectiveLength / 2 &&
      y < bridgeY - verticalClearance // Check if there's enough clearance
    ) {
      return true;
    }
  }

  return false;
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

  // Check if we're under a bridge
  const underBridge = isUnderBridge(newX, newZ, object.position.y);

  let collidedWithBlock = false;
  let slideX = newX;
  let slideZ = newZ;

  // Check battle block collisions, but only if not driving on top and not under a bridge
  if (!underBridge) {
    for (const block of blocks) {
      const blockHalfWidth = block.size.x / 2;
      const blockHalfDepth = block.size.z / 2;

      const playerTooHighForCollision =
        block.position.y + block.size.y - 0.25 < object.position.y;
      if (playerTooHighForCollision) {
        continue;
      }

      const dx = Math.abs(newX - block.position.x);
      const dz = Math.abs(newZ - block.position.z);

      // Vertical collision check - allow if we're above the block
      if (dx < blockHalfWidth + carRadius && dz < blockHalfDepth + carRadius) {
        collidedWithBlock = true;

        // Determine which side was hit and apply sliding collision response
        const relativeX = newX - block.position.x;
        const relativeZ = newZ - block.position.z;

        const penetrationX = blockHalfWidth + carRadius - Math.abs(relativeX);
        const penetrationZ = blockHalfDepth + carRadius - Math.abs(relativeZ);

        // Calculate slide direction - preserve momentum along the wall
        if (penetrationX < penetrationZ) {
          // Sliding along X axis (Z movement preserved)
          slideX =
            block.position.x +
            (relativeX > 0 ? 1 : -1) * (blockHalfWidth + carRadius);
          // Keep Z movement (sliding)
          slideZ = newZ;
        } else {
          // Sliding along Z axis (X movement preserved)
          slideZ =
            block.position.z +
            (relativeZ > 0 ? 1 : -1) * (blockHalfDepth + carRadius);
          // Keep X movement (sliding)
          slideX = newX;
        }

        // Apply a small speed reduction when sliding
        movement.speed *= 0.95;
        break;
      }
    }
  }

  // Check player collisions
  if (!collidedWithBlock) {
    for (const otherPlayer of Object.values(players)) {
      if (
        otherPlayer.id === object.userData?.playerId ||
        otherPlayer.lives <= 0
      )
        continue;

      const dx = Math.abs(newX - otherPlayer.position.x);
      const dz = Math.abs(newZ - otherPlayer.position.z);

      if (dx < carRadius * 2 && dz < carRadius * 2) {
        collidedWithBlock = true;

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
        movement.speed *= 0.95;
        break;
      }
    }
  }

  // Calculate target height based on terrain
  let targetHeight = calculateHeightAtPosition(newX, newZ);
  const currentHeight = calculateHeightAtPosition(
    object.position.x,
    object.position.z
  );

  // Check if we're trying to go up a ramp from the side
  const heightDelta = targetHeight - currentHeight;
  //ramp conditional
  if (heightDelta > 0.1 && !underBridge) {
    // If we're trying to go up too steeply, slide along the ramp edge
    const rampSlideSpeed = 0.9; // Reduce speed when sliding along ramp

    // Try to move only in X direction
    const slideXPos = object.position.x + moveX;
    const slideXHeight = calculateHeightAtPosition(
      slideXPos,
      object.position.z
    );
    const slideXDelta = slideXHeight - currentHeight;

    // Try to move only in Z direction
    const slideZPos = object.position.z + moveZ;
    const slideZHeight = calculateHeightAtPosition(
      object.position.x,
      slideZPos
    );
    const slideZDelta = slideZHeight - currentHeight;

    // Choose the direction with less height change
    if (slideXDelta < 0.1) {
      object.position.x = slideXPos;
      movement.speed *= rampSlideSpeed;
      // Set target height to current height to prevent dropping
      targetHeight = currentHeight;
    } else if (slideZDelta < 0.1) {
      object.position.z = slideZPos;
      movement.speed *= rampSlideSpeed;
      // Set target height to current height to prevent dropping
      targetHeight = currentHeight;
    } else {
      // Can't slide in either direction, reduce speed
      movement.speed *= 0.95;
      // Set target height to current height to prevent dropping
      targetHeight = currentHeight;
    }
  } else if (collidedWithBlock) {
    // Apply sliding motion along walls
    object.position.x = slideX;
    object.position.z = slideZ;
  } else {
    // Normal movement
    object.position.x = newX;
    object.position.z = newZ;
  }

  // Store the last valid height to prevent dropping when letting go of controls
  if (movement.lastValidHeight === undefined) {
    movement.lastValidHeight = targetHeight;
  }

  // Apply gravity
  const gravity = 9.8; // Gravity acceleration in m/s²
  const terminalVelocity = 20; // Maximum falling speed

  // Initialize vertical velocity if not exists
  if (movement.verticalVelocity === undefined) {
    movement.verticalVelocity = 0;
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

  // Check if we're going down a ramp (current height > target height)
  if (currentHeight > targetHeight && !underBridge) {
    // Smoothly transition down the ramp
    const transitionSpeed = 5.0; // Adjust this value to control how quickly we follow the ramp
    const targetY = Math.max(0, targetHeight);

    // Interpolate between current height and target height
    object.position.y =
      object.position.y +
      (targetY - object.position.y) * Math.min(1, transitionSpeed * delta);

    // Reset vertical velocity when on a ramp to prevent bouncing
    movement.verticalVelocity = Math.min(0, movement.verticalVelocity);
  }
  // Check if we've hit the ground
  else if (newHeight <= targetHeight) {
    // We've hit the ground
    object.position.y = targetHeight;
    movement.verticalVelocity = 0;
  } else {
    // We're in the air
    object.position.y = newHeight;
  }

  // Update last valid height
  movement.lastValidHeight = targetHeight;

  // Handle multi-level bridges and blocks
  if (underBridge) {
    // Get the ground level or the level we should be at
    // We need to find the highest surface below us that isn't the bridge
    let groundLevel = 0;

    // Check if we're on top of any blocks
    for (const block of blocks) {
      const blockHalfWidth = block.size.x / 2;
      const blockHalfDepth = block.size.z / 2;

      const dx = Math.abs(object.position.x - block.position.x);
      const dz = Math.abs(object.position.z - block.position.z);

      // If we're above this block and it's below the bridge
      if (
        dx < blockHalfWidth &&
        dz < blockHalfDepth &&
        block.position.y < object.position.y
      ) {
        // Update ground level if this block is higher
        groundLevel = Math.max(groundLevel, block.position.y + block.size.y);
      }
    }

    // Keep us at the appropriate level when under a bridge
    object.position.y = groundLevel;

    // Prevent upward movement when under a bridge
    movement.verticalVelocity = Math.min(0, movement.verticalVelocity);

    // Check for collisions with blocks at our current level
    for (const block of blocks) {
      const blockHalfWidth = block.size.x / 2;
      const blockHalfDepth = block.size.z / 2;

      // Skip blocks that are too high or too low for collision
      const blockTop = block.position.y + block.size.y;
      const playerBottom = object.position.y;
      const playerTop = object.position.y + 0.5; // Approximate player height

      // Only check collision if block is at our level
      if (blockTop > playerBottom && block.position.y < playerTop) {
        const dx = Math.abs(object.position.x - block.position.x);
        const dz = Math.abs(object.position.z - block.position.z);

        if (
          dx < blockHalfWidth + carRadius &&
          dz < blockHalfDepth + carRadius
        ) {
          // Apply sliding collision response
          const relativeX = object.position.x - block.position.x;
          const relativeZ = object.position.z - block.position.z;

          const penetrationX = blockHalfWidth + carRadius - Math.abs(relativeX);
          const penetrationZ = blockHalfDepth + carRadius - Math.abs(relativeZ);

          if (penetrationX < penetrationZ) {
            object.position.x =
              block.position.x +
              (relativeX > 0 ? 1 : -1) * (blockHalfWidth + carRadius);
          } else {
            object.position.z =
              block.position.z +
              (relativeZ > 0 ? 1 : -1) * (blockHalfDepth + carRadius);
          }

          // Reduce speed when hitting walls
          movement.speed *= 0.9;
          break;
        }
      }
    }
  }

  // Check portal collisions
  for (const portal of portals) {
    const portalX = portal.position[0];
    const portalZ = portal.position[2];
    const portalWidth = portal.width || 1;
    const portalHalfWidth = portalWidth / 2;

    const dx = Math.abs(object.position.x - portalX);
    const dz = Math.abs(object.position.z - portalZ);

    if (dx <= portalHalfWidth && dz <= 0.5) {
      const player = players[object.userData?.playerId];
      const playerColor = player.color;
      const hexColor = hslToHex(playerColor);
      const playerName = player.name || "Player";
      const targetUrl = `https://portal.pieter.com?ref=https://drive.alexandfinn.com&color=${encodeURIComponent(
        hexColor
      )}&username=${encodeURIComponent(playerName)}`;
      window.location.href = targetUrl;
      return;
    }
  }
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
