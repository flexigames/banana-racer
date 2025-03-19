const { createServer } = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');

// Create HTTP server and Socket.IO server
const PORT = process.env.PORT || 8080;
const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Store connected players
const players = {};

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
    lastUpdate: Date.now()
  };

  console.log(`Player ${playerId} connected (socket: ${socket.id})`);

  // Send initial player ID
  socket.emit('init', { id: playerId });

  // Automatically join the global world
  initializePlayer(socket, playerId);

  // Handle position updates
  socket.on('update', (data) => {
    handlePlayerUpdate(playerId, data);
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
      speed: p.speed
    }));
    
  socket.emit('worldJoined', { players: existingPlayers });
  
  // Notify other players about the new player
  socket.broadcast.emit('playerJoined', {
    player: {
      id: playerId,
      position: player.position,
      rotation: player.rotation,
      speed: player.speed
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
    speed: player.speed
  });
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