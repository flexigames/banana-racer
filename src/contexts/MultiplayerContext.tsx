import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { io, Socket } from "socket.io-client";
import * as THREE from 'three';
import { Position, Player, BananaData, ItemBoxData, ItemData, MultiplayerContextType } from '../types';

// Constants
const LOCAL_SERVER_URL = "http://localhost:8080";
const REMOTE_SERVER_URL = "https://banana-racer.onrender.com";

// Create the context
const MultiplayerContext = createContext<MultiplayerContextType | null>(null);

// Custom hook to use the context
export const useMultiplayer = (): MultiplayerContextType => {
  const context = useContext(MultiplayerContext);
  if (!context) {
    throw new Error('useMultiplayer must be used within a MultiplayerProvider');
  }
  return context;
};

interface MultiplayerProviderProps {
  children: ReactNode;
}

interface ServerInitData {
  id: string;
  color: string;
  vehicle: string;
  item?: ItemData;
}

interface PlayerPositionUpdate {
  id: string;
  position: Position;
  rotation: number;
  speed: number;
}

interface BananaUpdate {
  id: string;
  position: Position;
  rotation: number;
  playerId: string;
}

interface ItemBoxUpdate {
  id: string;
  position: [number, number, number];
}

interface PlayerItemUpdate {
  id: string;
  item: ItemData;
}

// Provider component
const MultiplayerProvider: React.FC<MultiplayerProviderProps> = ({ children }) => {
  // Socket connection
  const socket = useRef<Socket | null>(null);
  
  // State
  const [connected, setConnected] = useState<boolean>(false);
  const [playerId, setPlayerId] = useState<string>('');
  const [playerColor, setPlayerColor] = useState<string>('');
  const [playerVehicle, setPlayerVehicle] = useState<string>("vehicle-racer");
  const [players, setPlayers] = useState<Record<string, Player>>({});
  const [bananas, setBananas] = useState<BananaData[]>([]);
  const [itemBoxes, setItemBoxes] = useState<ItemBoxData[]>([]);
  const [lastItemUseTime, setLastItemUseTime] = useState<number>(0);
  const itemUseTimeout = 20;

  // Server URL
  const [serverUrl, setServerUrl] = useState<string>(() => {
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

          if (reason === "io server disconnect" && socket.current) {
            // The disconnection was initiated by the server, need to reconnect manually
            socket.current.connect();
          }
        });

        // Game-specific events
        socket.current.on("init", (data: ServerInitData) => {
          setPlayerId(data.id);
          setPlayerColor(data.color);
          setPlayerVehicle(data.vehicle || "vehicle-racer");
          
          // Parse the color to HSL values
          const colorObj = parseHexColor(data.color);
          
          // Update players state with initial item instead of banana count
          setPlayers(prev => ({
            ...prev,
            [data.id]: {
              id: data.id,
              color: colorObj,
              vehicle: data.vehicle || "vehicle-racer",
              position: { x: 0, y: 0, z: 0 },
              rotation: 0,
              speed: 0,
              item: data.item || { type: 'banana', quantity: 0 }
            }
          }));
          
          console.log(`[CONTEXT] Initialized with ID: ${data.id}, Color: ${data.color}, Vehicle: ${data.vehicle || "vehicle-racer"}`);
        });

        socket.current.on("players", (data: Record<string, Player>) => {
          console.log("[CONTEXT] Received players update:", Object.keys(data).length);
          setPlayers(data);
        });

        socket.current.on("bananas", (data: BananaData[]) => {
          console.log("[CONTEXT] Received bananas update:", data.length, "bananas");
          setBananas(data);
        });

        socket.current.on("itemBoxes", (data: ItemBoxData[]) => {
          console.log("[CONTEXT] Received item boxes update:", data.length, "boxes");
          setItemBoxes(data);
        });

        socket.current.on("playerUpdate", (data: PlayerPositionUpdate) => {
          // Update a single player's state
          setPlayers(prev => {
            // If the player doesn't exist, ignore the update
            if (!prev[data.id]) return prev;
            
            // Otherwise, update the player
            return {
              ...prev,
              [data.id]: {
                ...prev[data.id],
                position: data.position,
                rotation: data.rotation,
                speed: data.speed
              }
            };
          });
        });

        socket.current.on("playerLeft", (playerId: string) => {
          console.log(`[CONTEXT] Player left: ${playerId}`);
          
          // Remove the player
          setPlayers(prev => {
            const newPlayers = { ...prev };
            delete newPlayers[playerId];
            return newPlayers;
          });
        });

        socket.current.on("playerItem", (data: PlayerItemUpdate) => {
          console.log(`[CONTEXT] Player ${data.id} item update:`, data.item);
          
          setPlayers(prev => {
            // If the player doesn't exist, ignore the update
            if (!prev[data.id]) return prev;
            
            // Update the player's item
            return {
              ...prev,
              [data.id]: {
                ...prev[data.id],
                item: data.item
              }
            };
          });
        });

        socket.current.on("bananaUpdate", (data: BananaUpdate) => {
          console.log(`[CONTEXT] Banana update:`, data);
          
          // Add the new banana to the list
          setBananas(prev => [
            ...prev,
            {
              id: data.id,
              position: data.position,
              rotation: data.rotation,
              playerId: data.playerId
            }
          ]);
        });

        socket.current.on("bananaRemove", (bananaId: string) => {
          console.log(`[CONTEXT] Banana removed: ${bananaId}`);
          
          // Remove the banana with the given ID
          setBananas(prev => prev.filter(banana => banana.id !== bananaId));
        });

        socket.current.on("itemBoxUpdate", (data: ItemBoxUpdate) => {
          console.log(`[CONTEXT] Item box update:`, data);
          
          // Add the new item box to the list
          setItemBoxes(prev => [
            ...prev,
            {
              id: data.id,
              position: data.position
            }
          ]);
        });

        socket.current.on("itemBoxRemove", (itemBoxId: string) => {
          console.log(`[CONTEXT] Item box removed: ${itemBoxId}`);
          
          // Remove the item box with the given ID
          setItemBoxes(prev => prev.filter(box => box.id !== itemBoxId));
        });
        
        socket.current.on("boostPlayer", (playerId: string) => {
          console.log(`[CONTEXT] Boost player: ${playerId}`);
          
          // If this is the current player, apply boost
          if (playerId === playerId && (window as any).playerCarRef?.applyBoost) {
            console.log('[CONTEXT] Applying boost to local player car');
            (window as any).playerCarRef.applyBoost();
          }
        });

      } catch (error) {
        console.error("Failed to connect to server:", error);
      }
    };

    // Attempt connection
    connect();

    // Cleanup on unmount
    return () => {
      if (socket.current) {
        console.log("[CONTEXT] Disconnecting from server");
        socket.current.disconnect();
      }
    };
  }, [serverUrl]); // Only reconnect if the server URL changes

  /**
   * Update the player's position on the server
   */
  const updatePlayerPosition = (position: Position, rotation: number, speed: number = 0) => {
    if (socket.current && socket.current.connected && playerId) {
      socket.current.emit("updatePosition", {
        position,
        rotation,
        speed
      });
    }
  };

  /**
   * Use the current item
   */
  const useItem = () => {
    if (!socket.current || !connected) return null;
    
    // Check if we have a cooldown
    const now = Date.now();
    if (now - lastItemUseTime < itemUseTimeout * 1000) {
      return null;
    }
    
    setLastItemUseTime(now);
    socket.current.emit("useItem");
    
    // Return the player's current item before use for UI feedback
    const player = players[playerId];
    return player?.item || null;
  };

  /**
   * Handle hitting a banana
   */
  const hitBanana = (bananaId: string) => {
    console.log(`[CONTEXT] Hit banana: ${bananaId}`);
    
    if (socket.current && socket.current.connected) {
      socket.current.emit("hitBanana", { bananaId });
    }
  };

  /**
   * Handle collecting an item box
   */
  const collectItemBox = (itemBoxId: string) => {
    console.log(`[CONTEXT] Collected item box: ${itemBoxId}`);
    
    if (socket.current && socket.current.connected) {
      socket.current.emit("collectItemBox", { itemBoxId });
    }
  };

  /**
   * Change the server URL
   */
  const changeServerUrl = (useLocalServer: boolean = false): void => {
    const newUrl = useLocalServer ? LOCAL_SERVER_URL : REMOTE_SERVER_URL;
    console.log(`[CONTEXT] Changing server URL to: ${newUrl}`);
    
    // Store in localStorage for persistence
    window.localStorage.setItem('useLocalServer', useLocalServer ? 'true' : 'false');
    
    // Update the URL (this will trigger a reconnect via the useEffect)
    setServerUrl(newUrl);
  };

  // Function to send position update
  const updatePosition = (
    position: { x: number, y: number, z: number } | [number, number, number], 
    rotation: number, 
    speed: number
  ) => {
    if (socket.current && connected) {
      let pos: Position;
      
      // Convert array to object if needed
      if (Array.isArray(position)) {
        pos = { x: position[0], y: position[1], z: position[2] };
      } else {
        pos = position;
      }
      
      socket.current.emit("updatePosition", {
        position: pos,
        rotation,
        speed
      });
    }
  };
  
  // Return the context provider
  return (
    <MultiplayerContext.Provider
      value={{
        connected,
        playerId,
        players,
        bananas,
        itemBoxes,
        updatePlayerPosition,
        updatePosition,
        useItem,
        hitBanana,
        collectItemBox
      }}
    >
      {children}
    </MultiplayerContext.Provider>
  );
};

// Helper function to parse hex color to HSL object
const parseHexColor = (hex: string): { h: number, s: number, l: number } => {
  // Default values if parsing fails
  const defaultColor = { h: 0.3, s: 0.8, l: 0.5 };
  
  try {
    // Remove # if present
    hex = hex.replace('#', '');
    
    // Parse hex to rgb
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;
    
    // Find min and max RGB components
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    
    // Calculate lightness
    const l = (max + min) / 2;
    
    let h = 0;
    let s = 0;
    
    if (max !== min) {
      // Calculate saturation
      s = l > 0.5 ? (max - min) / (2 - max - min) : (max - min) / (max + min);
      
      // Calculate hue
      if (max === r) {
        h = (g - b) / (max - min) + (g < b ? 6 : 0);
      } else if (max === g) {
        h = (b - r) / (max - min) + 2;
      } else {
        h = (r - g) / (max - min) + 4;
      }
      h /= 6;
    }
    
    return { h, s, l };
  } catch (e) {
    console.error("Error parsing hex color:", e);
    return defaultColor;
  }
};

export default MultiplayerProvider; 