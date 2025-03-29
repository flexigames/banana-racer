import { createServer } from "http";
import { Server, Socket } from "socket.io";
import { v4 as uuidv4 } from "uuid";
import { calculateHeightAtPosition } from "./calculate-height";
import { bridges, itemBoxes } from "./map";
import { Color, GameState, ITEM_TYPES, Position } from "./types";

const PORT = process.env.PORT || 8080;
export const carRadius = 0.26;
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
  [ITEM_TYPES.THREE_BANANAS]: 5,
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
}

function dropItem(
  playerId: string,
  data: { position: Position; rotation?: number },
  itemType: string
): void {
  const itemId =
    itemType === ITEM_TYPES.BANANA ? generateBananaId() : generateFakeCubeId();

  const { height: heightAtPosition } = calculateHeightAtPosition(
    data.position.x,
    data.position.z,
    data.position.y
  );
  const item = {
    id: itemId,
    position: {
      ...data.position,
      y: heightAtPosition,
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
    position: gameState.players[playerId].position,
    rotation: data.rotation,
    direction: data.rotation,
    speed: 16,
    droppedBy: playerId,
    droppedAt: Date.now(),
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

      const { height: heightAtPosition } = calculateHeightAtPosition(
        player.position.x + offsetX,
        player.position.z + offsetZ,
        player.position.y
      );

      player.trailingItem = {
        type: itemType,
        position: {
          x: player.position.x + offsetX,
          y: heightAtPosition,
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
    }, 5000);
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

    // Calculate target height based on terrain
    const { height: targetHeight, collisionObject } = calculateHeightAtPosition(
      newPosition.x,
      newPosition.z,
      shell.position.y
    );
    if (targetHeight < shell.position.y) {
      if (shell.verticalVelocity === undefined) {
        shell.verticalVelocity = 0;
      }

      shell.verticalVelocity -= gravity * FIXED_TIMESTEP;
      shell.verticalVelocity = Math.max(
        -terminalVelocity,
        shell.verticalVelocity
      );

      const newHeightBasedOnGravity =
        shell.position.y + shell.verticalVelocity * FIXED_TIMESTEP;

      newPosition.y = Math.max(targetHeight, newHeightBasedOnGravity);

      shell.position = newPosition;

      return;
    }

    const delta = 0.1;
    if (targetHeight <= shell.position.y + delta) {
      shell.verticalVelocity = 0;
      newPosition.y = targetHeight;
      shell.position = newPosition;

      return;
    }

    if (collisionObject) {
      const collisionObjectPosition = collisionObject.position;
      const collisionObjectScale = collisionObject.scale;

      const collisionObjectHalfWidth = collisionObjectScale[0] / 2;
      const collisionObjectHalfDepth = collisionObjectScale[2] / 2;

      const shellTooHighForCollision =
        collisionObjectPosition[1] + collisionObjectScale[1] - 0.25 <
        shell.position.y;
      if (!shellTooHighForCollision) {
        const dx = Math.abs(newPosition.x - collisionObjectPosition[0]);
        const dz = Math.abs(newPosition.z - collisionObjectPosition[2]);

        if (
          dx < collisionObjectHalfWidth + shellRadius &&
          dz < collisionObjectHalfDepth + shellRadius
        ) {
          const relativeX = newPosition.x - collisionObjectPosition[0];
          const relativeZ = newPosition.z - collisionObjectPosition[2];

          const penetrationX =
            collisionObjectHalfWidth + shellRadius - Math.abs(relativeX);
          const penetrationZ =
            collisionObjectHalfDepth + shellRadius - Math.abs(relativeZ);

          if (penetrationX < penetrationZ) {
            shell.rotation = -shell.rotation;
            newPosition.x =
              collisionObjectPosition[0] +
              (relativeX > 0 ? 1 : -1) *
                (collisionObjectHalfWidth + shellRadius);
          } else {
            shell.rotation = Math.PI - shell.rotation;
            newPosition.z =
              collisionObjectPosition[2] +
              (relativeZ > 0 ? 1 : -1) *
                (collisionObjectHalfDepth + shellRadius);
          }
        }
      }

      shell.position = newPosition;
    }
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
