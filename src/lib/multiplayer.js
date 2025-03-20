import { io } from "socket.io-client";

const LOCAL_SERVER_URL = "http://localhost:8080";
const REMOTE_SERVER_URL = "https://banana-racer.onrender.com";

class MultiplayerManager {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.playerId = null;
    this.playerColor = null;
    this.playerVehicle = "vehicle-racer"; // Default vehicle model
    this.players = {};
    this.bananas = [];
    this.onPlayerJoined = null;
    this.onPlayerLeft = null;
    this.onPlayerUpdated = null;
    this.onBananaDropped = null;
    this.onBananaExpired = null;
    this.onBananaHit = null;
    this.serverUrl = REMOTE_SERVER_URL; // Default to remote server
  }

  // New method to set server URL
  setServerUrl(useLocalServer = false) {
    this.serverUrl = useLocalServer ? LOCAL_SERVER_URL : REMOTE_SERVER_URL;
    console.log(`Server URL set to: ${this.serverUrl}`);
    return this.serverUrl;
  }

  connect(serverUrl = null) {
    return new Promise((resolve, reject) => {
      try {
        // Use provided serverUrl, or fall back to the instance serverUrl
        const url = serverUrl || this.serverUrl;
        console.log(`Attempting to connect to multiplayer server at ${url}...`);
        
        this.socket = io(url, {
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          timeout: 20000,
        });

        // Set up event handlers
        this.socket.on("connect", () => {
          console.log("Connected to multiplayer server");
          this.connected = true;
          resolve();
        });

        this.socket.on("connect_error", (error) => {
          console.error("Connection error:", error);
          reject(error);
        });

        this.socket.on("disconnect", (reason) => {
          console.log(`Disconnected from server: ${reason}`);
          this.connected = false;

          if (reason === "io server disconnect") {
            // The disconnection was initiated by the server, need to reconnect manually
            this.socket.connect();
          }
        });

        // Game-specific events
        this.socket.on("init", (data) => {
          this.playerId = data.id;
          this.playerColor = data.color;
          this.playerVehicle = data.vehicle || "vehicle-racer";
          console.log(
            `Initialized with player ID: ${this.playerId}, color:`,
            this.playerColor,
            "vehicle:",
            this.playerVehicle
          );
        });

        this.socket.on("worldJoined", (data) => {
          console.log(
            `Joined world with ${data.players.length} other players and ${
              data.bananas ? data.bananas.length : 0
            } bananas`
          );

          // Initialize other players
          data.players.forEach((player) => {
            console.log(`Adding existing player: ${player.id}`);
            this.players[player.id] = player;
            // Ensure speed property exists
            if (typeof player.speed === "undefined") {
              player.speed = 0;
            }
            // Ensure color property exists
            if (!player.color) {
              player.color = { h: 0, s: 0.8, l: 0.5 }; // Default color
            }
            // Ensure vehicle property exists
            if (!player.vehicle) {
              player.vehicle = "vehicle-racer"; // Default vehicle
            }
            if (this.onPlayerJoined) {
              this.onPlayerJoined(player);
            }
          });

          // Initialize existing bananas
          if (data.bananas && data.bananas.length > 0) {
            this.bananas = data.bananas;
            data.bananas.forEach((banana) => {
              if (this.onBananaDropped) {
                this.onBananaDropped(banana);
              }
            });
          }
        });

        this.socket.on("playerJoined", (data) => {
          const newPlayer = data.player;
          console.log(
            `Player joined: ${newPlayer.id} at position:`,
            newPlayer.position
          );
          // Ensure speed property exists
          if (typeof newPlayer.speed === "undefined") {
            newPlayer.speed = 0;
          }
          // Ensure color property exists
          if (!newPlayer.color) {
            newPlayer.color = { h: 0, s: 0.8, l: 0.5 }; // Default color
          }
          // Ensure vehicle property exists
          if (!newPlayer.vehicle) {
            newPlayer.vehicle = "vehicle-racer"; // Default vehicle
          }
          this.players[newPlayer.id] = newPlayer;

          if (this.onPlayerJoined) {
            this.onPlayerJoined(newPlayer);
          }
        });

        this.socket.on("playerLeft", (data) => {
          const leftPlayerId = data.id;
          console.log(`Player left: ${leftPlayerId}`);
          const leftPlayer = this.players[leftPlayerId];

          if (leftPlayer && this.onPlayerLeft) {
            this.onPlayerLeft(leftPlayer);
          }

          delete this.players[leftPlayerId];
        });

        this.socket.on("playerUpdate", (data) => {
          const updatedPlayerId = data.id;

          if (
            updatedPlayerId !== this.playerId &&
            this.players[updatedPlayerId]
          ) {
            this.players[updatedPlayerId].position = data.position;
            this.players[updatedPlayerId].rotation = data.rotation;
            this.players[updatedPlayerId].speed = data.speed || 0;

            // Update color if provided
            if (data.color) {
              this.players[updatedPlayerId].color = data.color;
            }

            // Update vehicle if provided
            if (data.vehicle) {
              this.players[updatedPlayerId].vehicle = data.vehicle;
            }

            if (this.onPlayerUpdated) {
              this.onPlayerUpdated(this.players[updatedPlayerId]);
            }
          }
        });

        // Banana events
        this.socket.on("bananaDropped", (banana) => {
          console.log(
            `New banana dropped by player ${banana.droppedBy} at position:`,
            banana.position
          );

          // Add to local banana list
          this.bananas.push(banana);

          // Notify callback
          if (this.onBananaDropped) {
            this.onBananaDropped(banana);
          }
        });

        this.socket.on("bananaExpired", (data) => {
          console.log(`Banana ${data.id} expired`);

          // Remove from local banana list
          this.bananas = this.bananas.filter((b) => b.id !== data.id);

          // Notify callback
          if (this.onBananaExpired) {
            this.onBananaExpired(data.id);
          }
        });

        this.socket.on("bananaHit", (data) => {
          console.log(`Banana ${data.id} was hit by player ${data.hitBy}`);

          // Remove from local banana list
          this.bananas = this.bananas.filter((b) => b.id !== data.id);

          // Notify callback
          if (this.onBananaHit) {
            this.onBananaHit(data.id, data.hitBy);
          }
        });
      } catch (error) {
        console.error("Error creating Socket.IO connection:", error);
        reject(error);
      }
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.connected = false;
      this.playerId = null;
      this.playerColor = null;
      this.playerVehicle = "vehicle-racer";
      this.players = {};
      this.bananas = [];
    }
  }

  updatePosition(position, rotation, speed = 0) {
    if (!this.socket || !this.connected) return;

    this.socket.emit("update", {
      position,
      rotation,
      speed,
    });
  }

  dropBanana(position, rotation) {
    if (!this.socket || !this.connected) return;

    this.socket.emit("dropBanana", {
      position,
      rotation,
    });
  }

  hitBanana(bananaId) {
    if (!this.socket || !this.connected) return;

    this.socket.emit("hitBanana", {
      bananaId,
    });
  }
}

// Export a singleton instance
const multiplayerManager = new MultiplayerManager();

// Check if we're in development mode with a specific flag
if (import.meta.env.DEV) {
  // Check for environment variable first, then localStorage
  const useLocalServer = import.meta.env.VITE_USE_LOCAL_SERVER === 'true' || 
                         window.localStorage.getItem('useLocalServer') === 'true';
  if (useLocalServer) {
    multiplayerManager.setServerUrl(true);
    console.log('Using local server (localhost:8080) for multiplayer');
  } else {
    console.log('Using remote server for multiplayer');
  }
}

export default multiplayerManager;
