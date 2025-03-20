import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import multiplayerManager from '../lib/multiplayer';

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
  const [connected, setConnected] = useState(false);
  const [playerId, setPlayerId] = useState(null);
  const [players, setPlayers] = useState({});
  const [bananas, setBananas] = useState([]);
  const [itemBoxes, setItemBoxes] = useState([]);
  const [lastBananaTime, setLastBananaTime] = useState(0);
  const bananaTimeout = 2000; // 2 seconds cooldown between bananas

  // Connect to multiplayer server
  useEffect(() => {
    console.log("[CONTEXT] Initializing connection...");

    const initConnection = async () => {
      try {
        // Set up event handlers
        multiplayerMan  ager.onPlayerJoined = (player) => {
          setPlayers((prev) => ({
            ...prev,
            [player.id]: player,
          }));
        };

        multiplayerManager.onPlayerLeft = (player) => {
          setPlayers((prev) => {
            const newPlayers = { ...prev };
            delete newPlayers[player.id];
            return newPlayers;
          });
        };

        multiplayerManager.onPlayerUpdated = (player) => {
          setPlayers((prev) => ({
            ...prev,
            [player.id]: player,
          }));
        };

        // Set up banana event handlers
        multiplayerManager.onBananaDropped = (banana) => {
          console.log("Banana dropped event received", banana);
          setBananas((prev) => [...prev, banana]);
        };

        multiplayerManager.onBananaExpired = (bananaId) => {
          console.log("Banana expired event received", bananaId);
          setBananas((prev) => prev.filter((b) => b.id !== bananaId));
        };

        multiplayerManager.onBananaHit = (bananaId, hitByPlayerId) => {
          console.log(`Banana hit event received: ${bananaId} hit by ${hitByPlayerId}`);
          setBananas((prev) => prev.filter((b) => b.id !== bananaId));
        };

        // Add handler for item box spawning
        multiplayerManager.onItemBoxSpawned = (itemBox) => {
          setItemBoxes((prev) => [...prev, itemBox]);
        };

        // Add handler for item collection
        multiplayerManager.onItemCollected = (playerId, itemBoxId) => {
          console.log(`Player ${playerId} collected item box ${itemBoxId}`);

          // Remove the collected item box
          setItemBoxes((prev) => prev.filter((box) => box.id !== itemBoxId));

          // Update player's banana count
          setPlayers((prev) => ({
            ...prev,
            [playerId]: {
              ...(prev[playerId] || {}),
              bananas: (prev[playerId]?.bananas || 0) + 1,
            },
          }));
        };

        multiplayerManager.onBananaCountUpdated = (playerId, count) => {
          console.log(`Player ${playerId} banana count updated to ${count}`);
          setPlayers((prev) => ({
            ...prev,
            [playerId]: {
              ...(prev[playerId] || {}),
              bananas: count,
            },
          }));
        };

        multiplayerManager.onWorldJoined = (data) => {
          console.log("[CONTEXT] World joined event received");

          // Initialize with logged-in player data
          setPlayerId(multiplayerManager.playerId);
          
          // Initialize existing players
          const initialPlayers = {};
          data.players.forEach(player => {
            initialPlayers[player.id] = player;
          });
          
          // Add our own player if not included
          if (multiplayerManager.playerId && !initialPlayers[multiplayerManager.playerId]) {
            initialPlayers[multiplayerManager.playerId] = {
              id: multiplayerManager.playerId,
              color: multiplayerManager.playerColor,
              vehicle: multiplayerManager.playerVehicle,
              bananas: 0
            };
          }
          
          setPlayers(initialPlayers);

          // Set initial bananas and item boxes from server
          if (data.bananas && data.bananas.length > 0) {
            setBananas(data.bananas);
          }
          
          if (data.itemBoxes && data.itemBoxes.length > 0) {
            console.log("[CONTEXT] Received item boxes:", data.itemBoxes.length);
            setItemBoxes(data.itemBoxes);
          }
        };

        await multiplayerManager.connect();
        setConnected(true);
        setPlayerId(multiplayerManager.playerId);
        
        // Initialize player state with the current player
        setPlayers(prev => ({
          ...prev,
          [multiplayerManager.playerId]: {
            id: multiplayerManager.playerId,
            color: multiplayerManager.playerColor,
            vehicle: multiplayerManager.playerVehicle,
            bananas: 0
          }
        }));
        
      } catch (error) {
        console.error("[CONTEXT] Connection initialization error:", error);
      }
    };

    initConnection();

    return () => {
      // Cleanup logic
      console.log("[CONTEXT] Provider unmounting, cleaning up connection");
      multiplayerManager.disconnect();
    };
  }, []);

  // Drop banana function
  const dropBanana = (carPosition, carRotation) => {
    // Check if we can drop a banana (cooldown and inventory)
    const now = Date.now();
    if (now - lastBananaTime < bananaTimeout) return false;

    // Check if player has bananas
    if (!players[multiplayerManager.playerId] || players[multiplayerManager.playerId].bananas <= 0) {
      console.log("No bananas available to drop");
      return false;
    }

    // Update last banana time
    setLastBananaTime(now);

    // Calculate position behind the car
    const distanceBehind = 1; // 1 unit behind the car
    const offsetX = Math.sin(carRotation) * distanceBehind;
    const offsetZ = Math.cos(carRotation) * distanceBehind;

    // Position for the banana
    const bananaPosition = {
      x: carPosition.x - offsetX,
      y: 0.1, // Lower to the ground
      z: carPosition.z - offsetZ,
    };

    // Send banana drop event to server via multiplayer manager
    multiplayerManager.dropBanana(bananaPosition, carRotation);

    // Reduce banana count locally (server will confirm)
    setPlayers((prev) => ({
      ...prev,
      [multiplayerManager.playerId]: {
        ...prev[multiplayerManager.playerId],
        bananas: prev[multiplayerManager.playerId].bananas - 1,
      },
    }));

    console.log("Requested banana drop at", bananaPosition);
    return true;
  };

  // Handle banana collision
  const hitBanana = (bananaId) => {
    // Remove the banana locally (server will also broadcast to all clients)
    setBananas((prev) => prev.filter((b) => b.id !== bananaId));

    // Notify server about banana hit
    multiplayerManager.hitBanana(bananaId);
  };

  // Handle item box collection
  const collectItemBox = (itemBoxId) => {
    console.log(`[CONTEXT] Attempting to collect item box: ${itemBoxId}`);
    
    // Only notify server about item box collection
    multiplayerManager.collectItemBox(itemBoxId);
  };

  // Update player position
  const updatePlayerPosition = (position, rotation, speed = 0) => {
    if (connected) {
      multiplayerManager.updatePosition(position, rotation, speed);
    }
  };

  return (
    <MultiplayerContext.Provider
      value={{
        connected,
        playerId,
        players,
        bananas,
        itemBoxes,
        updatePlayerPosition,
        dropBanana,
        hitBanana,
        collectItemBox,
      }}
    >
      {children}
    </MultiplayerContext.Provider>
  );
};

export default MultiplayerProvider; 