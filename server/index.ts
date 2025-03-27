import { createServer } from "http";
import { Server, Socket } from "socket.io";
import { v4 as uuidv4 } from "uuid";
import { GameState, ItemBox, Position, ITEM_TYPES, Color } from "./types";
import { blocks, ramps, bridges, mapSize } from "./map";

const PORT = process.env.PORT || 8080;
const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["*"],
    credentials: true,
  },
});

const VEHICLE_MODELS = [
  "vehicle-racer",
  "vehicle-truck",
  "vehicle-suv",
  "vehicle-monster-truck",
  "vehicle-racer-low",
  "vehicle-speedster",
];

const gameState: GameState = {
  players: {},
  bananas: {},
  fakeCubes: {},
  greenShells: {},
  itemBoxes: [],
};

function generateRandomColor(): Color {
  return {
    h: Math.random(),
    s: 0.65,
    l: 0.55,
  };
}

function selectRandomVehicle(): string {
  return VEHICLE_MODELS[Math.floor(Math.random() * VEHICLE_MODELS.length)];
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

function generateItemBoxes(count: number = 20): ItemBox[] {
  const boxes: ItemBox[] = [];
  const mapSize = 60;

  for (let i = 1; i <= count; i++) {
    const position = [
      Math.random() * mapSize - mapSize / 2,
      -0.2, // Slightly lower than default height
      Math.random() * mapSize - mapSize / 2,
    ];
    boxes.push({ id: i, position });
  }

  return boxes;
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
}

function onHit(playerId: string, duration: number = 3000): void {
  const player = gameState.players[playerId];
  if (!player || player.lives <= 0 || player.isSpinning) return;

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
function calculateHeightAtPosition(x: number, z: number): number {
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
    const carRadius = 0.2;
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

    // Bridge dimensions
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
      // Bridge height is at bridgeY + 1
      return bridgeY + 1;
    }
  }

  // Not on any ramp, block, or bridge
  return 0;
}

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

  // Update the player position
  gameState.players[playerId].position = data.position;
  gameState.players[playerId].rotation = data.rotation;
  if (data.speed !== undefined) {
    gameState.players[playerId].speed = data.speed;
  }
  gameState.players[playerId].lastUpdate = Date.now();
}

function dropItem(
  playerId: string,
  data: { position: Position; rotation?: number },
  itemType: string
): void {
  const itemId =
    itemType === ITEM_TYPES.BANANA ? generateBananaId() : generateFakeCubeId();

  const underBridge = isUnderBridge(data.position.x, data.position.z, data.position.y);
  const heightAtPosition = calculateHeightAtPosition(data.position.x, data.position.z);
  
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

  const underBridge = isUnderBridge(data.position.x, data.position.z, data.position.y);
  const heightAtPosition = calculateHeightAtPosition(data.position.x, data.position.z);

  const shell = {
    id: shellId,
    position: {
      ...data.position,
      y: underBridge ? data.position.y : heightAtPosition,
    },
    rotation: data.rotation,
    direction: data.rotation,
    speed: 7.5,
    droppedBy: playerId,
    droppedAt: Date.now(),
    bounces: 0,
    verticalVelocity: 0,
  };

  gameState.greenShells[shellId] = shell;

  setTimeout(() => {
    if (gameState.greenShells[shellId]) {
      delete gameState.greenShells[shellId];
    }
  }, 10000);
}

function useItem(
  playerId: string,
  data: { position: Position; rotation: number }
): void {
  const player = gameState.players[playerId];
  if (!player?.item?.quantity) return;

  player.item.quantity--;

  switch (player.item.type) {
    case ITEM_TYPES.BANANA:
      dropItem(playerId, data, ITEM_TYPES.BANANA);
      break;
    case ITEM_TYPES.BOOST:
      player.isBoosted = true;
      setTimeout(() => {
        if (gameState.players[playerId]) {
          gameState.players[playerId].isBoosted = false;
        }
      }, 5000);
      break;
    case ITEM_TYPES.FAKE_CUBE:
      dropItem(playerId, data, ITEM_TYPES.FAKE_CUBE);
      break;
    case ITEM_TYPES.GREEN_SHELL:
      dropGreenShell(playerId, data);
      break;
  }
}

function removeItem(collection: Record<string, any>, itemId: string): void {
  if (!collection[itemId]) return;
  delete collection[itemId];
}

function handleItemBoxCollection(playerId: string, itemBoxId: number): void {
  const player = gameState.players[playerId];

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
      const itemTypes = Object.values(ITEM_TYPES);
      const randomItemType =
        itemTypes[Math.floor(Math.random() * itemTypes.length)];

      gameState.players[playerId].item = {
        type: randomItemType,
        quantity: 1,
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
  Object.values(gameState.bananas).forEach((banana) => {
    Object.values(gameState.players).forEach((player) => {
      if (checkCollision(player.position, banana.position, 0.9)) {
        removeItem(gameState.bananas, banana.id);
        onHit(player.id);
      }
    });
  });

  Object.values(gameState.fakeCubes).forEach((fakeCube) => {
    Object.values(gameState.players).forEach((player) => {
      if (checkCollision(player.position, fakeCube.position, 0.9)) {
        removeItem(gameState.fakeCubes, fakeCube.id);
        onHit(player.id);
      }
    });
  });

  Object.values(gameState.greenShells).forEach((shell) => {
    Object.values(gameState.players).forEach((player) => {
      if (player.id !== shell.droppedBy && checkCollision(player.position, shell.position, 0.9)) {
        removeItem(gameState.greenShells, shell.id);
        onHit(player.id);
      }
    });
  });

  Object.values(gameState.players).forEach((player1) => {
    Object.values(gameState.players).forEach((player2) => {
      if (
        player1.id !== player2.id &&
        player2.isBoosted &&
        checkCollision(player1.position, player2.position, 1.2)
      ) {
        onHit(player1.id);
      }
    });
  });

  gameState.itemBoxes.forEach((itemBox) => {
    Object.values(gameState.players).forEach((player) => {
      const itemBoxPosition = {
        x: itemBox.position[0],
        y: itemBox.position[1],
        z: itemBox.position[2],
      };
      if (checkCollision(player.position, itemBoxPosition, 0.9)) {
        handleItemBoxCollection(player.id, itemBox.id);
      }
    });
  });
}

function updateGreenShells(): void {
  const greenShellsToRemove: string[] = [];
  const now = Date.now();
  const MAX_SHELL_AGE = 10000; // 10 seconds
  const gravity = 9.8; // Gravity acceleration in m/s²
  const terminalVelocity = 20; // Maximum falling speed
  const carRadius = 0.2; // Approximate car collision radius

  // For each green shell
  Object.entries(gameState.greenShells).forEach(([shellId, shell]) => {
    // Check if shell is too old
    if (now - shell.droppedAt > MAX_SHELL_AGE) {
      greenShellsToRemove.push(shellId);
      return;
    }

    // Check collisions with bananas
    Object.entries(gameState.bananas).forEach(([bananaId, banana]) => {
      if (checkCollision(shell.position, banana.position, 0.9)) {
        greenShellsToRemove.push(shellId);
        removeItem(gameState.bananas, bananaId);
        return;
      }
    });

    // If shell was destroyed by banana, skip the rest
    if (greenShellsToRemove.includes(shellId)) {
      return;
    }

    // Initialize vertical velocity if not exists
    if (shell.verticalVelocity === undefined) {
      shell.verticalVelocity = 0;
    }

    // Calculate movement
    const moveSpeed = shell.speed * 0.033; // Simulate 30fps
    const moveX = Math.sin(shell.rotation) * moveSpeed;
    const moveZ = Math.cos(shell.rotation) * moveSpeed;

    // Update position
    const newPosition = {
      x: shell.position.x + moveX,
      y: shell.position.y, // Will be updated below
      z: shell.position.z + moveZ,
    };

    // Apply gravity
    shell.verticalVelocity -= gravity * 0.033; // Apply gravity over frame time
    shell.verticalVelocity = Math.max(
      -terminalVelocity,
      shell.verticalVelocity
    );

    // Calculate new height based on gravity
    const newHeightBasedOnGravity =
      shell.position.y + shell.verticalVelocity * 0.033;

    let bounced = false;

    // Check if we're under a bridge
    const underBridge = isUnderBridge(newPosition.x, newPosition.z, shell.position.y);
    const isHighEnough = shell.position.y > 2 - 0.25;

    // Check battle block collisions
    if (!isHighEnough && !underBridge) {
      for (const block of blocks) {
        const blockHalfWidth = block.size.x / 2;
        const blockHalfDepth = block.size.z / 2;

        const dx = Math.abs(newPosition.x - block.position.x);
        const dz = Math.abs(newPosition.z - block.position.z);

        if (dx < blockHalfWidth + 0.5 && dz < blockHalfDepth + 0.5) {
          const relativeX = newPosition.x - block.position.x;
          const relativeZ = newPosition.z - block.position.z;

          const penetrationX = blockHalfWidth + 0.5 - Math.abs(relativeX);
          const penetrationZ = blockHalfDepth + 0.5 - Math.abs(relativeZ);

          if (penetrationX < penetrationZ) {
            shell.rotation = -shell.rotation;
            newPosition.x =
              block.position.x +
              (relativeX > 0 ? 1 : -1) * (blockHalfWidth + 0.5);
            newPosition.z = newPosition.z;
          } else {
            shell.rotation = Math.PI - shell.rotation;
            newPosition.x = newPosition.x;
            newPosition.z =
              block.position.z +
              (relativeZ > 0 ? 1 : -1) * (blockHalfDepth + 0.5);
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
    const nextHeight = calculateHeightAtPosition(newPosition.x, newPosition.z);
    
    if (underBridge) {
      // If under a bridge, keep the shell at ground level
      newPosition.y = 0;
      shell.verticalVelocity = 0;
    } else if (newHeightBasedOnGravity <= nextHeight) {
      const delta = nextHeight - newHeightBasedOnGravity;
      if (delta < 0.2) {
        newPosition.y = nextHeight;
      }
      shell.verticalVelocity = 0;
    } else {
      newPosition.y = newHeightBasedOnGravity;
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
    vehicle: selectRandomVehicle(),
    lastUpdate: Date.now(),
    item: { type: ITEM_TYPES.BANANA, quantity: 0 },
    lives: 3,
  };

  socket.emit("init", {
    id: playerId,
    color: gameState.players[playerId].color,
    vehicle: gameState.players[playerId].vehicle,
    item: gameState.players[playerId].item,
  });

  initializePlayer(playerId);

  socket.on("update", (data) => updatePlayerPosition(playerId, data));
  socket.on("useItem", (data) => useItem(playerId, data));
  socket.on("hitBanana", (data) =>
    removeItem(gameState.bananas, data.bananaId)
  );
  socket.on("hitFakeCube", (data) =>
    removeItem(gameState.fakeCubes, data.fakeCubeId)
  );
  socket.on("collectItemBox", (data) =>
    handleItemBoxCollection(playerId, data.itemBoxId)
  );
  socket.on("respawn", () => {
    initializePlayer(playerId);
  });

  socket.on("disconnect", () => {
    delete gameState.players[playerId];
  });
});

gameState.itemBoxes = generateItemBoxes(20);

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
