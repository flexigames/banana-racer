const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

// Create WebSocket server on port 8080
const wss = new WebSocket.Server({ port: 8080 });

// Store connected players
const players = {};
const rooms = {};

console.log('WebSocket server started on port 8080');

wss.on('connection', (ws) => {
  // Assign unique ID to each connection
  const playerId = uuidv4();
  players[playerId] = {
    id: playerId,
    ws: ws,
    room: null,
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

  // Handle messages from clients
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      
      switch (data.type) {
        case 'join':
          handleJoinRoom(playerId, data.room);
          break;
        case 'update':
          handlePlayerUpdate(playerId, data);
          break;
        case 'chat':
          handleChatMessage(playerId, data.message);
          break;
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });

  // Handle disconnection
  ws.on('close', () => {
    const roomId = players[playerId].room;
    
    // Remove player from room
    if (roomId && rooms[roomId]) {
      const index = rooms[roomId].players.indexOf(playerId);
      if (index !== -1) {
        rooms[roomId].players.splice(index, 1);
      }
      
      // Notify other players about disconnection
      broadcastToRoom(roomId, {
        type: 'playerLeft',
        id: playerId
      });
      
      // Clean up empty rooms
      if (rooms[roomId].players.length === 0) {
        delete rooms[roomId];
        console.log(`Room ${roomId} deleted (empty)`);
      }
    }
    
    // Remove player
    delete players[playerId];
    console.log(`Player ${playerId} disconnected`);
  });
});

function handleJoinRoom(playerId, roomId) {
  const player = players[playerId];
  
  // Leave current room if in one
  if (player.room && rooms[player.room]) {
    const index = rooms[player.room].players.indexOf(playerId);
    if (index !== -1) {
      rooms[player.room].players.splice(index, 1);
    }
    
    broadcastToRoom(player.room, {
      type: 'playerLeft',
      id: playerId
    });
  }
  
  // Create room if it doesn't exist
  if (!rooms[roomId]) {
    rooms[roomId] = {
      id: roomId,
      players: [],
      created: Date.now()
    };
    console.log(`Room ${roomId} created`);
  }
  
  // Join new room
  rooms[roomId].players.push(playerId);
  player.room = roomId;
  
  // Position players in different spots based on how many are in the room
  const playerCount = rooms[roomId].players.length;
  const spacing = 3; // Space between players
  
  // Reset player position - spread players out in a line
  player.position = { 
    x: (playerCount - 1) * spacing, 
    y: 0.1, 
    z: 0 
  };
  player.rotation = 0;
  
  console.log(`Positioned player ${playerId} at:`, player.position);
  
  // Send room info to player
  player.ws.send(JSON.stringify({
    type: 'roomJoined',
    room: roomId,
    players: rooms[roomId].players.map(id => ({
      id,
      position: players[id].position,
      rotation: players[id].rotation
    })).filter(p => p.id !== playerId)
  }));
  
  // Notify other players
  broadcastToRoom(roomId, {
    type: 'playerJoined',
    player: {
      id: playerId,
      position: player.position,
      rotation: player.rotation
    }
  }, [playerId]);
  
  console.log(`Player ${playerId} joined room ${roomId}`);
}

function handlePlayerUpdate(playerId, data) {
  const player = players[playerId];
  if (!player) return;
  
  // Update player data
  player.position = data.position;
  player.rotation = data.rotation;
  player.lastUpdate = Date.now();
  
  // Broadcast to other players in the same room
  if (player.room) {
    broadcastToRoom(player.room, {
      type: 'playerUpdate',
      id: playerId,
      position: player.position,
      rotation: player.rotation
    }, [playerId]);
  }
}

function handleChatMessage(playerId, message) {
  const player = players[playerId];
  if (!player || !player.room) return;
  
  broadcastToRoom(player.room, {
    type: 'chat',
    id: playerId,
    message: message
  });
}

function broadcastToRoom(roomId, data, excludeIds = []) {
  if (!rooms[roomId]) return;
  
  rooms[roomId].players.forEach(playerId => {
    if (!excludeIds.includes(playerId) && players[playerId]) {
      players[playerId].ws.send(JSON.stringify(data));
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