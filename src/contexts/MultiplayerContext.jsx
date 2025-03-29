import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
} from "react";
import { io } from "socket.io-client";

const LOCAL_SERVER_URL = "http://localhost:8080";
const REMOTE_SERVER_URL = "https://api.wundertest.ai/multiplayer";

// Create the context
const MultiplayerContext = createContext({
  connected: false,
  playerId: null,
  players: {},
  bananas: [],
  itemBoxes: [],
  fakeCubes: [],
  greenShells: [],
  updatePlayerPosition: () => {},
  useItem: () => {},
  respawn: () => {},
});

// Custom hook to use the context
export const useMultiplayer = () => {
  const context = useContext(MultiplayerContext);
  if (!context) {
    throw new Error("useMultiplayer must be used within a MultiplayerProvider");
  }
  return context;
};

// Provider component
export const MultiplayerProvider = ({ children }) => {
  const [connected, setConnected] = useState(false);
  const [playerId, setPlayerId] = useState(null);
  const [playerColor, setPlayerColor] = useState(null);
  const [players, setPlayers] = useState({});
  const [bananas, setBananas] = useState([]);
  const [fakeCubes, setFakeCubes] = useState([]);
  const [greenShells, setGreenShells] = useState([]);
  const [itemBoxes, setItemBoxes] = useState([]);
  const [lastItemUseTime, setLastItemUseTime] = useState(0);
  const itemUseTimeout = 300; // ms
  const socket = useRef(null);

  // Server URL
  const [serverUrl, setServerUrl] = useState(() => {
    if (import.meta.env.DEV) {
      const useLocalServer =
        import.meta.env.VITE_USE_LOCAL_SERVER === "true" ||
        window.localStorage.getItem("useLocalServer") === "true";
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
          path: "/multiplayer/socket.io/",
        });

        socket.current.on("connect", () => {
          setConnected(true);
        });

        socket.current.on("disconnect", () => {
          setConnected(false);
        });

        socket.current.on("gameState", (state) => {
          setPlayers(state.players);
          setBananas(Object.values(state.bananas));
          setFakeCubes(Object.values(state.fakeCubes));
          setGreenShells(Object.values(state.greenShells));
          setItemBoxes(state.itemBoxes);
          window.gameState = state;
        });

        socket.current.on("init", (data) => {
          setPlayerId(data.id);
          setPlayerColor(data.color);
        });

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
    if (!playerData) return false;

    // Allow using item if we have either a trailing item or an item in slot
    if (!playerData.trailingItem && !playerData.item?.quantity) return false;

    setLastItemUseTime(now);

    const itemPosition = {
      x: carPosition.x,
      y: 0.1,
      z: carPosition.z,
    };

    socket.current.emit("useItem", {
      position: itemPosition,
      rotation: carRotation,
    });

    return true;
  };

  // Respawn function
  const respawn = () => {
    if (connected && socket.current) {
      socket.current.emit("respawn");
    }
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
        window.localStorage.setItem("useLocalServer", "true");
      } else {
        window.localStorage.removeItem("useLocalServer");
      }

      console.log(`Server URL changed to: ${newUrl}`);
    }

    return newUrl;
  };

  // Provide context value
  const contextValue = {
    connected,
    playerId,
    playerColor,
    players,
    bananas,
    itemBoxes,
    fakeCubes,
    greenShells,
    updatePlayerPosition,
    useItem,
    respawn,
    changeServerUrl,
  };

  return (
    <MultiplayerContext.Provider value={contextValue}>
      {children}
    </MultiplayerContext.Provider>
  );
};

export default MultiplayerProvider;
