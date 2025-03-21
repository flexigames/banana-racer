const { createServer } = require("http");
const { Server } = require("socket.io");
const { v4: uuidv4 } = require("uuid");

// Create HTTP server and Socket.IO server
const PORT = process.env.PORT || 8080;
const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: "*", // Allow all origins
    methods: ["GET", "POST"],
    allowedHeaders: ["*"],
    credentials: true,
  },
});

// Define available vehicle models (from actual files in assets)
const VEHICLE_MODELS = [
  "vehicle-racer",
  "vehicle-truck",
  "vehicle-suv",
  "vehicle-monster-truck",
  "vehicle-racer-low",
  "vehicle-speedster",
];

// Define available item types
const ITEM_TYPES = {
  BANANA: "banana",
  BOOST: "boost",
  CANNON: "cannon",
  FAKE_CUBE: "fake_cube",
};

const gameState = {
  players: {},
  bananas: {},
  cannonballs: {},
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
  const randomIndex = Math.floor(Math.random() * VEHICLE_MODELS.length);
  return VEHICLE_MODELS[randomIndex];
}

function generateBananaId() {
  return `banana-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function generateCannonballId() {
  return `cannon-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function generateFakeCubeId() {
  return `fake_cube_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function generateItemBoxes(count = 20) {
  console.log(`[ITEM] Generating ${count} item boxes`);
  const boxes = [];
  const mapSize = 100;

  for (let i = 1; i <= count; i++) {
    const position = [
      Math.random() * mapSize - mapSize / 2,
      -0.1,
      Math.random() * mapSize - mapSize / 2,
    ];

    boxes.push({
      id: i,
      position: position,
    });
    console.log(
      `[ITEM] Generated item box ${i} at position [${position.join(", ")}]`
    );
  }

  console.log(`[ITEM] Total item boxes generated: ${boxes.length}`);
  return boxes;
}

// Game logic functions
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

  console.log(`Positioned player ${playerId} at:`, player.position);

  const existingPlayers = Object.values(gameState.players).filter(
    (p) => p.id !== playerId
  );

  console.log(
    `[ITEM] Sending ${gameState.itemBoxes.length} item boxes to player ${playerId}`
  );

  socket.emit("worldJoined", {
    players: existingPlayers,
    bananas: Object.values(gameState.bananas),
    cannonballs: Object.values(gameState.cannonballs),
    itemBoxes: gameState.itemBoxes,
    fakeCubes: Object.values(gameState.fakeCubes),
  });

  socket.broadcast.emit("playerJoined", {
    player,
  });

  console.log(`Player ${playerId} joined the world`);
}

function handlePlayerUpdate(playerId, data) {
  const player = gameState.players[playerId];
  if (!player) return;

  player.position = data.position;
  player.rotation = data.rotation;
  player.speed = data.speed || 0;
  player.lastUpdate = Date.now();

  io.emit("playerUpdate", player);
}

function handleItemUse(playerId, data) {
  const player = gameState.players[playerId];
  console.log(`[ITEM USE] Player ${playerId} attempting to use item`);

  if (!player || !player.item || player.item.quantity <= 0) {
    console.log(`[ITEM USE] Player ${playerId} has no items to use`);
    return;
  }

  player.item.quantity--;
  console.log(
    `[ITEM USE] Player ${playerId} ${player.item.type} count reduced to ${player.item.quantity}`
  );

  switch (player.item.type) {
    case ITEM_TYPES.BANANA: {
      const bananaId = generateBananaId();
      const banana = {
        id: bananaId,
        position: data.position,
        rotation: data.rotation || 0,
        droppedBy: playerId,
        droppedAt: Date.now(),
      };

      gameState.bananas[bananaId] = banana;

      setTimeout(() => {
        if (gameState.bananas[bananaId]) {
          delete gameState.bananas[bananaId];
        }
      }, 120000);
      break;
    }
    case ITEM_TYPES.BOOST: {
      // Set boost state in player
      player.isBoosted = true;
      // Reset boost after 5 seconds
      setTimeout(() => {
        if (gameState.players[playerId]) {
          gameState.players[playerId].isBoosted = false;
        }
      }, 5000);
      break;
    }
    case ITEM_TYPES.CANNON: {
      const cannonId = generateCannonballId();
      const defaultVelocity = {
        x: Math.sin(data.rotation || 0) * 30,
        y: 0,
        z: Math.cos(data.rotation || 0) * 30,
      };

      const cannonData = {
        id: cannonId,
        position: data.position,
        rotation: data.rotation || 0,
        velocity: data.velocity || defaultVelocity,
        firedBy: playerId,
        firedAt: Date.now(),
      };

      gameState.cannonballs[cannonId] = cannonData;
      io.emit("cannonFired", cannonData);

      setTimeout(() => {
        if (gameState.cannonballs[cannonId]) {
          delete gameState.cannonballs[cannonId];
          io.emit("cannonExpired", { id: cannonId });
        }
      }, 10000);
      break;
    }
    case ITEM_TYPES.FAKE_CUBE: {
      const fakeCubeId = generateFakeCubeId();
      const fakeCube = {
        id: fakeCubeId,
        position: data.position,
        rotation: data.rotation || 0,
        droppedBy: playerId,
        droppedAt: Date.now(),
      };

      gameState.fakeCubes[fakeCubeId] = fakeCube;

      setTimeout(() => {
        if (gameState.fakeCubes[fakeCubeId]) {
          delete gameState.fakeCubes[fakeCubeId];
        }
      }, 120000);
      break;
    }
  }

  io.emit("itemUpdated", {
    playerId,
    item: player.item,
  });
}

function handleBananaHit(playerId, bananaId) {
  const player = gameState.players[playerId];
  if (!player || !gameState.bananas[bananaId]) return;

  delete gameState.bananas[bananaId];
}

function handleCannonHit(playerId, cannonId) {
  const player = gameState.players[playerId];
  if (!player || !gameState.cannonballs[cannonId]) return;

  const hitCannonball = gameState.cannonballs[cannonId];
  delete gameState.cannonballs[cannonId];

  io.emit("cannonHit", {
    id: cannonId,
    hitPlayer: playerId,
    firedBy: hitCannonball.firedBy,
  });
}

function handleFakeCubeHit(playerId, fakeCubeId) {
  if (!gameState.fakeCubes[fakeCubeId]) return;

  delete gameState.fakeCubes[fakeCubeId];
}

function handleItemBoxCollection(playerId, itemBoxId) {
  const player = gameState.players[playerId];
  if (!player) return;

  const itemBoxIndex = gameState.itemBoxes.findIndex(
    (box) => box.id === itemBoxId
  );
  if (itemBoxIndex === -1) return;

  const itemTypeRoll = Math.random();
  let itemType;

  if (itemTypeRoll < 0.25) itemType = ITEM_TYPES.BANANA;
  else if (itemTypeRoll < 0.5) itemType = ITEM_TYPES.BOOST;
  else if (itemTypeRoll < 0.75) itemType = ITEM_TYPES.CANNON;
  else itemType = ITEM_TYPES.FAKE_CUBE;

  const quantity = Math.floor(Math.random() * 3) + 1;
  player.item = { type: itemType, quantity };

  const collectedBox = gameState.itemBoxes.splice(itemBoxIndex, 1)[0];

  io.emit("itemCollected", { playerId, itemBoxId });
  io.emit("itemUpdated", { playerId, item: player.item });

  setTimeout(() => {
    gameState.itemBoxes.push(collectedBox);
  }, 15000);
}

function cleanupInactivePlayers() {
  const now = Date.now();
  Object.keys(gameState.players).forEach((playerId) => {
    const player = gameState.players[playerId];
    if (now - player.lastUpdate > 30000) {
      const socket = io.sockets.sockets.get(player.socket);
      if (socket) {
        socket.disconnect(true);
        console.log(`Player ${playerId} timed out (inactive)`);
      }
      delete gameState.players[playerId];
    }
  });
}

// Initialize item boxes
gameState.itemBoxes = generateItemBoxes(20);

// Socket.IO connection handling
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

  console.log(
    `Player ${playerId} connected (socket: ${socket.id}), assigned vehicle: ${gameState.players[playerId].vehicle}`
  );

  socket.emit("init", {
    id: playerId,
    color: gameState.players[playerId].color,
    vehicle: gameState.players[playerId].vehicle,
    item: gameState.players[playerId].item,
  });

  initializePlayer(socket, playerId);

  socket.on("update", (data) => {
    handlePlayerUpdate(playerId, data);
  });

  socket.on("useItem", (data) => {
    handleItemUse(playerId, data);
  });

  socket.on("hitBanana", (data) => {
    handleBananaHit(playerId, data.bananaId);
  });

  socket.on("hitCannon", (data) => {
    handleCannonHit(playerId, data.cannonId);
  });

  socket.on("collectItemBox", (data) => {
    handleItemBoxCollection(playerId, data.itemBoxId);
  });

  socket.on("hitFakeCube", (data) => {
    handleFakeCubeHit(playerId, data.fakeCubeId);
  });

  socket.on("disconnect", () => {
    socket.broadcast.emit("playerLeft", { id: playerId });
    delete gameState.players[playerId];
    console.log(`Player ${playerId} disconnected`);
  });
});

// Clean up inactive players every 30 seconds
setInterval(() => {
  cleanupInactivePlayers();
}, 30000);

// Start the server
httpServer.listen(PORT, () => {
  console.log(`Socket.IO server running on port ${PORT}`);
  console.log(
    `[ITEM] Server initialized with ${gameState.itemBoxes.length} item boxes`
  );
});

setInterval(() => {
  console.log("Emitting game state");
  io.emit("gameState", gameState);
}, 10);
