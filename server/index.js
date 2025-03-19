const { createServer } = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');

// Create HTTP server and Socket.IO server
const PORT = process.env.PORT || 8080;
const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: "*", // Allow all origins (in production, you might want to restrict this)
    methods: ["GET", "POST"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"]
  }
});

// Store connected players
const players = {};

// Store active bananas
const bananas = [];

// Define available vehicle models (from actual files in assets)
const VEHICLE_MODELS = [
  'vehicle-racer',
  'vehicle-truck',
  'vehicle-suv',
  'vehicle-monster-truck',
  'vehicle-racer-low',
  'vehicle-speedster',
];

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
    lastUpdate: Date.now()
  };

  console.log(`Player ${playerId} connected (socket: ${socket.id}), assigned vehicle: ${players[playerId].vehicle}`);

  // Send initial player ID
  socket.emit('init', { 
    id: playerId,
    color: players[playerId].color,
    vehicle: players[playerId].vehicle
  });

  // Automatically join the global world
  initializePlayer(socket, playerId);

  // Handle position updates
  socket.on('update', (data) => {
    handlePlayerUpdate(playerId, data);
  });

  // Handle banana drops
  socket.on('dropBanana', (data) => {
    handleBananaDrop(playerId, data);
  });

  // Handle banana collisions
  socket.on('hitBanana', (data) => {
    handleBananaHit(playerId, data.bananaId);
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
      vehicle: p.vehicle
    }));
    
  socket.emit('worldJoined', { 
    players: existingPlayers,
    bananas: bananas // Send existing bananas to new player
  });
  
  // Notify other players about the new player
  socket.broadcast.emit('playerJoined', {
    player: {
      id: playerId,
      position: player.position,
      rotation: player.rotation,
      speed: player.speed,
      color: player.color,
      vehicle: player.vehicle
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
  const player = players[playerId];
  if (!player) return;
  
  // Create banana with unique ID
  const bananaId = generateBananaId();
  const banana = {
    id: bananaId,
    position: data.position,
    rotation: data.rotation,
    droppedBy: playerId,
    timestamp: Date.now()
  };
  
  // Add to bananas array
  bananas.push(banana);
  
  // Broadcast banana drop to all players
  io.emit('bananaDropped', banana);
  
  console.log(`Player ${playerId} dropped a banana at position:`, data.position);
  
  // Set timeout to remove the banana after 10 seconds
  setTimeout(() => {
    const bananaIndex = bananas.findIndex(b => b.id === bananaId);
    if (bananaIndex !== -1) {
      bananas.splice(bananaIndex, 1);
      io.emit('bananaExpired', { id: bananaId });
      console.log(`Banana ${bananaId} expired`);
    }
  }, 10000);
}

function handleBananaHit(playerId, bananaId) {
  const player = players[playerId];
  if (!player) return;
  
  // Find the banana in the array
  const bananaIndex = bananas.findIndex(b => b.id === bananaId);
  if (bananaIndex === -1) return;
  
  // Remove the banana from the array
  const hitBanana = bananas.splice(bananaIndex, 1)[0];
  
  // Notify all players about the banana being hit
  io.emit('bananaHit', { 
    id: bananaId,
    hitBy: playerId
  });
  
  console.log(`Player ${playerId} hit banana ${bananaId}`);
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
}); 