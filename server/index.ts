import { createServer } from "http";
import { Server, Socket } from "socket.io";
import { v4 as uuidv4 } from "uuid";
import { BATTLE_BLOCKS, RAMPS } from "../src/lib/gameConfig";
import { GameState, ItemBox, Position, ITEM_TYPES, Color } from "./types";

// Define constants to match client-side configuration
const DEFAULT_HEIGHT = 0.1;

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
      DEFAULT_HEIGHT - 0.2, // Slightly lower than default height
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
    y: DEFAULT_HEIGHT,
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
 * @returns Height at that position or DEFAULT_HEIGHT if not on ramp
 */
function calculateHeightAtPosition(x: number, z: number): number {
  // Check each battle block first
  for (const block of BATTLE_BLOCKS.positions) {
    const blockHalfSize = BATTLE_BLOCKS.size / 2;
    const dx = Math.abs(x - block.x);
    const dz = Math.abs(z - block.z);

    if (dx <= blockHalfSize && dz <= blockHalfSize) {
      // Player is on top of a block
      return block.y + 2;
    }
  }

  // Check each ramp
  for (const ramp of RAMPS) {
    // Get ramp properties
    const [rampX, rampY, rampZ] = ramp.position;
    const rotation = ramp.rotation;
    const [scaleX, scaleY, scaleZ] = ramp.scale;

    // Adjust to ramp's local coordinates
    // First, shift to center of ramp
    const localX = x - rampX;
    const localZ = z - rampZ;

    // Then rotate around Y axis to align with ramp's orientation
    const cosRot = Math.cos(rotation);
    const sinRot = Math.sin(rotation);
    const rotatedX = localX * cosRot - localZ * sinRot;
    const rotatedZ = localX * sinRot + localZ * cosRot;

    // Scale to normalized ramp size (-0.5 to 0.5 in each dimension)
    const normalizedX = rotatedX / scaleX;
    const normalizedZ = rotatedZ / scaleZ;

    // Check if point is within ramp bounds
    if (
      normalizedX >= -0.5 &&
      normalizedX <= 0.5 &&
      normalizedZ >= -0.5 &&
      normalizedZ <= 0.5
    ) {
      // Calculate height based on position on ramp
      // Ramp slopes from back (high) to front (low)
      // back is at normalizedZ = -0.5, front is at normalizedZ = 0.5

      // Linear interpolation from max height at back to min height at front
      const heightPercentage = 0.5 - normalizedZ; // 1 at back, 0 at front
      const height = DEFAULT_HEIGHT + heightPercentage * scaleY;

      return height;
    }
  }

  // Not on any ramp or block
  return DEFAULT_HEIGHT;
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
  const item = {
    id: itemId,
    position: {
      ...data.position,
      y: calculateHeightAtPosition(data.position.x, data.position.z),
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
  const shell = {
    id: shellId,
    position: {
      ...data.position,
      y: calculateHeightAtPosition(data.position.x, data.position.z),
    },
    rotation: data.rotation,
    direction: data.rotation,
    speed: 15,
    droppedBy: playerId,
    droppedAt: Date.now(),
    bounces: 0,
  };

  gameState.greenShells[shellId] = shell;

  // Remove shell after 10 seconds
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
  const dz = pos1.z - pos2.z;
  return Math.sqrt(dx * dx + dz * dz) < radius;
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
  const groundFriction = 0.8; // Friction when hitting the ground

  // For each green shell
  Object.entries(gameState.greenShells).forEach(([shellId, shell]) => {
    // Check if shell is too old
    if (now - shell.droppedAt > MAX_SHELL_AGE) {
      greenShellsToRemove.push(shellId);
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

    // Calculate new height
    const newHeightBasedOnGravity =
      shell.position.y + shell.verticalVelocity * 0.033;

    // Check for arena boundaries
    const ARENA_HALF_SIZE = 30;
    const shellRadius = 0.5;
    let bounced = false;

    // Left and right walls
    if (newPosition.x < -ARENA_HALF_SIZE + shellRadius) {
      newPosition.x = -ARENA_HALF_SIZE + shellRadius;
      shell.rotation = -shell.rotation;
      bounced = true;
    } else if (newPosition.x > ARENA_HALF_SIZE - shellRadius) {
      newPosition.x = ARENA_HALF_SIZE - shellRadius;
      shell.rotation = -shell.rotation;
      bounced = true;
    }

    // Front and back walls
    if (newPosition.z < -ARENA_HALF_SIZE + shellRadius) {
      newPosition.z = -ARENA_HALF_SIZE + shellRadius;
      shell.rotation = Math.PI - shell.rotation;
      bounced = true;
    } else if (newPosition.z > ARENA_HALF_SIZE - shellRadius) {
      newPosition.z = ARENA_HALF_SIZE - shellRadius;
      shell.rotation = Math.PI - shell.rotation;
      bounced = true;
    }

    const isHighEnough = shell.position.y > 2 - 0.25;

    // Check battle block collisions
    if (!isHighEnough) {
      for (const block of BATTLE_BLOCKS.positions) {
        const dx = newPosition.x - block.x;
        const dz = newPosition.z - block.z;

        const blockHalfSize = BATTLE_BLOCKS.size / 2;

        if (Math.abs(dx) < blockHalfSize && Math.abs(dz) < blockHalfSize) {
          if (Math.abs(dx) > Math.abs(dz)) {
            // Hit vertical side
            shell.rotation = -shell.rotation;
            newPosition.x = block.x + Math.sign(dx) * blockHalfSize;
          } else {
            // Hit horizontal side
            shell.rotation = Math.PI - shell.rotation;
            newPosition.z = block.z + Math.sign(dz) * blockHalfSize;
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
    if (newHeightBasedOnGravity <= nextHeight) {
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
