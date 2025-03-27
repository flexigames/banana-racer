import { blocks, ramps, bridges, mapSize } from "./map";

const carRadius = 0.2; // Approximate car collision radius

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
  movement.smoothedSpeed = movement.smoothedSpeed + (movement.speed - movement.smoothedSpeed) * speedSmoothFactor;
  movement.smoothedTurn = movement.smoothedTurn + (movement.turn - movement.smoothedTurn) * turnSmoothFactor;

  // Update speed based on input
  if (movement.forward > 0) {
    // Accelerating forward with smoothing
    movement.speed += movement.forward * acceleration * (1 + 0.2 * Math.abs(movement.smoothedTurn));
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
        movement.speed -= deceleration * (1 - 0.2 * Math.abs(movement.smoothedTurn));
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

  // Clamp speed with smoothing
  movement.speed = Math.max(
    Math.min(movement.speed, maxSpeed),
    -maxReverseSpeed
  );

  // Update rotation based on speed and turning input with improved smoothing
  if (Math.abs(movement.smoothedSpeed) > 0.1) {
    // Calculate speed ratio (0 to 1) with smoothing
    const speedRatio = Math.abs(movement.smoothedSpeed) / maxSpeed;

    // Calculate turn speed based on current speed with improved curve
    const turnSpeedCurve = Math.pow(1 - speedRatio, 1.5); // More gradual reduction at high speeds
    const currentTurnSpeed = baseTurnSpeed * turnSpeedCurve + minTurnSpeed;

    // Apply turning with smoothed values
    movement.rotation += movement.smoothedTurn * currentTurnSpeed * Math.sign(movement.smoothedSpeed);
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
  // Check each block first
  for (const block of blocks) {
    const blockHalfWidth = block.size.x / 2;
    const blockHalfDepth = block.size.z / 2;

    const dx = Math.abs(x - block.position.x);
    const dz = Math.abs(z - block.position.z);

    if (dx <= blockHalfWidth && dz <= blockHalfDepth) {
      return block.position.y + block.size.y;
    }
  }

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

      return height;
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

  // Check if we're under a bridge
  const underBridge = isUnderBridge(newX, newZ, object.position.y);

  // Check wall collisions
  const highEnough = object.position.y >= 2 - 0.25;

  let collidedWithBlock = false;
  let slideX = newX;
  let slideZ = newZ;

  // Check battle block collisions, but only if not driving on top and not under a bridge
  if (!highEnough && !underBridge) {
    for (const block of blocks) {
      const blockHalfWidth = block.size.x / 2;
      const blockHalfDepth = block.size.z / 2;

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
    object.position.y = object.position.y + (targetY - object.position.y) * Math.min(1, transitionSpeed * delta);
    
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

  // Fix for teleporting to bridge top when under bridge
  if (underBridge) {
    // Ensure we stay at ground level when under a bridge
    object.position.y = 0;
    
    // Prevent any upward movement when under a bridge
    movement.verticalVelocity = Math.min(0, movement.verticalVelocity);
    
    // Check if we're colliding with blocks while under a bridge
    for (const block of blocks) {
      const blockHalfWidth = block.size.x / 2;
      const blockHalfDepth = block.size.z / 2;

      const dx = Math.abs(object.position.x - block.position.x);
      const dz = Math.abs(object.position.z - block.position.z);

      if (dx < blockHalfWidth + carRadius && dz < blockHalfDepth + carRadius) {
        // Apply sliding collision response
        const relativeX = object.position.x - block.position.x;
        const relativeZ = object.position.z - block.position.z;

        const penetrationX = blockHalfWidth + carRadius - Math.abs(relativeX);
        const penetrationZ = blockHalfDepth + carRadius - Math.abs(relativeZ);

        if (penetrationX < penetrationZ) {
          object.position.x = block.position.x + (relativeX > 0 ? 1 : -1) * (blockHalfWidth + carRadius);
        } else {
          object.position.z = block.position.z + (relativeZ > 0 ? 1 : -1) * (blockHalfDepth + carRadius);
        }
        
        // Reduce speed when hitting walls under bridge
        movement.speed *= 0.9;
        break;
      }
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
