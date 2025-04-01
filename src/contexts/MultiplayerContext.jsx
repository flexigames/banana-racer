import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { io } from "socket.io-client";
import { getUserName } from "../lib/username";
import { hexToHsl } from "../lib/color";

const LOCAL_SERVER_URL = "http://localhost:8080";
const REMOTE_SERVER_URL = "https://bananaracer.alexandfinn.com";

// Create the context
const MultiplayerContext = createContext({
  connected: false,
  playerId: null,
  players: {},
  bananas: [],
  itemBoxes: [],
  fakeCubes: [],
  greenShells: [],
  redShells: [],
  updatePlayerPosition: () => {},
  useItem: () => {},
  respawn: () => {},
  changeName: () => {},
  changeColor: () => {},
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
  const [playerId, setPlayerId] = useState(getPlayerId);
  const [playerColor, setPlayerColor] = useState(getPlayerColor);
  const [playerName, setPlayerName] = useState(getUserName);

  const [players, setPlayers] = useState({});
  const [bananas, setBananas] = useState([]);
  const [fakeCubes, setFakeCubes] = useState([]);
  const [greenShells, setGreenShells] = useState([]);
  const [redShells, setRedShells] = useState([]);
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
      const params = new URLSearchParams(window.location.search);
      try {
        socket.current = io(serverUrl, {
          auth: {
            name: playerName,
            id: playerId,
            color: playerColor,
            portalRef: params.get("ref"),
          },
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
          setRedShells(Object.values(state.redShells));
          setItemBoxes(state.itemBoxes);
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
  }, [serverUrl, playerName]);

  // Connection status change
  useEffect(() => {
    if (connected) {
      console.log("[CONTEXT] Successfully connected to server");
    } else {
      console.log("[CONTEXT] Disconnected from server");
    }
  }, [connected]);

  // Player functions
  const updatePlayerPosition = useCallback(
    (position, rotation, speed = 0) => {
      if (connected && socket.current) {
        socket.current.emit("update", {
          position,
          rotation,
          speed,
        });
      }
    },
    [connected]
  );

  // Item functions
  const useItem = useCallback(
    (carPosition, carRotation) => {
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
    },
    [connected, lastItemUseTime, playerId, players]
  );

  // Respawn function
  const respawn = useCallback(() => {
    if (connected && socket.current) {
      socket.current.emit("respawn");
    }
  }, [connected]);

  const changeName = useCallback(
    (newName) => {
      if (!connected || !socket.current || !newName) return;
      console.log("[CONTEXT] Changing name to", newName);
      localStorage.setItem("playerName", newName);
      setPlayerName(newName);
      socket.current.emit("changeName", newName);
    },
    [connected]
  );

  const changeColor = useCallback(
    (newColor) => {
      console.log("[CONTEXT] Changing color to", newColor);
      if (!connected || !socket.current || !newColor) return;
      socket.current.emit("changeColor", newColor);
    },
    [connected]
  );

  // Change server URL
  const changeServerUrl = useCallback(
    (useLocalServer = false) => {
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
    },
    [serverUrl]
  );

  // Provide context value
  const contextValue = {
    connected,
    playerId,
    playerColor,
    playerName,
    players,
    bananas,
    itemBoxes,
    fakeCubes,
    greenShells,
    redShells,
    updatePlayerPosition,
    useItem,
    respawn,
    changeServerUrl,
    changeName,
    changeColor,
  };

  return (
    <MultiplayerContext.Provider value={contextValue}>
      {children}
    </MultiplayerContext.Provider>
  );
};

export default MultiplayerProvider;

function getPlayerColor() {
  const params = new URLSearchParams(window.location.search);
  const colorParam = params.get("color");
  if (colorParam) {
    const hslColor = hexToHsl(colorParam);
    localStorage.setItem("playerColor", JSON.stringify(hslColor));
    return hslColor;
  }

  const colorLocal = localStorage.getItem("playerColor");
  if (colorLocal) {
    return JSON.parse(colorLocal);
  }

  const color = {
    h: Math.random(),
    s: 0.65,
    l: 0.55,
  };
  localStorage.setItem("playerColor", JSON.stringify(color));
  return color;
}

function getPlayerId() {
  const playerId = localStorage.getItem("playerId");
  if (playerId) {
    return playerId;
  }

  const randomId = crypto.randomUUID();
  localStorage.setItem("playerId", randomId);
  return randomId;
}
