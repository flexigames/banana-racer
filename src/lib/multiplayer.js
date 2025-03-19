class MultiplayerManager {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.playerId = null;
    this.room = null;
    this.players = {};
    this.onPlayerJoined = null;
    this.onPlayerLeft = null;
    this.onPlayerUpdated = null;
    this.onChatMessage = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  connect(serverUrl = 'ws://localhost:8080') {
    return new Promise((resolve, reject) => {
      try {
        console.log('Attempting to connect to multiplayer server...');
        this.socket = new WebSocket(serverUrl);

        this.socket.onopen = () => {
          console.log('Connected to multiplayer server');
          this.connected = true;
          this.reconnectAttempts = 0;
          resolve();
        };

        this.socket.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.connected = false;
          reject(error);
        };

        this.socket.onclose = (event) => {
          console.log(`Disconnected from multiplayer server: ${event.code} ${event.reason}`);
          this.connected = false;
          
          // Only attempt to reconnect if it wasn't a clean close
          if (!event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
            setTimeout(() => this.connect(serverUrl), 2000);
          } else {
            this.playerId = null;
            this.room = null;
            this.players = {};
          }
        };

        this.socket.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            console.log('Received message:', message.type);
            this.handleMessage(message);
          } catch (error) {
            console.error('Error parsing message:', error);
          }
        };
      } catch (error) {
        console.error('Error creating WebSocket connection:', error);
        reject(error);
      }
    });
  }

  handleMessage(message) {
    switch (message.type) {
      case 'init':
        this.playerId = message.id;
        console.log(`Initialized with player ID: ${this.playerId}`);
        break;
        
      case 'roomJoined':
        this.room = message.room;
        console.log(`Joined room: ${this.room} with ${message.players.length} other players`);
        
        // Initialize other players
        message.players.forEach(player => {
          console.log(`Adding existing player: ${player.id}`);
          this.players[player.id] = player;
          if (this.onPlayerJoined) {
            this.onPlayerJoined(player);
          }
        });
        break;
        
      case 'playerJoined':
        const newPlayer = message.player;
        console.log(`Player joined: ${newPlayer.id} at position:`, newPlayer.position);
        this.players[newPlayer.id] = newPlayer;
        
        if (this.onPlayerJoined) {
          this.onPlayerJoined(newPlayer);
        }
        break;
        
      case 'playerLeft':
        const leftPlayerId = message.id;
        console.log(`Player left: ${leftPlayerId}`);
        const leftPlayer = this.players[leftPlayerId];
        
        if (leftPlayer && this.onPlayerLeft) {
          this.onPlayerLeft(leftPlayer);
        }
        
        delete this.players[leftPlayerId];
        break;
        
      case 'playerUpdate':
        const updatedPlayerId = message.id;
        
        if (this.players[updatedPlayerId]) {
          this.players[updatedPlayerId].position = message.position;
          this.players[updatedPlayerId].rotation = message.rotation;
          
          if (this.onPlayerUpdated) {
            this.onPlayerUpdated(this.players[updatedPlayerId]);
          }
        }
        break;
        
      case 'chat':
        if (this.onChatMessage) {
          this.onChatMessage(message.id, message.message);
        }
        break;
        
      default:
        console.warn(`Unknown message type: ${message.type}`);
    }
  }

  joinRoom(roomId) {
    if (!this.connected) {
      console.warn('Cannot join room: not connected');
      return;
    }
    
    console.log(`Joining room: ${roomId}`);
    this.socket.send(JSON.stringify({
      type: 'join',
      room: roomId
    }));
  }

  updatePosition(position, rotation) {
    if (!this.connected || !this.room) return;
    
    this.socket.send(JSON.stringify({
      type: 'update',
      position,
      rotation
    }));
  }

  sendChatMessage(message) {
    if (!this.connected || !this.room) {
      console.warn('Cannot send chat: not in a room');
      return;
    }
    
    this.socket.send(JSON.stringify({
      type: 'chat',
      message
    }));
  }

  disconnect() {
    if (this.socket) {
      this.socket.close(1000, "Intentional disconnect");
    }
  }
}

export default new MultiplayerManager(); 