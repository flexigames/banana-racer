const { createServer } = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');

// Create HTTP server and Socket.IO server
const PORT = process.env.PORT || 8080;
const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: "*", // Allow all origins
    methods: ["GET", "POST"],
    allowedHeaders: ["*"],
    credentials: true
  }
});

// Store connected players
const players = {};

// Store active bananas - change from array to object for easier lookup
const bananas = {};

// Define available vehicle models (from actual files in assets)
const VEHICLE_MODELS = [
  'vehicle-racer',
  'vehicle-truck',
  'vehicle-suv',
  'vehicle-monster-truck',
  'vehicle-racer-low',
  'vehicle-speedster',
];

// Define available item types
const ITEM_TYPES = {
  BANANA: 'banana',
};

// Generate item boxes across the map
function generateItemBoxes(count = 20) {
  console.log(`[ITEM] Generating ${count} item boxes`);
  const boxes = [];
  const mapSize = 100; // Size of the playable area
  
  for (let i = 1; i <= count; i++) {
    const position = [
      (Math.random() * mapSize - mapSize/2),
      -0.1,
      (Math.random() * mapSize - mapSize/2)
    ];
    
    boxes.push({
      id: i,
      position: position
    });
    console.log(`[ITEM] Generated item box ${i} at position [${position.join(', ')}]`);
  }
  
  console.log(`[ITEM] Total item boxes generated: ${boxes.length}`);
  return boxes;
}

// Replace the static item boxes with generated ones
const itemBoxes = generateItemBoxes(20);

// Generate a random color in HSL format
function generateRandomColor() {
  // Use HSL for better color distribution and distinction
  return {
    h: Math.random(),   // hue: 0-1 (maps to 0-360 degrees)
    s: 0.65,            // saturation: slightly reduced for subtlety
    l: 0.55             // lightness: slightly increased for softer appearance
  };
}

// Select a random vehicle model
function selectRandomVehicle() {
  const randomIndex = Math.floor(Math.random() * VEHICLE_MODELS.length);
  return VEHICLE_MODELS[randomIndex];
}

// Generate a random ID for bananas
function generateBananaId() {
  return `banana-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

console.log(`Starting Socket.IO server on port ${PORT}`);

io.on('connection', (socket) => {
  // Assign unique ID to each connection
  const playerId = uuidv4();
  players[playerId] = {
    id: playerId,
    socket: socket.id,
    position: { x: 0, y: 0.1, z: 0 },
    rotation: 0,
    speed: 0,
    color: generateRandomColor(),
    vehicle: selectRandomVehicle(),
    lastUpdate: Date.now(),
    item: { type: ITEM_TYPES.BANANA, quantity: 0 } // Replace bananas with item object
  };

  console.log(`Player ${playerId} connected (socket: ${socket.id}), assigned vehicle: ${players[playerId].vehicle}`);

  // Send initial player ID
  socket.emit('init', { 
    id: playerId,
    color: players[playerId].color,
    vehicle: players[playerId].vehicle,
    item: players[playerId].item // Send item instead of bananas
  });

  // Automatically join the global world
  initializePlayer(socket, playerId);

  // Handle position updates
  socket.on('update', (data) => {
    handlePlayerUpdate(playerId, data);
  });

  // Handle item use (banana drop)
  socket.on('useItem', (data) => {
    handleItemUse(playerId, data);
  });

  // Handle banana collisions
  socket.on('hitBanana', (data) => {
    handleBananaHit(playerId, data.bananaId);
  });

  // Handle item box collection
  socket.on('collectItemBox', (data) => {
    handleItemBoxCollection(playerId, data.itemBoxId);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    // Notify other players about disconnection
    socket.broadcast.emit('playerLeft', { id: playerId });
    
    // Remove player
    delete players[playerId];
    console.log(`Player ${playerId} disconnected`);
  });
});

function initializePlayer(socket, playerId) {
  const player = players[playerId];
  
  // Position players in different spots based on how many are in the world
  const playerCount = Object.keys(players).length;
  const spacing = 3; // Space between players
  
  // Reset player position - spread players out in a line
  player.position = { 
    x: (playerCount - 1) * spacing, 
    y: 0.1, 
    z: 0 
  };
  player.rotation = 0;
  player.speed = 0;
  
  console.log(`Positioned player ${playerId} at:`, player.position);
  
  // Send world info to player with all other players
  const existingPlayers = Object.values(players)
    .filter(p => p.id !== playerId)
    .map(p => ({
      id: p.id,
      position: p.position,
      rotation: p.rotation,
      speed: p.speed,
      color: p.color,
      vehicle: p.vehicle,
      item: p.item // Send item instead of bananas
    }));
    
  // Convert itemBoxes to the format expected by the client
  const itemBoxesForClient = itemBoxes.map(box => ({
    id: box.id,
    position: box.position
  }));
  
  // Log what we're sending
  console.log(`[ITEM] Sending ${itemBoxesForClient.length} item boxes to player ${playerId}`);
  console.log(`[ITEM] First item box: ${JSON.stringify(itemBoxesForClient[0])}`);
  
  socket.emit('worldJoined', { 
    players: existingPlayers,
    bananas: Object.values(bananas), // Convert from object to array
    itemBoxes: itemBoxesForClient
  });
  
  console.log(`[ITEM] Sent ${itemBoxes.length} item boxes to player ${playerId}`);
  
  // Notify other players about the new player
  socket.broadcast.emit('playerJoined', {
    player: {
      id: playerId,
      position: player.position,
      rotation: player.rotation,
      speed: player.speed,
      color: player.color,
      vehicle: player.vehicle,
      item: player.item
    }
  });
  
  console.log(`Player ${playerId} joined the world`);
}

function handlePlayerUpdate(playerId, data) {
  const player = players[playerId];
  if (!player) return;
  
  // Update player data
  player.position = data.position;
  player.rotation = data.rotation;
  player.speed = data.speed || 0;
  player.lastUpdate = Date.now();
  
  // Broadcast to other players
  io.emit('playerUpdate', {
    id: playerId,
    position: player.position,
    rotation: player.rotation,
    speed: player.speed,
    color: player.color,
    vehicle: player.vehicle
  });
}

function handleBananaDrop(playerId, data) {
  // Replacing this function with handleItemUse
}

// New function to handle using items
function handleItemUse(playerId, data) {
  const player = players[playerId];
  console.log(`[ITEM USE] Player ${playerId} attempting to use item`);
  
  if (!player) {
    console.log(`[ITEM USE] Player ${playerId} not found`);
    return;
  }

  // Check if player has an item with quantity > 0
  if (!player.item || player.item.quantity <= 0) {
    console.log(`[ITEM USE] Player ${playerId} has no items to use`);
    return;
  }

  // Item use logic based on type
  if (player.item.type === ITEM_TYPES.BANANA) {
    // Reduce item quantity
    player.item.quantity--;
    console.log(`[ITEM USE] Player ${playerId} banana count reduced to ${player.item.quantity}`);

    // Create banana with the existing logic
    const bananaId = generateBananaId();
    const banana = {
      id: bananaId,
      position: data.position,
      rotation: data.rotation || 0,
      droppedBy: playerId,
      droppedAt: Date.now()
    };
    
    bananas[bananaId] = banana;
    console.log(`[ITEM USE] Created banana ${bananaId}, total bananas: ${Object.keys(bananas).length}`);

    // Broadcast banana drop to all players
    io.emit('bananaDropped', banana);
    
    // Confirm item update
    io.emit('itemUpdated', {
      playerId,
      item: player.item
    });
    
    // Set expiration timer
    setTimeout(() => {
      if (bananas[bananaId]) {
        delete bananas[bananaId];
        io.emit('bananaExpired', { id: bananaId });
      }
    }, 10000);
  }
}

function handleBananaHit(playerId, bananaId) {
  const player = players[playerId];
  console.log(`[BANANA HIT] Processing hit from player ${playerId} on banana ${bananaId}`);
  console.log(`[BANANA HIT] Players:`, Object.keys(players).length);
  console.log(`[BANANA HIT] Bananas:`, Object.keys(bananas).length);
  
  if (!player) {
    console.log(`[BANANA HIT] Player ${playerId} not found!`);
    return;
  }
  
  // Check if the banana exists in our object
  if (!bananas[bananaId]) {
    console.log(`[BANANA HIT] Banana ${bananaId} not found for hit by player ${playerId}`);
    return;
  }
  
  // Remove the banana from the object
  const hitBanana = bananas[bananaId];
  delete bananas[bananaId];
  
  // Notify all players about the banana being hit
  io.emit('bananaHit', { 
    id: bananaId,
    hitBy: playerId
  });
  
  console.log(`[BANANA HIT] Successfully processed: Player ${playerId} hit banana ${bananaId}`);
}

// Add a new function to handle item box collection
function handleItemBoxCollection(playerId, itemBoxId) {
  const player = players[playerId];
  if (!player) {
    console.log(`[ITEM] Collection failed: Player ${playerId} not found`);
    return;
  }
  
  // Find the item box
  const itemBoxIndex = itemBoxes.findIndex(box => box.id === itemBoxId);
  if (itemBoxIndex === -1) {
    console.log(`[ITEM] Collection failed: Item box ${itemBoxId} not found`);
    return;
  }
  
  console.log(`[ITEM] Player ${playerId} collected item box ${itemBoxId}`);
  
  // Give player a random quantity (1-5) of bananas
  const quantity = Math.floor(Math.random() * 5) + 1;
  // Always replace the current item with bananas
  player.item = { 
    type: ITEM_TYPES.BANANA, 
    quantity: quantity 
  };
  
  console.log(`[ITEM] Player ${playerId} received ${quantity} bananas`);
  
  // Remove the item box temporarily
  const collectedBox = itemBoxes.splice(itemBoxIndex, 1)[0];
  console.log(`[ITEM] Item box ${itemBoxId} removed from world`);
  
  // Broadcast item collection to all players
  io.emit('itemCollected', {
    playerId,
    itemBoxId
  });
  console.log(`[ITEM] Broadcast 'itemCollected' event for box ${itemBoxId}`);
  
  // Confirm item update to all players
  io.emit('itemUpdated', {
    playerId,
    item: player.item
  });
  console.log(`[ITEM] Broadcast 'itemUpdated' event for player ${playerId}`);
  
  // Schedule respawn after 15 seconds
  setTimeout(() => {
    // Add the item box back to the array
    itemBoxes.push(collectedBox);
    console.log(`[ITEM] Item box ${itemBoxId} respawned at position [${collectedBox.position.join(', ')}]`);
    
    // Broadcast item box respawn to all players
    io.emit('itemBoxSpawned', {
      itemBox: collectedBox
    });
    console.log(`[ITEM] Broadcast 'itemBoxSpawned' event for box ${itemBoxId}`);
  }, 15000);
}

// Clean up inactive players every 30 seconds
setInterval(() => {
  const now = Date.now();
  Object.keys(players).forEach(playerId => {
    const player = players[playerId];
    if (now - player.lastUpdate > 30000) {
      const socket = io.sockets.sockets.get(player.socket);
      if (socket) {
        socket.disconnect(true);
        console.log(`Player ${playerId} timed out (inactive)`);
      }
      delete players[playerId];
    }
  });
}, 30000);

// Start the server
httpServer.listen(PORT, () => {
  console.log(`Socket.IO server running on port ${PORT}`);
  console.log(`[ITEM] Server initialized with ${itemBoxes.length} item boxes`);
});