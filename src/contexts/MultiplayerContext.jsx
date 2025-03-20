import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { io } from "socket.io-client";

// Constants
const LOCAL_SERVER_URL = "http://localhost:8080";
const REMOTE_SERVER_URL = "https://banana-racer.onrender.com";

// Create the context
const MultiplayerContext = createContext(null);

// Custom hook to use the context
export const useMultiplayer = () => {
  const context = useContext(MultiplayerContext);
  if (!context) {
    throw new Error('useMultiplayer must be used within a MultiplayerProvider');
  }
  return context;
};

// Provider component
export const MultiplayerProvider = ({ children }) => {
  // Socket connection
  const socket = useRef(null);
  
  // State
  const [connected, setConnected] = useState(false);
  const [playerId, setPlayerId] = useState(null);
  const [playerColor, setPlayerColor] = useState(null);
  const [playerVehicle, setPlayerVehicle] = useState("vehicle-racer");
  const [players, setPlayers] = useState({});
  const [bananas, setBananas] = useState([]);
  const [itemBoxes, setItemBoxes] = useState([]);
  const [lastItemUseTime, setLastItemUseTime] = useState(0);
  const itemUseTimeout = 20;

  // Server URL
  const [serverUrl, setServerUrl] = useState(() => {
    // Check if we're in development mode
    if (import.meta.env.DEV) {
      // Check for environment variable first, then localStorage
      const useLocalServer = import.meta.env.VITE_USE_LOCAL_SERVER === 'true' || 
                            window.localStorage.getItem('useLocalServer') === 'true';
      return useLocalServer ? LOCAL_SERVER_URL : REMOTE_SERVER_URL;
    }
    return REMOTE_SERVER_URL;
  });

  // Initialize socket connection
  useEffect(() => {
    console.log("[CONTEXT] Initializing connection to", serverUrl);

    const connect = async () => {
      try {
        // Create socket connection
        socket.current = io(serverUrl, {
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          timeout: 20000,
        });

        // Set up core socket event handlers
        socket.current.on("connect", () => {
          console.log("Connected to multiplayer server");
          setConnected(true);
        });

        socket.current.on("connect_error", (error) => {
          console.error("Connection error:", error);
        });

        socket.current.on("disconnect", (reason) => {
          console.log(`Disconnected from server: ${reason}`);
          setConnected(false);

          if (reason === "io server disconnect") {
            // The disconnection was initiated by the server, need to reconnect manually
            socket.current.connect();
          }
        });

        // Game-specific events
        socket.current.on("init", (data) => {
          setPlayerId(data.id);
          setPlayerColor(data.color);
          setPlayerVehicle(data.vehicle || "vehicle-racer");
          
          // Update players state with initial item instead of banana count
          setPlayers(prev => ({
            ...prev,
            [data.id]: {
              id: data.id,
              color: data.color,
              vehicle: data.vehicle || "vehicle-racer",
              item: data.item || { type: 'banana', quantity: 0 },
              speed: 0
            }
          }));
          
          console.log(
            `Initialized with player ID: ${data.id}, color:`,
            data.color,
            "vehicle:",
            data.vehicle || "vehicle-racer",
            "item:",
            data.item
          );
        });

        socket.current.on("worldJoined", (data) => {
          console.log("[CONTEXT] World joined event received");
          console.log("[CONTEXT] Socket connection state:", socket.current?.connected);
          
          // Initialize with player data
          setPlayerId(prev => prev || data.id);
          
          // Initialize existing players
          const initialPlayers = {};
          data.players.forEach(player => {
            // Ensure required properties exist
            initialPlayers[player.id] = {
              ...player,
              speed: typeof player.speed === "undefined" ? 0 : player.speed,
              color: player.color || { h: 0, s: 0.8, l: 0.5 },
              vehicle: player.vehicle || "vehicle-racer",
              item: player.item || { type: 'banana', quantity: 0 }
            };
          });
          
          // Add our own player if not already included
          if (playerId && !initialPlayers[playerId]) {
            initialPlayers[playerId] = {
              id: playerId,
              color: playerColor,
              vehicle: playerVehicle,
              item: { type: 'banana', quantity: 0 }, // Use default item
              speed: 0
            };
          }

          setPlayers(initialPlayers);

          // Initialize existing bananas
          if (data.bananas && data.bananas.length > 0) {
            setBananas(data.bananas);
          }
          
          // Initialize existing item boxes
          if (data.itemBoxes && data.itemBoxes.length > 0) {
            console.log("[CONTEXT] Received item boxes:", data.itemBoxes.length);
            setItemBoxes(data.itemBoxes);
          }
        });

        socket.current.on("playerJoined", (data) => {
          const newPlayer = data.player;
          console.log(`Player joined: ${newPlayer.id} at position:`, newPlayer.position);
          
          // Ensure required properties exist
          const player = {
            ...newPlayer,
            speed: typeof newPlayer.speed === "undefined" ? 0 : newPlayer.speed,
            color: newPlayer.color || { h: 0, s: 0.8, l: 0.5 },
            vehicle: newPlayer.vehicle || "vehicle-racer",
            item: newPlayer.item || { type: 'banana', quantity: 0 }
          };
          
          setPlayers(prev => ({
            ...prev,
            [player.id]: player
          }));
        });

        socket.current.on("playerLeft", (data) => {
          const leftPlayerId = data.id;
          console.log(`Player left: ${leftPlayerId}`);
          
          setPlayers(prev => {
            const newPlayers = { ...prev };
            delete newPlayers[leftPlayerId];
            return newPlayers;
          });
        });

        socket.current.on("playerUpdate", (data) => {
          const updatedPlayerId = data.id;

          if (updatedPlayerId !== playerId) {
            setPlayers(prev => {
              if (!prev[updatedPlayerId]) return prev;
              
              return {
                ...prev,
                [updatedPlayerId]: {
                  ...prev[updatedPlayerId],
                  position: data.position,
                  rotation: data.rotation,
                  speed: data.speed || 0,
                  color: data.color || prev[updatedPlayerId].color,
                  vehicle: data.vehicle || prev[updatedPlayerId].vehicle
                }
              };
            });
          }
        });

        // Banana events
        socket.current.on("bananaDropped", (banana) => {
          console.log(`New banana dropped by player ${banana.droppedBy} at position:`, banana.position);
          setBananas(prev => [...prev, banana]);
        });

        socket.current.on("bananaExpired", (data) => {
          console.log(`Banana ${data.id} expired`);
          setBananas(prev => prev.filter(b => b.id !== data.id));
        });

        socket.current.on("bananaHit", (data) => {
          console.log(`Banana ${data.id} was hit by player ${data.hitBy}`);
          setBananas(prev => prev.filter(b => b.id !== data.id));
        });

        // Boost event
        socket.current.on("playerBoosted", (data) => {
          console.log(`[BOOST EVENT] Player ${data.playerId} activated boost`);
          console.log(`[BOOST DEBUG] Local player ID: ${playerId}`);
          console.log(`[BOOST DEBUG] playerCarRef exists: ${!!window.playerCarRef}`);
          console.log(`[BOOST DEBUG] applyBoost function exists: ${!!(window.playerCarRef && window.playerCarRef.applyBoost)}`);
          
          // Update the player's boosting state in our players object
          setPlayers(prev => {
            if (!prev[data.playerId]) return prev;
            
            return {
              ...prev,
              [data.playerId]: {
                ...prev[data.playerId],
                // Force a high speed to trigger the boost visual in RemotePlayer
                speed: Math.max(prev[data.playerId].speed, 15)
              }
            };
          });
          
          // If this is the local player, trigger the boost effect
          if (data.playerId === playerId && window.playerCarRef && window.playerCarRef.applyBoost) {
            console.log(`[BOOST EVENT] Applying boost effect to local player's car`);
            window.playerCarRef.applyBoost();
          }
        });

        // Item box events
        socket.current.on('itemCollected', (data) => {
          console.log(`Player ${data.playerId} collected item box ${data.itemBoxId}`);
          
          // Remove the collected item box
          setItemBoxes(prev => prev.filter(box => box.id !== data.itemBoxId));
          
          // Update player's item count
          setPlayers(prev => ({
            ...prev,
            [data.playerId]: {
              ...(prev[data.playerId] || {}),
              item: data.item
            }
          }));
        });
        
        socket.current.on('itemUpdated', (data) => {
          console.log(`Player ${data.playerId} item updated:`, data.item);
          
          setPlayers(prev => {
            // Make sure player exists
            const existingPlayer = prev[data.playerId] || {
              id: data.playerId,
              color: data.playerId === playerId ? playerColor : { h: 0, s: 0.8, l: 0.5 },
              vehicle: data.playerId === playerId ? playerVehicle : "vehicle-racer",
              speed: 0
            };
            
            return {
              ...prev,
              [data.playerId]: {
                ...existingPlayer,
                item: data.item
              }
            };
          });
          
          // If this is the local player, log additional info for debugging
          if (data.playerId === playerId) {
            console.log(`[LOCAL PLAYER] Item updated to:`, data.item);
          }
        });

        socket.current.on('itemBoxSpawned', ({itemBox}) => {
          console.log(`New item box spawned at position:`, itemBox.position);
          setItemBoxes(prev => [...prev, itemBox]);
        });

        // Error handling
        socket.current.on("error", (error) => {
          console.error("[CONTEXT] Connection error:", error);
        });
        
      } catch (error) {
        console.error("[CONTEXT] Connection initialization error:", error);
      }
    };

    connect();

    return () => {
      // Cleanup logic
      console.log("[CONTEXT] Provider unmounting, cleaning up connection");
      if (socket.current) {
        socket.current.disconnect();
      }
    };
  }, [serverUrl]);

  // Connection status change
  useEffect(() => {
    if (connected) {
      console.log("[CONTEXT] Successfully connected to server");
    } else {
      console.log("[CONTEXT] Disconnected from server");
    }
  }, [connected]);

  // Ensure the local player is always in the players state
  useEffect(() => {
    if (playerId) {
      setPlayers(prev => {
        if (!prev[playerId]) {
          // If local player isn't in the list, add them
          return {
            ...prev,
            [playerId]: {
              id: playerId,
              color: playerColor,
              vehicle: playerVehicle,
              item: { type: 'banana', quantity: 0 },
              speed: 0
            }
          };
        }
        return prev;
      });
    }
  }, [playerId, playerColor, playerVehicle]);

  // Player functions
  const updatePlayerPosition = (position, rotation, speed = 0) => {
    if (connected && socket.current) {
      socket.current.emit("update", {
        position,
        rotation,
        speed,
      });
    }
  };

  // Item functions
  const useItem = (carPosition, carRotation) => {
    if (!connected || !socket.current) return false;
    
    // Check if we can use an item (cooldown)
    const now = Date.now();
    if (now - lastItemUseTime < itemUseTimeout) return false;

    // Check if player has items
    if (!playerId) return false;
    
    // Make sure the player exists in the state
    const playerData = players[playerId];
    if (!playerData) {
      console.log("Player data not found in state");
      return false;
    }
    
    // Check item quantity
    if (!playerData.item || playerData.item.quantity <= 0) {
      console.log("No items available to use");
      return false;
    }

    // Update last item use time
    setLastItemUseTime(now);

    // Different handling based on item type
    if (playerData.item.type === 'boost') {
      console.log("[ITEM USE] Using boost item");
      
      // Send item use event to server - no need for position for boost items
      socket.current.emit("useItem", {
        // We still need to send position data even for boost items to satisfy the server API
        position: carPosition,
        rotation: carRotation,
        // But no need to calculate special positions for boost
      });
      
      // Apply boost locally - the server will confirm and broadcast
      if (window.playerCarRef && window.playerCarRef.applyBoost) {
        console.log("[ITEM USE] Applying boost locally");
        window.playerCarRef.applyBoost();
      } else {
        console.log("[ITEM USE] WARNING: Could not apply boost locally, playerCarRef missing or invalid");
      }
    } else {
      // This is a banana - calculate position behind the car
      const distanceBehind = 1; // 1 unit behind the car
      const offsetX = Math.sin(carRotation) * distanceBehind;
      const offsetZ = Math.cos(carRotation) * distanceBehind;

      // Position for the banana
      const bananaPosition = {
        x: carPosition.x - offsetX,
        y: 0.1, // Lower to the ground
        z: carPosition.z - offsetZ,
      };

      // Send item use event to server
      socket.current.emit("useItem", {
        position: bananaPosition,
        rotation: carRotation,
      });
    }

    // Reduce item quantity locally (server will confirm)
    setPlayers((prev) => {
      const playerData = prev[playerId];
      if (!playerData || !playerData.item) return prev;

      return {
        ...prev,
        [playerId]: {
          ...playerData,
          item: {
            ...playerData.item,
            quantity: playerData.item.quantity - 1
          }
        }
      };
    });

    console.log(`Requested item use (${playerData.item.type}) at position:`, carPosition);
    return true;
  };

  const hitBanana = (bananaId) => {
    if (!connected || !socket.current) return;
    
    console.log(`[DEBUG] Sending hitBanana event for banana ${bananaId}`);
    
    // Remove the banana locally (server will also broadcast to all clients)
    setBananas((prev) => prev.filter((b) => b.id !== bananaId));

    // Notify server about banana hit - just send the ID directly
    socket.current.emit("hitBanana", {
      bananaId
    });
  };

  // Item box functions
  const collectItemBox = (itemBoxId) => {
    if (!connected || !socket.current) return;
    
    console.log(`[CONTEXT] Attempting to collect item box: ${itemBoxId}`);
    
    // Notify server about item box collection
    socket.current.emit('collectItemBox', {
      playerId: playerId,
      itemBoxId: itemBoxId
    });
  };

  // Change server URL
  const changeServerUrl = (useLocalServer = false) => {
    const newUrl = useLocalServer ? LOCAL_SERVER_URL : REMOTE_SERVER_URL;
    
    // Only change if different
    if (newUrl !== serverUrl) {
      // Disconnect current socket
      if (socket.current) {
        socket.current.disconnect();
      }
      
      // Update state
      setServerUrl(newUrl);
      setConnected(false);
      setPlayers({});
      setBananas([]);
      setItemBoxes([]);
      
      // localStorage for persistence
      if (useLocalServer) {
        window.localStorage.setItem('useLocalServer', 'true');
      } else {
        window.localStorage.removeItem('useLocalServer');
      }
      
      console.log(`Server URL changed to: ${newUrl}`);
    }
    
    return newUrl;
  };

  // Provide context value
  const contextValue = {
    connected,
    playerId,
    players,
    bananas,
    itemBoxes,
    updatePlayerPosition,
    useItem,
    hitBanana,
    collectItemBox,
    changeServerUrl
  };

  return (
    <MultiplayerContext.Provider value={contextValue}>
      {children}
    </MultiplayerContext.Provider>
  );
};

export default MultiplayerProvider; 