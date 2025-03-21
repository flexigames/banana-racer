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

// Store active cannonballs
const cannonballs = {};

// Store active fake cubes
const fakeCubes = {};

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
  BOOST: 'boost',
  CANNON: 'cannon',
  FAKE_CUBE: 'fake_cube', // Add fake cube type
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

// Generate a random ID for cannonballs
function generateCannonballId() {
  return `cannon-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Add a function to generate fake cube IDs
function generateFakeCubeId() {
  return `fake_cube_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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

  // Handle cannon collisions
  socket.on('hitCannon', (data) => {
    handleCannonHit(playerId, data.cannonId);
  });

  // Handle item box collection
  socket.on('collectItemBox', (data) => {
    handleItemBoxCollection(playerId, data.itemBoxId);
  });

  // Handle fake cube collisions
  socket.on('hitFakeCube', (data) => {
    handleFakeCubeHit(playerId, data.fakeCubeId);
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
    cannonballs: Object.values(cannonballs), // Send active cannonballs
    itemBoxes: itemBoxesForClient,
    fakeCubes: Object.values(fakeCubes) // Add fake cubes
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
    }, 120000);
  } else if (player.item.type === ITEM_TYPES.BOOST) {
    // Reduce item quantity
    player.item.quantity--;
    console.log(`[ITEM USE] Player ${playerId} boost count reduced to ${player.item.quantity}`);

    // Apply boost (client will handle the actual speed boost)
    io.emit('playerBoosted', {
      playerId: playerId
    });
    
    // Confirm item update
    io.emit('itemUpdated', {
      playerId,
      item: player.item
    });
  } else if (player.item.type === ITEM_TYPES.CANNON) {
    // Reduce item quantity
    player.item.quantity--;
    console.log(`[ITEM USE] Player ${playerId} cannon count reduced to ${player.item.quantity}`);
    
    // Create a cannon ball (using a unique ID similar to bananas)
    const cannonId = generateCannonballId();
    
    // Set default velocity if not provided (forward direction)
    const defaultVelocity = {
      x: Math.sin(data.rotation || 0) * 30,
      y: 0,
      z: Math.cos(data.rotation || 0) * 30
    };
    
    // Cannon projectile data
    const cannonData = {
      id: cannonId,
      position: data.position,
      rotation: data.rotation || 0,
      velocity: data.velocity || defaultVelocity,
      firedBy: playerId,
      firedAt: Date.now()
    };
    
    // Store the cannonball
    cannonballs[cannonId] = cannonData;
    console.log(`[ITEM USE] Created cannonball ${cannonId} with velocity ${JSON.stringify(cannonData.velocity)}`);
    
    // Broadcast cannon fire to all players
    io.emit('cannonFired', cannonData);
    
    // Confirm item update
    io.emit('itemUpdated', {
      playerId,
      item: player.item
    });
    
    // Set expiration timer for the cannonball (10 seconds)
    setTimeout(() => {
      if (cannonballs[cannonId]) {
        delete cannonballs[cannonId];
        io.emit('cannonExpired', { id: cannonId });
        console.log(`[ITEM USE] Cannonball ${cannonId} expired`);
      }
    }, 10000);
  } else if (player.item.type === ITEM_TYPES.FAKE_CUBE) {
    // Reduce item quantity
    player.item.quantity--;
    console.log(`[ITEM USE] Player ${playerId} fake cube count reduced to ${player.item.quantity}`);

    // Create fake cube with unique ID
    const fakeCubeId = generateFakeCubeId();
    const fakeCube = {
      id: fakeCubeId,
      position: data.position,
      rotation: data.rotation || 0,
      droppedBy: playerId,
      droppedAt: Date.now()
    };
    
    fakeCubes[fakeCubeId] = fakeCube;
    console.log(`[ITEM USE] Created fake cube ${fakeCubeId}, total fake cubes: ${Object.keys(fakeCubes).length}`);

    // Broadcast fake cube drop to all players
    io.emit('fakeCubeDropped', fakeCube);
    
    // Confirm item update
    io.emit('itemUpdated', {
      playerId,
      item: player.item
    });
    
    // Set expiration timer (120 seconds)
    setTimeout(() => {
      if (fakeCubes[fakeCubeId]) {
        delete fakeCubes[fakeCubeId];
        io.emit('fakeCubeExpired', { id: fakeCubeId });
      }
    }, 120000);
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

// Add a new function to handle cannon hits
function handleCannonHit(playerId, cannonId) {
  const player = players[playerId];
  console.log(`[CANNON HIT] Processing hit from cannon ${cannonId} on player ${playerId}`);
  
  if (!player) {
    console.log(`[CANNON HIT] Player ${playerId} not found!`);
    return;
  }
  
  // Check if the cannonball exists
  if (!cannonballs[cannonId]) {
    console.log(`[CANNON HIT] Cannonball ${cannonId} not found for hit on player ${playerId}`);
    return;
  }
  
  // Remove the cannonball
  const hitCannonball = cannonballs[cannonId];
  delete cannonballs[cannonId];
  
  // Notify all players about the cannon hit
  io.emit('cannonHit', { 
    id: cannonId,
    hitPlayer: playerId,
    firedBy: hitCannonball.firedBy
  });
  
  console.log(`[CANNON HIT] Successfully processed: Cannon ${cannonId} fired by ${hitCannonball.firedBy} hit player ${playerId}`);
}

// Add a function to handle fake cube hits
function handleFakeCubeHit(playerId, fakeCubeId) {
  if (!fakeCubes[fakeCubeId]) {
    console.log(`[FAKE CUBE] Hit failed: Fake cube ${fakeCubeId} not found`);
    return;
  }
  
  // Remove the fake cube
  delete fakeCubes[fakeCubeId];
  
  // Broadcast hit to all players
  io.emit('fakeCubeHit', {
    id: fakeCubeId,
    hitBy: playerId
  });
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
  
  // Randomly decide which item to give (banana, boost, cannon, or fake cube)
  const itemTypeRoll = Math.random();
  let itemType;
  
  // 1/4 chance for each item type
  if (itemTypeRoll < 0.25) {
    itemType = ITEM_TYPES.BANANA;
  } else if (itemTypeRoll < 0.5) {
    itemType = ITEM_TYPES.BOOST;
  } else if (itemTypeRoll < 0.75) {
    itemType = ITEM_TYPES.CANNON;
  } else {
    itemType = ITEM_TYPES.FAKE_CUBE;
  }
  
  // Give player a random quantity (1-3) of the selected item
  const quantity = Math.floor(Math.random() * 3) + 1;
  
  // Update player's item
  player.item = { 
    type: itemType, 
    quantity: quantity 
  };
  
  console.log(`[ITEM] Player ${playerId} received ${quantity} ${itemType}s`);
  
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