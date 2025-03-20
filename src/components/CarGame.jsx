import React, { useRef, useEffect, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { PerspectiveCamera, Grid } from "@react-three/drei";
import Car from "./Car";
import RemotePlayer from "./RemotePlayer";
import Banana from "./Banana";
import multiplayerManager from "../lib/multiplayer";
import * as THREE from "three";
import ScatteredElements from "./ScatteredElements";
import ItemBox from "./ItemBox";

// Camera component that follows the player
const FollowCamera = ({ target }) => {
  const cameraRef = useRef();
  const position = useRef(new THREE.Vector3(0, 3.5, 5));
  const targetPosition = useRef(new THREE.Vector3(0, 0, 0));
  const lastValidPosition = useRef(new THREE.Vector3(0, 3.5, 5));

  useFrame(() => {
    if (!cameraRef.current || !target.current) return;

    // Check if car is spinning out - don't move camera if it is
    const isSpinningOut = target.current.isSpinningOut?.();

    if (!isSpinningOut) {
      // Only update camera position if the car is not spinning out

      // Update target position from the car
      targetPosition.current.set(
        target.current.position.x,
        target.current.position.y,
        target.current.position.z
      );

      // Calculate camera position: behind and above the car
      // Get car's forward direction (negative Z axis rotated by car's Y rotation)
      const carRotation = target.current.rotation.y;
      const distance = 4;
      const height = 2;

      // Calculate position behind the car based on its rotation
      const offsetX = Math.sin(carRotation) * distance;
      const offsetZ = Math.cos(carRotation) * distance;

      // Position camera behind and above the car
      position.current.set(
        targetPosition.current.x - offsetX,
        targetPosition.current.y + height,
        targetPosition.current.z - offsetZ
      );

      // Update camera position with smooth interpolation
      cameraRef.current.position.lerp(position.current, 0.15);

      // Store the last valid camera position (before any spinout)
      lastValidPosition.current.copy(cameraRef.current.position);
    }

    // Always make the camera look at the car, even during spinout
    const lookTarget = new THREE.Vector3(
      target.current.position.x,
      target.current.position.y + 0.3, // Look slightly above the car
      target.current.position.z
    );
    cameraRef.current.lookAt(lookTarget);
  });

  return (
    <PerspectiveCamera
      ref={cameraRef}
      makeDefault
      position={[0, 3.5, 5]}
      fov={65}
    />
  );
};

// Component to handle collision detection and game logic
const GameLogic = ({ carRef, bananas, onBananaHit }) => {
  const COLLISION_THRESHOLD = 0.8; // Distance for collision detection

  // Check for collisions each frame
  useFrame(() => {
    if (!carRef.current || carRef.current.isSpinningOut?.()) return;

    const carPosition = new THREE.Vector3(
      carRef.current.position.x,
      carRef.current.position.y,
      carRef.current.position.z
    );

    // Check collision with each banana
    bananas.forEach((banana) => {
      const bananaPosition = new THREE.Vector3(
        banana.position.x,
        banana.position.y,
        banana.position.z
      );

      const distance = carPosition.distanceTo(bananaPosition);

      // If close enough to banana, trigger collision
      if (distance < COLLISION_THRESHOLD) {
        console.log(
          `Collision detected with banana ${
            banana.id
          } at distance ${distance.toFixed(2)}`
        );
        onBananaHit(banana.id);
      }
    });
  });

  return null; // This component doesn't render anything
};

const CarGame = () => {
  const carRef = useRef();
  const [remotePlayers, setRemotePlayers] = useState({});
  const [connected, setConnected] = useState(false);
  const [bananas, setBananas] = useState([]);
  const [lastBananaTime, setLastBananaTime] = useState(0);
  const bananaTimeout = 2000; // 2 seconds cooldown between bananas
  const [itemBoxes, setItemBoxes] = useState([]);
  const [playerId, setPlayerId] = useState(null);
  const [players, setPlayers] = useState({});

  // Add a ref to track if this is the initial mount
  const isInitialMount = useRef(true);

  // Handle key press events
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Space bar to drop banana
      if (event.code === "Space") {
        dropBanana();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Modify the dropBanana function to check banana inventory
  const dropBanana = () => {
    if (!carRef.current) return;

    // Check if we can drop a banana (cooldown and inventory)
    const now = Date.now();
    if (now - lastBananaTime < bananaTimeout) return;

    // Check if player has bananas
    if (
      !players[multiplayerManager.playerId] ||
      players[multiplayerManager.playerId].bananas <= 0
    ) {
      console.log("No bananas available to drop");
      return;
    }

    // Update last banana time
    setLastBananaTime(now);

    // Get car position and rotation
    const carPosition = carRef.current.position.clone();
    const carRotation = carRef.current.rotation.y;

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
  };

  // Handle banana collision
  const handleBananaHit = (bananaId) => {
    // Trigger car spinout
    if (carRef.current && carRef.current.triggerSpinOut) {
      carRef.current.triggerSpinOut();
    }

    // Remove the banana locally (server will also broadcast to all clients)
    setBananas((prev) => prev.filter((b) => b.id !== bananaId));

    // Notify server about banana hit
    multiplayerManager.hitBanana(bananaId);
  };

  // Handle item box collection
  const handleItemCollect = (playerId) => {
    console.log(
      `[CLIENT] Attempting to collect item box with player ID: ${playerId}`
    );

    // Make sure we're passing the correct player ID
    const playerIdToSend = multiplayerManager.playerId;

    // Only notify server about item box collection
    multiplayerManager.collectItemBox(playerIdToSend);

    // The server will handle updating the state and broadcasting to all clients
  };

  // Connect to multiplayer server
  useEffect(() => {
    console.log("[CLIENT] Component mounted, initializing connection...");

    // Initialize connection logic
    const initConnection = async () => {
      try {
        // Your existing connection code
        console.log("[CLIENT] Connection initialization started");

        setPlayerId(multiplayerManager.playerId);

        // Initialize player state with the current player
        setPlayers({
          [multiplayerManager.playerId]: {
            bananas: 0,
          },
        });

        // Set up event handlers
        multiplayerManager.onPlayerJoined = (player) => {
          setRemotePlayers((prev) => ({
            ...prev,
            [player.id]: player,
          }));
        };

        multiplayerManager.onPlayerLeft = (player) => {
          setRemotePlayers((prev) => {
            const newPlayers = { ...prev };
            delete newPlayers[player.id];
            return newPlayers;
          });
        };

        multiplayerManager.onPlayerUpdated = (player) => {
          setRemotePlayers((prev) => ({
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
          console.log(
            `Banana hit event received: ${bananaId} hit by ${hitByPlayerId}`
          );
          setBananas((prev) => prev.filter((b) => b.id !== bananaId));

          // If the current player didn't trigger this hit, play a sound or show visual indicator
          if (hitByPlayerId !== multiplayerManager.playerId) {
            console.log(`Player ${hitByPlayerId} hit a banana`);
            // Optional: Play sound or show notification
          }
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

          // If another player collected the item, update their state
          if (playerId !== multiplayerManager.playerId) {
            setPlayers((prev) => ({
              ...prev,
              [playerId]: {
                ...(prev[playerId] || {}),
                bananas: (prev[playerId]?.bananas || 0) + 1,
              },
            }));
          } else {
            // Update our own banana count
            setPlayers((prev) => ({
              ...prev,
              [playerId]: {
                ...(prev[playerId] || {}),
                bananas: (prev[playerId]?.bananas || 0) + 1,
              },
            }));
          }
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
          console.log("[CLIENT] World joined event received in CarGame");

          // Set initial item boxes from server
          if (data.itemBoxes && data.itemBoxes.length > 0) {
            console.log("[CLIENT] Received item boxes:", data.itemBoxes.length);
            setItemBoxes(data.itemBoxes);
          } else {
            console.log("[CLIENT] No item boxes received from server");
          }
        };

        await multiplayerManager.connect();
        setConnected(true);
      } catch (error) {
        console.error("[CLIENT] Connection initialization error:", error);
      }
    };

    initConnection();

    return () => {
      // Cleanup logic
      console.log("[CLIENT] Component unmounting, cleaning up connection");
      multiplayerManager.disconnect();
    };
  }, []); // Empty dependency array for initial mount only

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>
      <Canvas>
        {/* Always use follow camera */}
        <FollowCamera target={carRef} />

        {/* Game logic with collision detection */}
        <GameLogic
          carRef={carRef}
          bananas={bananas}
          onBananaHit={handleBananaHit}
        />

        {/* Basic lighting */}
        <ambientLight intensity={0.8} />
        <directionalLight position={[10, 10, 5]} intensity={1} />

        {/* Ground with grid for better movement visibility */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
          <planeGeometry args={[100, 100]} />
          <meshStandardMaterial color="#4a7023" />
        </mesh>

        {/* Grid overlay for visual movement reference */}
        <Grid
          position={[0, 0.01, 0]}
          args={[100, 100]}
          cellSize={2}
          cellThickness={0.6}
          cellColor="#388004"
          sectionSize={10}
          sectionThickness={1.5}
          sectionColor="#2d6605"
          fadeDistance={50}
          infiniteGrid
        />

        {/* Scattered rocks and elements to make movement more visible */}
        <ScatteredElements />

        {/* Player car */}
        <Car ref={carRef} />

        {/* Remote players */}
        {Object.values(remotePlayers).map((player) => (
          <RemotePlayer
            key={player.id}
            playerId={player.id}
            position={player.position}
            rotation={player.rotation}
            speed={player.speed || 0}
            color={player.color}
            vehicle={player.vehicle}
          />
        ))}

        {/* Bananas */}
        {bananas.map((banana) => (
          <Banana
            key={banana.id}
            position={banana.position}
            rotation={banana.rotation}
            onExpire={() => {}} // No longer needed as server handles expiration
          />
        ))}

        {/* Add item boxes */}
        {itemBoxes.length > 0 ? (
          itemBoxes.map((box) => (
            <ItemBox
              key={box.id}
              position={box.position}
              onCollect={handleItemCollect}
            />
          ))
        ) : (
          <mesh position={[0, 5, 0]}>
            <sphereGeometry args={[0.5, 16, 16]} />
            <meshStandardMaterial color="red" />
          </mesh>
        )}
      </Canvas>

      {/* Banana instructions */}
      <div
        style={{
          position: "absolute",
          top: 10,
          left: 10,
          background: "rgba(0,0,0,0.7)",
          color: "white",
          padding: 10,
          borderRadius: 5,
          fontSize: "14px",
        }}
      >
        Press <strong>SPACE</strong> to drop a banana
      </div>

      {/* Game UI */}
      <div className="game-ui">
        <div className="banana-counter">
          Bananas: {players[playerId]?.bananas || 0}
        </div>
      </div>
    </div>
  );
};

export default CarGame;
