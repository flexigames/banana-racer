import { ramps, bridges, blocks } from "./map";

const carRadius = 1;

export const calculateHeightAtPosition = (x, z, lastY) => { 
  // Check bridges
  for (const bridge of bridges) {
    const bridgeX = bridge.position[0];
    const bridgeY = bridge.position[1];
    const bridgeZ = bridge.position[2];

    if (lastY !== undefined && lastY < bridgeY) {
      continue;
    }

    const rotation = bridge.rotation || 0;
    const scale = bridge.scale || [1, 1, 1];

    // Bridge dimensions (based on Bridge.jsx)
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
      return {
        height: bridgeY + 1,
        collisionObject: {
          position: bridge.position,
          scale: [effectiveWidth, scale[1], effectiveLength],
        },
      };
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

      // Determine the scale based on rotation
      const collisionScale =
        ramp.rotation === 0 || Math.abs(ramp.rotation) === Math.PI
          ? [rampLength, scaleY, effectiveRampWidth] // Horizontal ramps
          : [effectiveRampWidth, scaleY, rampLength]; // Vertical ramps

      return {
        height: rampY + height,
        collisionObject: {
          position: ramp.position,
          scale: collisionScale,
        },
      };
    }
  }

  // Check blocks
  for (const block of blocks) {
    const blockHalfWidth = block.size.x / 2;
    const blockHalfDepth = block.size.z / 2;

    const dx = Math.abs(x - block.position.x);
    const dz = Math.abs(z - block.position.z);

    if (dx <= blockHalfWidth && dz <= blockHalfDepth) {
      return {
        height: block.position.y + block.size.y,
        collisionObject: {
          position: [block.position.x, block.position.y, block.position.z],
          scale: [block.size.x, block.size.y, block.size.z],
        },
      };
    }
  }

  // Not on any ramp, block, or bridge
  return {
    height: 0,
    collisionObject: null,
  };
};
