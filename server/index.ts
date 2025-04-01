import { createServer } from "http";
import { Server, Socket } from "socket.io";
import { v4 as uuidv4 } from "uuid";
import { calculateHeightAtPosition } from "./calculate-height";
import { itemBoxes } from "./map";
import { Color, GameState, ITEM_TYPES, Player, Position } from "./types";

const PORT = process.env.PORT || 8080;
export const carRadius = 0.26;
const bananaRadius = 0.1;
const cubeRadius = 0.2;
const shellRadius = 0.2;
const httpServer = createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(
    JSON.stringify({
      status: "ok",
      message: "Kart Racing Game Server is running",
      players: Object.keys(gameState.players).length,
    })
  );
});
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["*"],
    credentials: true,
  },
});

const ITEM_PROBABILITIES = {
  [ITEM_TYPES.BANANA]: 3,
  [ITEM_TYPES.BOOST]: 2,
  [ITEM_TYPES.FAKE_CUBE]: 4,
  [ITEM_TYPES.GREEN_SHELL]: 5,
  [ITEM_TYPES.RED_SHELL]: 3,
  [ITEM_TYPES.THREE_RED_SHELLS]: 2,
  [ITEM_TYPES.STAR]: 1,
  [ITEM_TYPES.THREE_BANANAS]: 4,
  [ITEM_TYPES.THREE_GREEN_SHELLS]: 3,
};

const gameState: GameState = {
  players: {},
  bananas: {},
  fakeCubes: {},
  greenShells: {},
  redShells: {},
  itemBoxes: [],
};

const trailingItemDistanceBehind = 0.5;

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

function generateRedShellId(): string {
  return `red_shell_${uuidv4()}`;
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
  quantityBeforeDrop: number,
  itemType: string
): void {
  const player = gameState.players[playerId];
  if (!player) return;

  const itemId =
    itemType === ITEM_TYPES.BANANA ? generateBananaId() : generateFakeCubeId();

  // Calculate positions based on the same logic used for trailing items
  const positions = calculateTrailingItemPositions(player, quantityBeforeDrop);

  const dropPosition = positions[quantityBeforeDrop - 1] || {
    x:
      player.position.x -
      Math.sin(player.rotation) * trailingItemDistanceBehind,
    y: player.position.y,
    z:
      player.position.z -
      Math.cos(player.rotation) * trailingItemDistanceBehind,
  };

  const { height: heightAtPosition } = calculateHeightAtPosition(
    dropPosition.x,
    dropPosition.z,
    dropPosition.y
  );

  const item = {
    id: itemId,
    position: {
      ...dropPosition,
      y: heightAtPosition,
    },
    rotation: player.rotation,
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

function dropGreenShell(playerId: string): void {
  const shellId = generateGreenShellId();

  const player = gameState.players[playerId];

  const shell = {
    id: shellId,
    position: player.position,
    rotation: player.rotation,
    direction: player.rotation,
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

function dropRedShell(playerId: string): void {
  const shellId = generateRedShellId();

  const player = gameState.players[playerId];

  const shell = {
    id: shellId,
    position: player.position,
    rotation: player.rotation,
    direction: player.rotation,
    speed: 16,
    droppedBy: playerId,
    droppedAt: Date.now(),
    verticalVelocity: 0,
    canHitOwner: false,
  };

  gameState.redShells[shellId] = shell;

  // Allow self-hits after 200ms
  setTimeout(() => {
    if (gameState.redShells[shellId]) {
      gameState.redShells[shellId].canHitOwner = true;
    }
  }, 300);

  setTimeout(() => {
    if (gameState.redShells[shellId]) {
      delete gameState.redShells[shellId];
    }
  }, 10000);
}

function useItem(playerId: string): void {
  const player = gameState.players[playerId];
  if (!player) return;

  // Handle trailing item first
  if (player.trailingItem) {
    const { type } = player.trailingItem;
    console.log("Using trailing item:", type);

    const quantityAtDropItem = player.trailingItem.quantity ?? 0;

    if (player.trailingItem.quantity > 1) {
      player.trailingItem.quantity--;
    } else {
      player.trailingItem = undefined;
    }

    switch (type) {
      case ITEM_TYPES.THREE_BANANAS:
        dropItem(playerId, quantityAtDropItem, ITEM_TYPES.BANANA);
        break;
      case ITEM_TYPES.THREE_GREEN_SHELLS:
        dropGreenShell(playerId);
        break;
      case ITEM_TYPES.BANANA:
        dropItem(playerId, quantityAtDropItem, ITEM_TYPES.BANANA);
        break;
      case ITEM_TYPES.FAKE_CUBE:
        dropItem(playerId, quantityAtDropItem, ITEM_TYPES.FAKE_CUBE);
        break;
      case ITEM_TYPES.GREEN_SHELL:
        dropGreenShell(playerId);
        break;
      case ITEM_TYPES.RED_SHELL:
        dropRedShell(playerId);
        break;
      case ITEM_TYPES.THREE_RED_SHELLS:
        dropRedShell(playerId);
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
      player.trailingItem = {
        type: itemType,
        quantity:
          itemType === ITEM_TYPES.THREE_BANANAS ||
          itemType === ITEM_TYPES.THREE_GREEN_SHELLS ||
          itemType === ITEM_TYPES.THREE_RED_SHELLS
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

function calculateTrailingItemPositions(
  player: Player,
  overrideQuantity?: number
): Position[] {
  if (!player.trailingItem) return [];

  const positions: Position[] = [];
  const quantity =
    overrideQuantity !== undefined
      ? overrideQuantity
      : player.trailingItem.quantity || 1;

  // Handle rotating shells differently
  if (
    player.trailingItem.type === ITEM_TYPES.THREE_RED_SHELLS ||
    player.trailingItem.type === ITEM_TYPES.THREE_GREEN_SHELLS
  ) {
    const radius = 0.3;
    for (let i = 0; i < quantity; i++) {
      const angle = (i * 2 * Math.PI) / quantity;
      positions.push({
        x: player.position.x + Math.cos(angle) * radius,
        y: player.position.y,
        z: player.position.z + Math.sin(angle) * radius,
      });
    }
  } else {
    // For other items, keep them trailing behind
    const angle = player.rotation;
    const itemSpacing = 0.3;
    for (let i = 0; i < quantity; i++) {
      const distanceBehind = trailingItemDistanceBehind + i * itemSpacing;
      positions.push({
        x: player.position.x - Math.sin(angle) * distanceBehind,
        y: player.position.y,
        z: player.position.z - Math.cos(angle) * distanceBehind,
      });
    }
  }

  return positions;
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

    const shellCollections = [
      { collection: gameState.greenShells, type: "green" },
      { collection: gameState.redShells, type: "red" },
    ];

    for (const { collection, type } of shellCollections) {
      for (const [shellId, shell] of Object.entries(collection)) {
        if (
          checkCollision(
            player.position,
            shell.position,
            shellRadius + carRadius + 0.05
          ) &&
          (player.isStarred ||
            shell.canHitOwner ||
            shell.droppedBy !== player.id)
        ) {
          if (player.isStarred) {
            removeItem(collection, shellId);
          } else {
            // Check if player has trailing shells that can block the hit
            let blockedHit = false;

            if (
              player.trailingItem?.type === ITEM_TYPES.THREE_GREEN_SHELLS ||
              player.trailingItem?.type === ITEM_TYPES.THREE_RED_SHELLS
            ) {
              const quantity = player.trailingItem.quantity;
              let blockProbability = 0;

              if (quantity === 3) {
                blockProbability = 0.9; // 90% chance to block
              } else if (quantity === 2) {
                blockProbability = 0.7; // 70% chance to block
              } else if (quantity === 1) {
                blockProbability = 0.5; // 50% chance to block
              }

              if (Math.random() < blockProbability) {
                // Reduce the trailing item quantity instead of hitting the player
                player.trailingItem.quantity--;
                if (player.trailingItem.quantity === 0) {
                  player.trailingItem = undefined;
                }
                blockedHit = true;
              }
            }

            if (!blockedHit) {
              onHit(player.id);
            }

            removeItem(collection, shellId);
          }
        }
      }
    }

    // Check collision with other players and their trailing items
    for (const otherPlayer of Object.values(gameState.players)) {
      if (otherPlayer.id === player.id || otherPlayer.lives <= 0) continue;

      // Check direct player collision
      if (
        checkCollision(
          player.position,
          otherPlayer.position,
          2 * carRadius + shellRadius
        )
      ) {
        if (player.isStarred && !otherPlayer.isStarred) {
          onHit(otherPlayer.id);
        } else if (
          otherPlayer.trailingItem?.type === ITEM_TYPES.THREE_GREEN_SHELLS ||
          otherPlayer.trailingItem?.type === ITEM_TYPES.THREE_RED_SHELLS
        ) {
          // Handle collision with player having green shells
          const quantity = otherPlayer.trailingItem.quantity;
          let collisionProbability = 0;

          if (quantity === 3) {
            collisionProbability = 0.9; // 90% chance
          } else if (quantity === 2) {
            collisionProbability = 0.7; // 70% chance
          } else if (quantity === 1) {
            collisionProbability = 0.5; // 50% chance
          }

          if (Math.random() < collisionProbability) {
            // Reduce the trailing item quantity
            otherPlayer.trailingItem.quantity--;
            if (otherPlayer.trailingItem.quantity === 0) {
              otherPlayer.trailingItem = undefined;
            }

            // If there are no trailing items left and player is not starred, hit the other player
            if (!otherPlayer.trailingItem && !otherPlayer.isStarred) {
              onHit(otherPlayer.id);
            }
          }
        }
      }

      if (
        otherPlayer.trailingItem?.type === ITEM_TYPES.THREE_GREEN_SHELLS ||
        otherPlayer.trailingItem?.type === ITEM_TYPES.THREE_RED_SHELLS
      ) {
        continue;
      }

      // Check collision with other player's trailing items
      const trailingItemPositions = calculateTrailingItemPositions(otherPlayer);
      if (trailingItemPositions.length > 0 && otherPlayer.trailingItem) {
        const trailingItemRadius =
          otherPlayer.trailingItem.type === ITEM_TYPES.BANANA ||
          otherPlayer.trailingItem.type === ITEM_TYPES.THREE_BANANAS
            ? bananaRadius
            : otherPlayer.trailingItem.type === ITEM_TYPES.GREEN_SHELL ||
              otherPlayer.trailingItem.type === ITEM_TYPES.THREE_GREEN_SHELLS ||
              otherPlayer.trailingItem.type === ITEM_TYPES.RED_SHELL
            ? shellRadius
            : cubeRadius;

        // Check collision with each trailing item position
        for (const itemPos of trailingItemPositions) {
          if (
            checkCollision(
              player.position,
              itemPos,
              trailingItemRadius + carRadius
            )
          ) {
            // reduce quantity of trailing item
            otherPlayer.trailingItem.quantity--;
            if (otherPlayer.trailingItem.quantity === 0) {
              otherPlayer.trailingItem = undefined;
            }
            if (player.isStarred) {
            } else {
              onHit(player.id);
            }
            break; // Stop checking other positions once a collision is found
          }
        }
      }

      // Check collisions of player's trailing items with green and redshells, they should decrease the quantity of the trailing item
      // Check if player has trailing items
      if (player.trailingItem) {
        const trailingItemPositions = calculateTrailingItemPositions(player);

        // Combine green and red shells into a single array for processing
        const allShells = [
          ...Object.entries(gameState.greenShells).map(([id, shell]) => ({
            id,
            shell,
            type: "green",
          })),
          ...Object.entries(gameState.redShells).map(([id, shell]) => ({
            id,
            shell,
            type: "red",
          })),
        ];

        // Check collisions with all shells
        for (let i = 0; i < trailingItemPositions.length; i++) {
          const itemPos = trailingItemPositions[i];

          for (const { id, shell, type } of allShells) {
            if (!shell.canHitOwner && shell.droppedBy === player.id) continue;

            if (checkCollision(shell.position, itemPos, 2 * shellRadius)) {
              // Reduce quantity of trailing item
              if (player.trailingItem && player.trailingItem.quantity > 0) {
                player.trailingItem.quantity--;
                if (player.trailingItem.quantity === 0) {
                  player.trailingItem = undefined;
                }

                // Remove the shell from the appropriate collection
                if (type === "green") {
                  delete gameState.greenShells[id];
                } else {
                  delete gameState.redShells[id];
                }

                break; // Break the shell loop once a collision is found
              }
            }
          }

          // If all trailing items are gone, break the loop
          if (!player.trailingItem) break;
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

function updateRedShells(): void {
  const redShellsToRemove: string[] = [];
  const now = Date.now();
  const MAX_SHELL_AGE = 10000; // 10 seconds
  const gravity = 9.8; // Gravity acceleration in m/s²
  const terminalVelocity = 20; // Maximum falling speed
  const FIXED_TIMESTEP = 1 / 60; // Fixed physics timestep (60 Hz)
  const TRACKING_DELAY = 500; // Start tracking after 500ms

  // For each red shell
  Object.entries(gameState.redShells).forEach(([shellId, shell]) => {
    // Check if shell is too old
    if (now - shell.droppedAt > MAX_SHELL_AGE) {
      redShellsToRemove.push(shellId);
      return;
    }

    // Check collisions with bananas
    Object.entries(gameState.bananas).forEach(([bananaId, banana]) => {
      if (checkCollision(shell.position, banana.position, shellRadius)) {
        redShellsToRemove.push(shellId);
        removeItem(gameState.bananas, bananaId);
        return;
      }
    });

    // Check collisions with green shells
    Object.entries(gameState.greenShells).forEach(
      ([greenShellId, greenShell]) => {
        if (
          checkCollision(
            shell.position,
            greenShell.position,
            shellRadius + shellRadius
          )
        ) {
          // Both shells are destroyed on collision
          redShellsToRemove.push(shellId);
          removeItem(gameState.greenShells, greenShellId);
          return;
        }
      }
    );

    // Check collisions with other red shells
    Object.entries(gameState.redShells).forEach(
      ([otherShellId, otherShell]) => {
        // Skip self-collision
        if (shellId === otherShellId) return;

        if (
          checkCollision(
            shell.position,
            otherShell.position,
            shellRadius + shellRadius
          )
        ) {
          // Both red shells are destroyed on collision
          redShellsToRemove.push(shellId);
          redShellsToRemove.push(otherShellId);
          return;
        }
      }
    );

    // If shell was destroyed by banana, skip the rest
    if (redShellsToRemove.includes(shellId)) {
      return;
    }

    // Calculate movement
    const moveSpeed = shell.speed * FIXED_TIMESTEP;
    let moveX = Math.sin(shell.rotation) * moveSpeed;
    let moveZ = Math.cos(shell.rotation) * moveSpeed;

    // After 500ms, find the closest player and track them
    if (now - shell.droppedAt > TRACKING_DELAY) {
      let closestPlayer: any = null;
      let closestDistance = Infinity;

      // Find the closest player
      Object.values(gameState.players).forEach((player) => {
        if (player.id !== shell.droppedBy && player.lives > 0) {
          const distance = Math.sqrt(
            Math.pow(player.position.x - shell.position.x, 2) +
              Math.pow(player.position.z - shell.position.z, 2)
          );

          if (distance < closestDistance) {
            closestDistance = distance;
            closestPlayer = player;
          }
        }
      });

      // If we found a player to track, adjust rotation to follow them
      if (closestPlayer) {
        const dx = (closestPlayer as Player).position.x - shell.position.x;
        const dz = (closestPlayer as Player).position.z - shell.position.z;
        shell.rotation = Math.atan2(dx, dz);

        // Recalculate movement based on new rotation
        moveX = Math.sin(shell.rotation) * moveSpeed;
        moveZ = Math.cos(shell.rotation) * moveSpeed;
      }
    }

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
          // Red shells get destroyed upon collision with blocks
          redShellsToRemove.push(shellId);
          return;
        }
      }

      shell.position = newPosition;
    }
  });

  // Remove old shells
  redShellsToRemove.forEach((shellId) => {
    delete gameState.redShells[shellId];
  });
}

io.on("connection", (socket: Socket) => {
  const playerId = socket.handshake.auth.id;
  const playerName = socket.handshake.auth.name;
  const playerColor = socket.handshake.auth.color;
  const portalRef = socket.handshake.auth.portalRef;

  gameState.players[playerId] = {
    id: playerId,
    socket: socket.id,
    position: { x: 0, y: 0, z: 0 },
    rotation: 0,
    speed: 0,
    color: playerColor,
    lastUpdate: Date.now(),
    name: playerName,
    item: { type: ITEM_TYPES.BANANA, quantity: 0 },
    lives: 3,
  };

  console.log("[SERVER] New player connected", playerName, "with id", playerId);

  if (process.env.NODE_ENV !== "development") {
    sendToSlack(Object.keys(gameState.players).length, playerName, portalRef);
  }

  socket.emit("init", { id: playerId, color: playerColor });
  io.emit("gameState", gameState);

  socket.on("update", (data) => {
    updatePlayerPosition(playerId, data);
  });

  socket.on("useItem", (data) => {
    useItem(playerId);
  });

  socket.on("changeColor", (newColor: Color) => {
    console.log("[SERVER] Changing color to", newColor);
    if (
      !newColor ||
      typeof newColor !== "object" ||
      newColor.h === undefined ||
      newColor.s === undefined ||
      newColor.l === undefined
    )
      return;

    console.log("[SERVER] Changing color to", newColor);

    const player = gameState.players[playerId];
    if (!player) return;

    player.color = newColor;
    io.emit("gameState", gameState);
  });
  socket;

  socket.on("changeName", (newName: string) => {
    if (!newName || typeof newName !== "string" || newName.length > 64) return;

    const player = gameState.players[playerId];
    if (!player) return;

    player.name = newName;
    io.emit("gameState", gameState);
  });

  socket.on("disconnect", () => {
    delete gameState.players[playerId];
    io.emit("gameState", gameState);
  });
});

gameState.itemBoxes = itemBoxes.map((box, index) => ({
  id: index + 1,
  position: box.position,
}));

setInterval(() => {
  handleCollisions();
  updateGreenShells();
  updateRedShells();
  cleanupInactivePlayers();
}, 1000 / 60);

httpServer.listen(PORT, () => {
  console.log(`Socket.IO server running on port ${PORT}`);
});
setInterval(() => {
  io.emit("gameState", { ...gameState });
}, 10);

function sendToSlack(playerCount: number, playerName: string, portalRef: string) {
  fetch(
    "https://hooks.slack.com/triggers/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",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        player_count: playerCount,
        player_name: playerName,
        portal_ref: portalRef,
      }),
    }
  ).catch((error) => console.error("Error sending to Slack:", error));
}
