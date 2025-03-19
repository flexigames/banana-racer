const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

// Create WebSocket server on port specified by environment variable or default to 8080
const PORT = process.env.PORT || 8080;
const wss = new WebSocket.Server({ port: PORT });

// Store connected players
const players = {};

console.log(`WebSocket server started on port ${PORT}`);

wss.on('connection', (ws) => {
  // Assign unique ID to each connection
  const playerId = uuidv4();
  players[playerId] = {
    id: playerId,
    ws: ws,
    position: { x: 0, y: 0.1, z: 0 },
    rotation: 0,
    lastUpdate: Date.now()
  };

  console.log(`Player ${playerId} connected`);

  // Send initial player ID
  ws.send(JSON.stringify({
    type: 'init',
    id: playerId
  }));

  // Automatically join the global world
  initializePlayer(playerId);

  // Handle messages from clients
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      
      switch (data.type) {
        case 'update':
          handlePlayerUpdate(playerId, data);
          break;
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });

  // Handle disconnection
  ws.on('close', () => {
    // Notify other players about disconnection
    broadcastToAll({
      type: 'playerLeft',
      id: playerId
    }, [playerId]);
    
    // Remove player
    delete players[playerId];
    console.log(`Player ${playerId} disconnected`);
  });
});

function initializePlayer(playerId) {
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
  
  console.log(`Positioned player ${playerId} at:`, player.position);
  
  // Send world info to player with all other players
  player.ws.send(JSON.stringify({
    type: 'worldJoined',
    players: Object.values(players)
      .filter(p => p.id !== playerId)
      .map(p => ({
        id: p.id,
        position: p.position,
        rotation: p.rotation
      }))
  }));
  
  // Notify other players about the new player
  broadcastToAll({
    type: 'playerJoined',
    player: {
      id: playerId,
      position: player.position,
      rotation: player.rotation
    }
  }, [playerId]);
  
  console.log(`Player ${playerId} joined the world`);
}

function handlePlayerUpdate(playerId, data) {
  const player = players[playerId];
  if (!player) return;
  
  // Update player data
  player.position = data.position;
  player.rotation = data.rotation;
  player.lastUpdate = Date.now();
  
  // Broadcast to other players
  broadcastToAll({
    type: 'playerUpdate',
    id: playerId,
    position: player.position,
    rotation: player.rotation
  }, [playerId]);
}

function broadcastToAll(data, excludeIds = []) {
  Object.values(players).forEach(player => {
    if (!excludeIds.includes(player.id)) {
      player.ws.send(JSON.stringify(data));
    }
  });
}

// Clean up inactive players every 30 seconds
setInterval(() => {
  const now = Date.now();
  Object.keys(players).forEach(playerId => {
    const player = players[playerId];
    if (now - player.lastUpdate > 30000) {
      player.ws.close();
      console.log(`Player ${playerId} timed out (inactive)`);
    }
  });
}, 30000); 