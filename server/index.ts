import { createServer } from "http";
import { Server, Socket } from "socket.io";
import { v4 as uuidv4 } from "uuid";
import { GameState, ItemBox, Position, ITEM_TYPES, Color } from "./types";
import { blocks, ramps, bridges, itemBoxes, mapSize } from "./map";

const PORT = process.env.PORT || 8080;
const carRadius = 0.26;
const bananaRadius = 0.1;
const cubeRadius = 0.2;
const shellRadius = 0.2;
const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["*"],
    credentials: true,
  },
});

const ITEM_PROBABILITIES = {
  [ITEM_TYPES.BANANA]: 5,
  [ITEM_TYPES.BOOST]: 2,
  [ITEM_TYPES.FAKE_CUBE]: 2,
  [ITEM_TYPES.GREEN_SHELL]: 5,
  [ITEM_TYPES.STAR]: 1,
  [ITEM_TYPES.THREE_BANANAS]: 500,
  [ITEM_TYPES.THREE_GREEN_SHELLS]: 5,
};

const gameState: GameState = {
  players: {},
  bananas: {},
  fakeCubes: {},
  greenShells: {},
  itemBoxes: [],
};

const trailingItemDistanceBehind = 0.5;

function generateRandomColor(): Color {
  return {
    h: Math.random(),
    s: 0.65,
    l: 0.55,
  };
}

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function generateBananaId(): string {
  return generateId("banana");
}

function generateFakeCubeId(): string {
  return generateId("fake_cube");
}

function generateGreenShellId(): string {
  return `green_shell_${uuidv4()}`;
}

function getRandomSpawnPosition(): Position {
  const mapSize = 40;
  let x: number, z: number;
  do {
    x = (Math.random() - 0.5) * mapSize;
    z = (Math.random() - 0.5) * mapSize;
  } while (Math.sqrt(x * x + z * z) < 5); // Ensure not too close to origin

  return {
    x,
    y: 0,
    z,
  };
}

function initializePlayer(playerId: string): void {
  const player = gameState.players[playerId];
  player.position = getRandomSpawnPosition();
  player.rotation = Math.random() * Math.PI * 2;
  player.speed = 0;
  player.lives = 3;
  player.item = { type: ITEM_TYPES.BANANA, quantity: 0 };
  player.trailingItem = undefined;
  player.isSpinning = false;
  player.isBoosted = false;
  player.isItemSpinning = false;
  player.isStarred = false;
  player.activeItem = undefined;
}

function onHit(playerId: string, duration: number = 3000): void {
  const player = gameState.players[playerId];
  if (!player || player.lives <= 0 || player.isSpinning || player.isStarred)
    return;

  player.lives--;
  player.item = { type: ITEM_TYPES.BANANA, quantity: 0 };
  player.isSpinning = true;

  setTimeout(() => {
    if (gameState.players[playerId]) {
      gameState.players[playerId].isSpinning = false;
    }
  }, duration);
}

/**
 * Check if a position is on a ramp and calculate height
 * @param x - X position to check
 * @param z - Z position to check
 * @returns Height at that position
 */
export const calculateHeightAtPosition = (x: number, z: number) => {
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
 * @param x - X position to check
 * @param z - Z position to check
 * @param y - Y position to check
 * @returns Whether the position is under a bridge
 */
function isUnderBridge(x: number, z: number, y: number): boolean {
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
}

function updatePlayerPosition(
  playerId: string,
  data: { position: Position; rotation: number; speed?: number }
): void {
  if (!gameState.players[playerId]) return;

  const player = gameState.players[playerId];

  player.position = data.position;
  player.rotation = data.rotation;
  if (data.speed !== undefined) {
    player.speed = data.speed;
  }
  player.lastUpdate = Date.now();

  if (player.trailingItem) {
    const distanceBehind = trailingItemDistanceBehind;
    const offsetX = -Math.sin(player.rotation) * distanceBehind;
    const offsetZ = -Math.cos(player.rotation) * distanceBehind;

    const underBridge = isUnderBridge(
      player.position.x + offsetX,
      player.position.z + offsetZ,
      player.position.y
    );
    const heightAtPosition = calculateHeightAtPosition(
      player.position.x + offsetX,
      player.position.z + offsetZ
    );

    player.trailingItem.position = {
      x: player.position.x + offsetX,
      y: underBridge ? player.position.y : heightAtPosition,
      z: player.position.z + offsetZ,
    };
    player.trailingItem.rotation = player.rotation;
  }
}

function dropItem(
  playerId: string,
  data: { position: Position; rotation?: number },
  itemType: string
): void {
  const itemId =
    itemType === ITEM_TYPES.BANANA ? generateBananaId() : generateFakeCubeId();

  const underBridge = isUnderBridge(
    data.position.x,
    data.position.z,
    data.position.y
  );
  const heightAtPosition = calculateHeightAtPosition(
    data.position.x,
    data.position.z
  );
  const item = {
    id: itemId,
    position: {
      ...data.position,
      y: underBridge ? data.position.y : heightAtPosition,
    },
    rotation: data.rotation || 0,
    droppedBy: playerId,
    droppedAt: Date.now(),
  };

  const collection =
    itemType === ITEM_TYPES.BANANA ? gameState.bananas : gameState.fakeCubes;
  collection[itemId] = item;

  setTimeout(() => {
    if (collection[itemId]) {
      delete collection[itemId];
    }
  }, 120000);
}

function dropGreenShell(
  playerId: string,
  data: { position: Position; rotation: number }
): void {
  const shellId = generateGreenShellId();

  const underBridge = isUnderBridge(
    data.position.x,
    data.position.z,
    data.position.y
  );
  const heightAtPosition = calculateHeightAtPosition(
    data.position.x,
    data.position.z
  );

  const shell = {
    id: shellId,
    position: {
      ...data.position,
      y: underBridge ? data.position.y : heightAtPosition,
    },
    rotation: data.rotation,
    direction: data.rotation,
    speed: 16,
    droppedBy: playerId,
    droppedAt: Date.now(),
    bounces: 0,
    verticalVelocity: 0,
    canHitOwner: false,
  };

  gameState.greenShells[shellId] = shell;

  // Allow self-hits after 200ms
  setTimeout(() => {
    if (gameState.greenShells[shellId]) {
      gameState.greenShells[shellId].canHitOwner = true;
    }
  }, 300);

  setTimeout(() => {
    if (gameState.greenShells[shellId]) {
      delete gameState.greenShells[shellId];
    }
  }, 10000);
}

function useItem(playerId: string): void {
  const player = gameState.players[playerId];
  if (!player) return;

  // Handle trailing item first
  if (player.trailingItem) {
    const { type, position } = player.trailingItem;
    console.log("Using trailing item:", type);
    const dropData = {
      position,
      rotation: player.rotation,
    };
    if (player.trailingItem.quantity > 1) {
      player.trailingItem.quantity--;
    } else {
      player.trailingItem = undefined;
    }

    switch (type) {
      case ITEM_TYPES.THREE_BANANAS:
        dropItem(playerId, dropData, ITEM_TYPES.BANANA);
        break;
      case ITEM_TYPES.THREE_GREEN_SHELLS:
        dropGreenShell(playerId, dropData);
        break;
      case ITEM_TYPES.BANANA:
        dropItem(playerId, dropData, ITEM_TYPES.BANANA);
        break;
      case ITEM_TYPES.FAKE_CUBE:
        dropItem(playerId, dropData, ITEM_TYPES.FAKE_CUBE);
        break;
      case ITEM_TYPES.GREEN_SHELL:
        dropGreenShell(playerId, dropData);
        break;
    }
    return;
  }

  // Handle item in slot
  if (player.item?.quantity > 0) {
    const itemType = player.item.type;
    console.log("Activating item:", itemType);
    player.item = { type: ITEM_TYPES.BANANA, quantity: 0 };

    if (itemType === ITEM_TYPES.BOOST) {
      player.isBoosted = true;
      setTimeout(() => {
        if (gameState.players[playerId]) {
          gameState.players[playerId].isBoosted = false;
        }
      }, 1000);
    } else if (itemType === ITEM_TYPES.STAR) {
      // Activate star power-up
      player.isStarred = true;
      const starDuration = 8000;
      // Star power-up lasts for 8 seconds
      setTimeout(() => {
        if (gameState.players[playerId]) {
          const player = gameState.players[playerId];
          player.isStarred = false;
          // Ensure player is not in a spinning state when star wears off
          player.isSpinning = false;
          player.isItemSpinning = false;
          // Reset any active items
          player.activeItem = undefined;
        }
      }, starDuration);
    } else {
      const distanceBehind = trailingItemDistanceBehind;
      const offsetX = -Math.sin(player.rotation) * distanceBehind;
      const offsetZ = -Math.cos(player.rotation) * distanceBehind;

      const underBridge = isUnderBridge(
        player.position.x + offsetX,
        player.position.z + offsetZ,
        player.position.y
      );
      const heightAtPosition = calculateHeightAtPosition(
        player.position.x + offsetX,
        player.position.z + offsetZ
      );

      player.trailingItem = {
        type: itemType,
        position: {
          x: player.position.x + offsetX,
          y: underBridge ? player.position.y : heightAtPosition,
          z: player.position.z + offsetZ,
        },
        rotation: player.rotation,
        quantity:
          itemType === ITEM_TYPES.THREE_BANANAS ||
          itemType === ITEM_TYPES.THREE_GREEN_SHELLS
            ? 3
            : 1,
      };
    }
  }
}

function removeItem(collection: Record<string, any>, itemId: string): void {
  if (!collection[itemId]) return;
  delete collection[itemId];
}

function handleItemBoxCollection(playerId: string, itemBoxId: number): void {
  const player = gameState.players[playerId];
  if (!player) return;

  const collectedBox = gameState.itemBoxes.find((box) => box.id === itemBoxId);
  if (!collectedBox) return;

  gameState.itemBoxes = gameState.itemBoxes.filter(
    (box) => box.id !== itemBoxId
  );

  if (collectedBox.position) {
    setTimeout(() => {
      gameState.itemBoxes.push(collectedBox);
    }, 15000);
  }

  if (!player || player.isItemSpinning || player.item?.quantity > 0) {
    return;
  }

  player.isItemSpinning = true;

  setTimeout(() => {
    if (gameState.players[playerId]) {
      const totalProbability = Object.values(ITEM_PROBABILITIES).reduce(
        (a, b) => a + b,
        0
      );
      let random = Math.random() * totalProbability;
      let itemType = ITEM_TYPES.BANANA; // Default to banana if something goes wrong
      let quantity = 1;

      for (const [type, probability] of Object.entries(ITEM_PROBABILITIES)) {
        if (random < probability) {
          itemType = type;
          if (
            type === ITEM_TYPES.THREE_BANANAS ||
            type === ITEM_TYPES.THREE_GREEN_SHELLS
          ) {
            quantity = 3;
          }
          break;
        }
        random -= probability;
      }

      gameState.players[playerId].item = {
        type: itemType,
        quantity,
      };
      gameState.players[playerId].isItemSpinning = false;
    }
  }, 3000);
}

function cleanupInactivePlayers(): void {
  const now = Date.now();
  Object.keys(gameState.players).forEach((playerId) => {
    const player = gameState.players[playerId];
    if (now - player.lastUpdate > 30000) {
      const socket = io.sockets.sockets.get(player.socket);
      if (socket) socket.disconnect(true);
      delete gameState.players[playerId];
    }
  });
}

function checkCollision(
  pos1: Position,
  pos2: Position,
  radius: number
): boolean {
  const dx = pos1.x - pos2.x;
  const dy = pos1.y - pos2.y;
  const dz = pos1.z - pos2.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz) < radius;
}

function handleCollisions(): void {
  // Check player collisions with items and other players
  for (const player of Object.values(gameState.players)) {
    // Skip if player is dead
    if (player.lives <= 0) continue;

    // Check collision with bananas
    for (const [bananaId, banana] of Object.entries(gameState.bananas)) {
      if (
        checkCollision(
          player.position,
          banana.position,
          bananaRadius + carRadius
        )
      ) {
        if (player.isStarred) {
          removeItem(gameState.bananas, bananaId);
        } else {
          onHit(player.id);
          removeItem(gameState.bananas, bananaId);
        }
      }
    }

    // Check collision with fake cubes
    for (const [cubeId, cube] of Object.entries(gameState.fakeCubes)) {
      if (
        checkCollision(player.position, cube.position, cubeRadius + carRadius)
      ) {
        if (player.isStarred) {
          removeItem(gameState.fakeCubes, cubeId);
        } else {
          onHit(player.id);
          removeItem(gameState.fakeCubes, cubeId);
        }
      }
    }

    // Check collision with green shells
    for (const [shellId, shell] of Object.entries(gameState.greenShells)) {
      if (
        checkCollision(
          player.position,
          shell.position,
          shellRadius + carRadius + 0.05
        ) &&
        (player.isStarred || shell.canHitOwner || shell.droppedBy !== player.id)
      ) {
        if (player.isStarred) {
          removeItem(gameState.greenShells, shellId);
        } else {
          onHit(player.id);
          removeItem(gameState.greenShells, shellId);
        }
      }
    }

    // Check collision with other players
    for (const otherPlayer of Object.values(gameState.players)) {
      if (
        otherPlayer.id !== player.id &&
        otherPlayer.lives > 0 &&
        checkCollision(player.position, otherPlayer.position, 2 * carRadius)
      ) {
        if (player.isStarred && !otherPlayer.isStarred) {
          onHit(otherPlayer.id);
        }
      }
    }

    // Check collision with item boxes (works for both starred and non-starred players)
    for (const box of gameState.itemBoxes) {
      if (
        checkCollision(
          player.position,
          { x: box.position[0], y: box.position[1], z: box.position[2] },
          cubeRadius + carRadius
        )
      ) {
        handleItemBoxCollection(player.id, box.id);
      }
    }
  }
}

function updateGreenShells(): void {
  const greenShellsToRemove: string[] = [];
  const now = Date.now();
  const MAX_SHELL_AGE = 10000; // 10 seconds
  const gravity = 9.8; // Gravity acceleration in m/s²
  const terminalVelocity = 20; // Maximum falling speed
  const FIXED_TIMESTEP = 1 / 60; // Fixed physics timestep (60 Hz)

  // For each green shell
  Object.entries(gameState.greenShells).forEach(([shellId, shell]) => {
    // Check if shell is too old
    if (now - shell.droppedAt > MAX_SHELL_AGE) {
      greenShellsToRemove.push(shellId);
      return;
    }

    // Check collisions with bananas
    Object.entries(gameState.bananas).forEach(([bananaId, banana]) => {
      if (checkCollision(shell.position, banana.position, shellRadius)) {
        greenShellsToRemove.push(shellId);
        removeItem(gameState.bananas, bananaId);
        return;
      }
    });

    // If shell was destroyed by banana, skip the rest
    if (greenShellsToRemove.includes(shellId)) {
      return;
    }

    // Calculate movement
    const moveSpeed = shell.speed * FIXED_TIMESTEP;
    const moveX = Math.sin(shell.rotation) * moveSpeed;
    const moveZ = Math.cos(shell.rotation) * moveSpeed;

    // Update position
    const newPosition = {
      x: shell.position.x + moveX,
      y: shell.position.y, // Will be updated below
      z: shell.position.z + moveZ,
    };

    // Ensure verticalVelocity is defined
    if (shell.verticalVelocity === undefined) {
      shell.verticalVelocity = 0;
    }

    // Apply gravity
    shell.verticalVelocity -= gravity * FIXED_TIMESTEP;
    shell.verticalVelocity = Math.max(
      -terminalVelocity,
      shell.verticalVelocity
    );

    // Calculate new height based on gravity
    const newHeightBasedOnGravity =
      shell.position.y + shell.verticalVelocity * FIXED_TIMESTEP;

    let bounced = false;

    // Check if we're under a bridge
    const underBridge = isUnderBridge(
      newPosition.x,
      newPosition.z,
      shell.position.y
    );

    // Check battle block collisions
    if (!underBridge) {
      for (const block of blocks) {
        const blockHalfWidth = block.size.x / 2;
        const blockHalfDepth = block.size.z / 2;

        const shellTooHighForCollision =
          block.position.y + block.size.y - 0.25 < shell.position.y;
        if (shellTooHighForCollision) {
          continue;
        }

        const dx = Math.abs(newPosition.x - block.position.x);
        const dz = Math.abs(newPosition.z - block.position.z);

        if (
          dx < blockHalfWidth + shellRadius &&
          dz < blockHalfDepth + shellRadius
        ) {
          const relativeX = newPosition.x - block.position.x;
          const relativeZ = newPosition.z - block.position.z;

          const penetrationX =
            blockHalfWidth + shellRadius - Math.abs(relativeX);
          const penetrationZ =
            blockHalfDepth + shellRadius - Math.abs(relativeZ);

          if (penetrationX < penetrationZ) {
            shell.rotation = -shell.rotation;
            newPosition.x =
              block.position.x +
              (relativeX > 0 ? 1 : -1) * (blockHalfWidth + shellRadius);
          } else {
            shell.rotation = Math.PI - shell.rotation;
            newPosition.z =
              block.position.z +
              (relativeZ > 0 ? 1 : -1) * (blockHalfDepth + shellRadius);
          }
          bounced = true;
          break;
        }
      }
    }

    if (bounced) {
      shell.bounces++;
    }

    // Calculate target height based on terrain
    const targetHeight = calculateHeightAtPosition(
      newPosition.x,
      newPosition.z
    );
    const currentHeight = calculateHeightAtPosition(
      shell.position.x,
      shell.position.z
    );

    // Check if we're going down a ramp (current height > target height)
    if (currentHeight > targetHeight && !underBridge) {
      // Smoothly transition down the ramp
      const transitionSpeed = 5.0;
      const targetY = Math.max(0, targetHeight);

      // Interpolate between current height and target height
      newPosition.y =
        shell.position.y +
        (targetY - shell.position.y) *
          Math.min(1, transitionSpeed * FIXED_TIMESTEP);

      // Reset vertical velocity when on a ramp to prevent bouncing
      shell.verticalVelocity = Math.min(0, shell.verticalVelocity);
    }
    // Check if we've hit the ground
    else if (newHeightBasedOnGravity <= targetHeight) {
      // We've hit the ground
      newPosition.y = targetHeight;
      shell.verticalVelocity = 0;
    } else {
      // We're in the air
      newPosition.y = newHeightBasedOnGravity;
    }

    // Handle multi-level bridges and blocks
    if (underBridge) {
      // Get the ground level or the level we should be at
      let groundLevel = 0;

      // Check if we're on top of any blocks
      for (const block of blocks) {
        const blockHalfWidth = block.size.x / 2;
        const blockHalfDepth = block.size.z / 2;

        const dx = Math.abs(newPosition.x - block.position.x);
        const dz = Math.abs(newPosition.z - block.position.z);

        // If we're above this block and it's below the bridge
        if (
          dx < blockHalfWidth &&
          dz < blockHalfDepth &&
          block.position.y < newPosition.y
        ) {
          // Update ground level if this block is higher
          groundLevel = Math.max(groundLevel, block.position.y + block.size.y);
        }
      }

      // Keep us at the appropriate level when under a bridge
      newPosition.y = groundLevel;

      // Prevent upward movement when under a bridge
      shell.verticalVelocity = Math.min(0, shell.verticalVelocity);
    }

    // Update shell position
    shell.position = newPosition;
  });

  // Remove old shells
  greenShellsToRemove.forEach((shellId) => {
    delete gameState.greenShells[shellId];
  });
}

io.on("connection", (socket: Socket) => {
  const playerId = uuidv4();
  gameState.players[playerId] = {
    id: playerId,
    socket: socket.id,
    position: { x: 0, y: 0.1, z: 0 },
    rotation: 0,
    speed: 0,
    color: generateRandomColor(),
    lastUpdate: Date.now(),
    item: { type: ITEM_TYPES.BANANA, quantity: 0 },
    lives: 3,
  };

  socket.emit("init", {
    id: playerId,
    color: gameState.players[playerId].color,
    item: gameState.players[playerId].item,
  });

  initializePlayer(playerId);

  socket.on("update", (data) => updatePlayerPosition(playerId, data));
  socket.on("useItem", (data) => useItem(playerId));
  socket.on("respawn", () => {
    initializePlayer(playerId);
  });

  socket.on("disconnect", () => {
    delete gameState.players[playerId];
  });
});

gameState.itemBoxes = itemBoxes.map((box, index) => ({
  id: index + 1,
  position: box.position,
}));

setInterval(() => {
  handleCollisions();
  updateGreenShells();
  cleanupInactivePlayers();
}, 1000 / 60);

httpServer.listen(PORT, () => {
  console.log(`Socket.IO server running on port ${PORT}`);
});

setInterval(() => {
  io.emit("gameState", { ...gameState });
}, 10);
