import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { io } from "socket.io-client";

// Constants
const LOCAL_SERVER_URL = "http://localhost:8080";
const REMOTE_SERVER_URL = "https://banana-racer.onrender.com";

// Create the context
const MultiplayerContext = createContext({
  connected: false,
  playerId: null,
  players: {},
  bananas: [],
  cannonballs: [],
  itemBoxes: [],
  fakeCubes: [],
  updatePlayerPosition: () => {},
  useItem: () => {},
  hitBanana: () => {},
  hitCannon: () => {},
  hitFakeCube: () => {},
  collectItemBox: () => {},
});

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
  const [cannonballs, setCannonballs] = useState([]);
  const [lastItemUseTime, setLastItemUseTime] = useState(0);
  const itemUseTimeout = 20;
  const [fakeCubes, setFakeCubes] = useState([]);

  // Server URL
  const [serverUrl, setServerUrl] = useState(() => {
    if (import.meta.env.DEV) {
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
        socket.current = io(serverUrl, {
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          timeout: 20000,
        });

        // Core socket events
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
            socket.current.connect();
          }
        });

        // Game state event
        socket.current.on("gameState", (state) => {
          setPlayers(state.players);
          setBananas(Object.values(state.bananas));
          setCannonballs(Object.values(state.cannonballs));
          setFakeCubes(Object.values(state.fakeCubes));
          setItemBoxes(state.itemBoxes);
        });

        // Initial player setup
        socket.current.on("init", (data) => {
          setPlayerId(data.id);
          setPlayerColor(data.color);
          setPlayerVehicle(data.vehicle || "vehicle-racer");
        });

        // Cannon hit event (needs local handling)
        socket.current.on("cannonHit", (data) => {
          if (data.hitPlayer === playerId && window.playerCarRef?.triggerSpinOut) {
            window.playerCarRef.triggerSpinOut();
          }
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
    
    const now = Date.now();
    if (now - lastItemUseTime < itemUseTimeout) return false;

    if (!playerId) return false;
    
    const playerData = players[playerId];
    if (!playerData?.item?.quantity) return false;

    setLastItemUseTime(now);

    // Calculate position based on item type
    const distanceBehind = 1;
    const offsetX = Math.sin(carRotation) * distanceBehind;
    const offsetZ = Math.cos(carRotation) * distanceBehind;

    const itemPosition = {
      x: carPosition.x - offsetX,
      y: 0.1,
      z: carPosition.z - offsetZ,
    };

    socket.current.emit("useItem", {
      position: itemPosition,
      rotation: carRotation,
    });

    return true;
  };

  const hitBanana = (bananaId) => {
    if (!connected || !socket.current) return;
    socket.current.emit("hitBanana", { bananaId });
  };

  const collectItemBox = (itemBoxId) => {
    if (!connected || !socket.current) return;
    socket.current.emit('collectItemBox', {
      playerId: playerId,
      itemBoxId: itemBoxId
    });
  };

  const hitCannon = (cannonId) => {
    if (!connected || !socket.current) return;
    socket.current.emit("hitCannon", { cannonId });
  };

  const hitFakeCube = (fakeCubeId) => {
    if (!connected || !socket.current) return;
    socket.current.emit("hitFakeCube", { fakeCubeId });
  };

  // Change server URL
  const changeServerUrl = (useLocalServer = false) => {
    const newUrl = useLocalServer ? LOCAL_SERVER_URL : REMOTE_SERVER_URL;
    
    if (newUrl !== serverUrl) {
      if (socket.current) {
        socket.current.disconnect();
      }
      
      setServerUrl(newUrl);
      setConnected(false);
      
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
    cannonballs,
    itemBoxes,
    fakeCubes,
    updatePlayerPosition,
    useItem,
    hitBanana,
    hitCannon,
    hitFakeCube,
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