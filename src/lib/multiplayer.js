import { io } from "socket.io-client";

class MultiplayerManager {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.playerId = null;
    this.players = {};
    this.onPlayerJoined = null;
    this.onPlayerLeft = null;
    this.onPlayerUpdated = null;
  }

  connect(serverUrl = 'https://banana-racer.onrender.com') {
    return new Promise((resolve, reject) => {
      try {
        console.log('Attempting to connect to multiplayer server...');
        this.socket = io(serverUrl, {
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          timeout: 20000
        });

        // Set up event handlers
        this.socket.on('connect', () => {
          console.log('Connected to multiplayer server');
          this.connected = true;
          resolve();
        });

        this.socket.on('connect_error', (error) => {
          console.error('Connection error:', error);
          reject(error);
        });

        this.socket.on('disconnect', (reason) => {
          console.log(`Disconnected from server: ${reason}`);
          this.connected = false;
          
          if (reason === 'io server disconnect') {
            // The disconnection was initiated by the server, need to reconnect manually
            this.socket.connect();
          }
        });

        // Game-specific events
        this.socket.on('init', (data) => {
          this.playerId = data.id;
          console.log(`Initialized with player ID: ${this.playerId}`);
        });

        this.socket.on('worldJoined', (data) => {
          console.log(`Joined world with ${data.players.length} other players`);
          
          // Initialize other players
          data.players.forEach(player => {
            console.log(`Adding existing player: ${player.id}`);
            this.players[player.id] = player;
            if (this.onPlayerJoined) {
              this.onPlayerJoined(player);
            }
          });
        });

        this.socket.on('playerJoined', (data) => {
          const newPlayer = data.player;
          console.log(`Player joined: ${newPlayer.id} at position:`, newPlayer.position);
          this.players[newPlayer.id] = newPlayer;
          
          if (this.onPlayerJoined) {
            this.onPlayerJoined(newPlayer);
          }
        });

        this.socket.on('playerLeft', (data) => {
          const leftPlayerId = data.id;
          console.log(`Player left: ${leftPlayerId}`);
          const leftPlayer = this.players[leftPlayerId];
          
          if (leftPlayer && this.onPlayerLeft) {
            this.onPlayerLeft(leftPlayer);
          }
          
          delete this.players[leftPlayerId];
        });

        this.socket.on('playerUpdate', (data) => {
          const updatedPlayerId = data.id;
          
          if (updatedPlayerId !== this.playerId && this.players[updatedPlayerId]) {
            this.players[updatedPlayerId].position = data.position;
            this.players[updatedPlayerId].rotation = data.rotation;
            
            if (this.onPlayerUpdated) {
              this.onPlayerUpdated(this.players[updatedPlayerId]);
            }
          }
        });

      } catch (error) {
        console.error('Error creating Socket.IO connection:', error);
        reject(error);
      }
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.connected = false;
      this.playerId = null;
      this.players = {};
    }
  }

  updatePosition(position, rotation) {
    if (!this.socket || !this.connected) return;
    
    this.socket.emit('update', {
      position,
      rotation
    });
  }
}

// Export a singleton instance
const multiplayerManager = new MultiplayerManager();
export default multiplayerManager; 