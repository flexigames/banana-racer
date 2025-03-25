import React, { useRef, useEffect, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { PerspectiveCamera, Grid } from "@react-three/drei";
import Player from "./Player";
import RemotePlayer from "./RemotePlayer";
import Banana from "./Banana";
import FakeCube from "./FakeCube";
import GreenShell from "./GreenShell";
import { useMultiplayer } from "../contexts/MultiplayerContext";
import * as THREE from "three";
import ItemBox from "./ItemBox";
import GameOver from "./GameOver";
import Arena from "./Arena";

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
      const distance = 3;
      const height = 1.5;

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

const PlayerUpdater = ({ carRef }) => {
  const { connected, updatePlayerPosition } = useMultiplayer();

  useFrame(() => {
    if (carRef.current && connected) {
      const position = carRef.current.position;
      const rotation = carRef.current.rotation.y;
      const speed = carRef.current.speed || 0;

      updatePlayerPosition(
        { x: position.x, y: position.y, z: position.z },
        rotation,
        speed
      );
    }
  });

  return null;
};

const CarGame = () => {
  const carRef = useRef();
  const {
    playerId,
    players,
    bananas,
    itemBoxes,
    fakeCubes,
    greenShells,
    useItem,
    collectItemBox,
  } = useMultiplayer();

  // Handle key press events
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Space bar to use item
      if (event.code === "Space") {
        // Only need to get current car position and rotation
        if (carRef.current) {
          const carPosition = carRef.current.position.clone();
          const carRotation = carRef.current.rotation.y;

          // Trigger use animation regardless of whether the use succeeds
          setIsAnimating(true);
          setTimeout(() => setIsAnimating(false), 300);

          useItem(carPosition, carRotation);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [useItem]);

  // Get current player's data
  const currentPlayer = players[playerId];
  const isSpinning = currentPlayer?.isSpinning;
  const isItemSpinning = currentPlayer?.isItemSpinning;
  const isGameOver = currentPlayer?.lives <= 0;

  // Update car's spinning state based on server state
  useEffect(() => {
    if (carRef.current && isSpinning) {
      carRef.current.triggerSpinOut();
    }
  }, [isSpinning]);

  // Item animation states
  const [spinningItemIndex, setSpinningItemIndex] = useState(0);
  const [spinSpeed, setSpinSpeed] = useState(50); // ms between item changes
  const possibleItems = ["🍌", "🚀", "🎲", "🐢"];

  // Handle item box collection
  const handleItemBoxCollect = (itemBoxId) => {
    // Immediately notify context about item box collection to remove it from the scene
    collectItemBox(itemBoxId);
  };

  // Get remote players (all players except current player)
  const remotePlayers = Object.values(players).filter(
    (player) => player.id !== playerId && player.lives > 0
  );

  // Get current player's item data
  const currentItem = currentPlayer?.item;

  // Track previous item for animation
  const [prevQuantity, setPrevQuantity] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  // Make car reference available globally for the boost effect
  useEffect(() => {
    if (carRef.current) {
      window.playerCarRef = carRef.current;
    }

    // Clean up on unmount
    return () => {
      window.playerCarRef = null;
    };
  }, [carRef.current]);

  // Update spinning interval effect
  useEffect(() => {
    if (!isItemSpinning) return;

    const spinInterval = setInterval(() => {
      setSpinningItemIndex((prev) => (prev + 1) % possibleItems.length);
    }, spinSpeed);

    return () => clearInterval(spinInterval);
  }, [spinSpeed, isItemSpinning, possibleItems.length]);

  // Trigger animation when item quantity changes
  useEffect(() => {
    if (currentItem?.quantity !== prevQuantity) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 300);
      setPrevQuantity(currentItem?.quantity || 0);
      return () => clearTimeout(timer);
    }
  }, [currentItem?.quantity, prevQuantity]);

  // Helper function to format item display text
  const getItemDisplayText = (item) => {
    if (isItemSpinning) {
      return possibleItems[spinningItemIndex];
    }

    if (!item || item.quantity <= 0) return "";

    // Format based on item type
    switch (item.type) {
      case "banana":
        // Always use the number format to prevent overflow
        return (
          <>
            🍌<span style={{ fontSize: "20px" }}>×{item.quantity}</span>
          </>
        );
      case "boost":
        // Always use the number format to prevent overflow
        return (
          <>
            🚀<span style={{ fontSize: "20px" }}>×{item.quantity}</span>
          </>
        );
      case "fake_cube":
        // Add fake cube display
        return (
          <>
            🎲<span style={{ fontSize: "20px" }}>×{item.quantity}</span>
          </>
        );
      case "green_shell":
        // Add green shell display
        return (
          <>
            🐢<span style={{ fontSize: "20px" }}>×{item.quantity}</span>
          </>
        );
      default:
        return `${item.type}: ${item.quantity}`;
    }
  };

  // Helper to get animation style
  const getItemDisplayStyle = () => {
    if (isItemSpinning) {
      return {
        animation: "spin 0.5s infinite linear",
        fontSize: "2.5rem",
        transform: "scale(1.2)",
      };
    }

    if (isAnimating) {
      return { animation: "pulse 0.3s ease-in-out" };
    }

    return {};
  };

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>
      {isGameOver && <GameOver />}
      <Canvas>
        {/* Always use follow camera */}
        <FollowCamera target={carRef} />

        {/* Player position updater */}
        <PlayerUpdater carRef={carRef} />

        {/* Basic lighting */}
        <ambientLight intensity={0.8} />
        <directionalLight position={[10, 10, 5]} intensity={1} />

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

        {/* Arena with walls and ground */}
        <Arena />

        {/* Player car */}
        <Player
          ref={carRef}
          color={players[playerId]?.color}
          vehicle={players[playerId]?.vehicle}
        />

        {/* Remote players */}
        {remotePlayers.map((player) => (
          <RemotePlayer
            key={player.id}
            playerId={player.id}
            position={player.position}
            rotation={player.rotation}
            speed={player.speed || 0}
            color={player.color}
            vehicle={player.vehicle}
            lives={player.lives}
          />
        ))}

        {/* Bananas */}
        {bananas.map((banana) => (
          <Banana
            key={banana.id}
            position={banana.position}
            rotation={banana.rotation}
          />
        ))}

        {/* Fake Cubes */}
        {fakeCubes.map((fakeCube) => (
          <FakeCube
            key={fakeCube.id}
            position={[
              fakeCube.position.x,
              fakeCube.position.y,
              fakeCube.position.z,
            ]}
            rotation={fakeCube.rotation}
          />
        ))}

        {/* Green Shells */}
        {greenShells.map((shell) => (
          <GreenShell
            key={shell.id}
            position={[
              shell.position.x,
              shell.position.y,
              shell.position.z,
            ]}
            rotation={shell.rotation}
          />
        ))}

        {/* Add item boxes */}
        {itemBoxes.length > 0 ? (
          itemBoxes.map((box) => (
            <ItemBox key={box.id} position={box.position} />
          ))
        ) : (
          <mesh position={[0, 5, 0]}>
            <sphereGeometry args={[0.5, 16, 16]} />
            <meshStandardMaterial color="red" />
          </mesh>
        )}
      </Canvas>

      {/* Item instructions */}
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
        Press <strong>SPACE</strong> to use item
      </div>

      {/* Game UI */}
      <div className="game-ui">
        <div className="item-display" style={getItemDisplayStyle()}>
          {getItemDisplayText(currentItem)}
        </div>
      </div>

      {/* Add the CSS animations */}
      <style>
        {`
          @keyframes spin {
            0% { transform: scale(1.2) rotate(0deg); }
            100% { transform: scale(1.2) rotate(360deg); }
          }
          
          @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.2); }
            100% { transform: scale(1); }
          }
          
          .game-ui {
            position: absolute;
            bottom: 30px;
            left: 0;
            right: 0;
            display: flex;
            justify-content: center;
            pointer-events: none;
          }
          
          .item-display {
            background: rgba(0, 0, 0, 0.7);
            color: white;
            padding: 15px 25px;
            border-radius: 50px;
            font-size: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            min-width: 80px;
            min-height: 80px;
          }
        `}
      </style>
    </div>
  );
};

export default CarGame;
