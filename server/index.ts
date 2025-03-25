import { createServer } from "http";
import { Server, Socket } from "socket.io";
import { v4 as uuidv4 } from "uuid";

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

const ITEM_TYPES = {
  BANANA: "banana",
  BOOST: "boost",
  FAKE_CUBE: "fake_cube",
  GREEN_SHELL: "green_shell",
};

type Color = {
  h: number;
  s: number;
  l: number;
};

type Position = {
  x: number;
  y: number;
  z: number;
};

type Item = {
  type: string;
  quantity: number;
};

type GreenShell = {
  id: string;
  position: Position;
  rotation: number;
  direction: number;
  speed: number;
  droppedBy: string;
  droppedAt: number;
  bounces: number;
};

type Player = {
  id: string;
  socket: string;
  position: Position;
  rotation: number;
  speed: number;
  color: Color;
  vehicle: string;
  lastUpdate: number;
  item: Item;
  lives: number;
  isSpinning?: boolean;
  isBoosted?: boolean;
  isItemSpinning?: boolean;
};

type Banana = {
  id: string;
  position: Position;
  rotation: number;
  droppedBy: string;
  droppedAt: number;
};

type FakeCube = {
  id: string;
  position: Position;
  rotation: number;
  droppedBy: string;
  droppedAt: number;
};

type ItemBox = {
  id: number;
  position: number[];
};

type GameState = {
  players: Record<string, Player>;
  bananas: Record<string, Banana>;
  fakeCubes: Record<string, FakeCube>;
  greenShells: Record<string, GreenShell>;
  itemBoxes: ItemBox[];
};

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
      -0.1,
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
    y: 0.1,
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

function updatePlayerPosition(
  playerId: string,
  data: { position: Position; rotation: number; speed?: number }
): void {
  const player = gameState.players[playerId];
  if (!player || player.lives <= 0) return;

  player.position = data.position;
  player.rotation = data.rotation;
  player.speed = data.speed || 0;
  player.lastUpdate = Date.now();
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
    position: data.position,
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
    position: data.position,
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
  if (!player || player.isItemSpinning || player.item?.quantity > 0) {
    gameState.itemBoxes = gameState.itemBoxes.filter(
      (box) => box.id !== itemBoxId
    );
    return;
  }

  const collectedBox = gameState.itemBoxes.find((box) => box.id === itemBoxId);
  const boxPosition = collectedBox ? { ...collectedBox.position } : null;

  gameState.itemBoxes = gameState.itemBoxes.filter(
    (box) => box.id !== itemBoxId
  );
  player.isItemSpinning = true;

  if (boxPosition) {
    setTimeout(() => {
      gameState.itemBoxes.push({
        id: Date.now(),
        position: boxPosition,
      });
    }, 15000);
  }

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
  Object.values(gameState.greenShells).forEach((shell) => {
    const deltaTime = 1 / 60; // Assuming 60 FPS
    const mapSize = 30.5; // Half the map size (61/2)
    
    // Calculate new position
    const newX = shell.position.x + Math.sin(shell.direction) * shell.speed * deltaTime;
    const newZ = shell.position.z + Math.cos(shell.direction) * shell.speed * deltaTime;

    // Check for wall collisions
    let hitWall = false;
    
    if (Math.abs(newX) > mapSize) {
      // Hit left or right wall
      shell.direction = -shell.direction;
      shell.rotation = shell.direction;
      shell.position.x = Math.sign(newX) * mapSize;
      hitWall = true;
    } else {
      shell.position.x = newX;
    }

    if (Math.abs(newZ) > mapSize) {
      // Hit front or back wall
      shell.direction = Math.PI - shell.direction;
      shell.rotation = shell.direction;
      shell.position.z = Math.sign(newZ) * mapSize;
      hitWall = true;
    } else {
      shell.position.z = newZ;
    }

    if (hitWall) {
      shell.bounces++;
    }

    // Check for player collisions
    Object.values(gameState.players).forEach((player) => {
      // Only allow hitting the player who shot the shell after 1 second
      if (player.id === shell.droppedBy && Date.now() - shell.droppedAt < 1000) {
        return;
      }

      if (checkCollision(player.position, shell.position, 0.9)) {
        onHit(player.id);
        delete gameState.greenShells[shell.id];
      }
    });
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
