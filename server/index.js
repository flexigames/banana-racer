const { createServer } = require("http");
const { Server } = require("socket.io");
const { v4: uuidv4 } = require("uuid");

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
};

const gameState = {
  players: {},
  bananas: {},
  fakeCubes: {},
  itemBoxes: [],
};

function generateRandomColor() {
  return {
    h: Math.random(),
    s: 0.65,
    l: 0.55,
  };
}

function selectRandomVehicle() {
  return VEHICLE_MODELS[Math.floor(Math.random() * VEHICLE_MODELS.length)];
}

function generateId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function generateBananaId() {
  return generateId("banana");
}

function generateFakeCubeId() {
  return generateId("fake_cube");
}

function generateItemBoxes(count = 20) {
  const boxes = [];
  const mapSize = 100;

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

function initializePlayer(socket, playerId) {
  const player = gameState.players[playerId];
  const playerCount = Object.keys(gameState.players).length;
  const spacing = 3;

  player.position = {
    x: (playerCount - 1) * spacing,
    y: 0.1,
    z: 0,
  };
  player.rotation = 0;
  player.speed = 0;

  const existingPlayers = Object.values(gameState.players).filter(
    (p) => p.id !== playerId
  );

  socket.emit("worldJoined", {
    players: existingPlayers,
    bananas: Object.values(gameState.bananas),
    fakeCubes: Object.values(gameState.fakeCubes),
    itemBoxes: gameState.itemBoxes,
  });
}

function updatePlayerPosition(playerId, data) {
  const player = gameState.players[playerId];
  if (!player) return;

  player.position = data.position;
  player.rotation = data.rotation;
  player.speed = data.speed || 0;
  player.lastUpdate = Date.now();
}

function dropItem(playerId, data, itemType) {
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

function useItem(playerId, data) {
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
  }
}

function removeItem(collection, itemId) {
  if (!collection[itemId]) return;
  delete collection[itemId];
}

function handleItemBoxCollection(playerId, itemBoxId) {
  const player = gameState.players[playerId];
  if (!player || player.isItemSpinning || player.item?.quantity > 0) {
    gameState.itemBoxes = gameState.itemBoxes.filter(
      (box) => box.id !== itemBoxId
    );
    return;
  }

  gameState.itemBoxes = gameState.itemBoxes.filter(
    (box) => box.id !== itemBoxId
  );
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

function cleanupInactivePlayers() {
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

function checkCollision(pos1, pos2, radius) {
  const dx = pos1.x - pos2.x;
  const dz = pos1.z - pos2.z;
  return Math.sqrt(dx * dx + dz * dz) < radius;
}

function setPlayerSpinning(playerId, duration = 3000) {
  if (!gameState.players[playerId]) return;

  gameState.players[playerId].isSpinning = true;
  setTimeout(() => {
    if (gameState.players[playerId]) {
      gameState.players[playerId].isSpinning = false;
    }
  }, duration);
}

function handleCollisions() {
  Object.values(gameState.bananas).forEach((banana) => {
    Object.values(gameState.players).forEach((player) => {
      if (checkCollision(player.position, banana.position, 0.9)) {
        removeItem(gameState.bananas, banana.id);
        setPlayerSpinning(player.id);
      }
    });
  });

  Object.values(gameState.fakeCubes).forEach((fakeCube) => {
    Object.values(gameState.players).forEach((player) => {
      if (checkCollision(player.position, fakeCube.position, 0.9)) {
        removeItem(gameState.fakeCubes, fakeCube.id);
        setPlayerSpinning(player.id);
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
        setPlayerSpinning(player1.id);
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

io.on("connection", (socket) => {
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
  };

  socket.emit("init", {
    id: playerId,
    color: gameState.players[playerId].color,
    vehicle: gameState.players[playerId].vehicle,
    item: gameState.players[playerId].item,
  });

  initializePlayer(socket, playerId);

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

  socket.on("disconnect", () => {
    delete gameState.players[playerId];
  });
});

gameState.itemBoxes = generateItemBoxes(20);

setInterval(() => {
  handleCollisions();
  cleanupInactivePlayers();
}, 1000 / 60);

httpServer.listen(PORT, () => {
  console.log(`Socket.IO server running on port ${PORT}`);
});
setInterval(() => {
  io.emit("gameState", { ...gameState });
}, 10);

