import React, { useRef, useEffect, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { PerspectiveCamera, Grid } from "@react-three/drei";
import Player from "./Player";
import RemotePlayer from "./RemotePlayer";
import Banana from "./Banana";
import GreenShell from "./GreenShell";
import { useMultiplayer } from "../contexts/MultiplayerContext";
import { useAudio } from "../contexts/AudioContext";
import * as THREE from "three";
import ItemBox from "./ItemBox";
import GameOver from "./GameOver";
import Arena from "./Arena";
import JoystickControl from "./JoystickControl";
import { ITEM_TYPES } from "../../server/types";
import Minimap from "./Minimap";
import { MuteButton } from "./MuteButton";
// Camera component that follows the player
const FollowCamera = ({ target }) => {
  const cameraRef = useRef();
  const position = useRef(new THREE.Vector3(0, 3.5, 5));
  const targetPosition = useRef(new THREE.Vector3(0, 0, 0));
  const lastValidPosition = useRef(new THREE.Vector3(0, 3.5, 5));
  const lastUpdateTime = useRef(0);
  const MAX_FRAME_DELTA = 1 / 30; // Cap frame delta at 30fps to prevent camera jumps

  useFrame((state) => {
    if (!cameraRef.current || !target.current) return;

    // Check if car is spinning out - don't move camera if it is
    const isSpinningOut = target.current.isSpinningOut?.();

    if (!isSpinningOut) {
      const currentTime = performance.now();
      let frameDelta = (currentTime - lastUpdateTime.current) / 1000; // Convert to seconds

      // Cap frame delta to prevent camera jumps
      frameDelta = Math.min(frameDelta, MAX_FRAME_DELTA);

      lastUpdateTime.current = currentTime;

      // Get car's current speed for adaptive camera behavior
      const carSpeed = target.current.speed || 0;

      // Update target position from the car
      targetPosition.current.set(
        target.current.position.x,
        target.current.position.y,
        target.current.position.z
      );

      // Calculate camera position: behind and above the car
      const carRotation = target.current.rotation.y;

      // Adaptive distance and height based on speed
      const baseDistance = 1;
      const baseHeight = 0.7;
      const speedFactor = Math.min(Math.abs(carSpeed) / 10, 1); // Normalize speed to 0-1
      const distance = baseDistance * (1 + speedFactor * 0.5); // Increase distance at high speeds
      const height = baseHeight * (1 + speedFactor * 0.3); // Increase height at high speeds

      // Calculate position behind the car based on its rotation
      const offsetX = Math.sin(carRotation) * distance;
      const offsetZ = Math.cos(carRotation) * distance;

      // Add predictive positioning based on speed
      const predictionFactor = Math.min(Math.abs(carSpeed) / 20, 0.3); // Max 30% prediction
      const forwardX = Math.sin(carRotation);
      const forwardZ = Math.cos(carRotation);

      // Position camera behind and above the car with prediction
      position.current.set(
        targetPosition.current.x - offsetX + forwardX * predictionFactor,
        targetPosition.current.y + height,
        targetPosition.current.z - offsetZ + forwardZ * predictionFactor
      );

      // Adaptive smoothing based on speed
      const baseLerpFactor = 0.15;
      const speedLerpFactor = Math.max(
        baseLerpFactor,
        Math.min(carSpeed / 20, 0.3)
      );

      // Update camera position with fixed timestep
      const lerpAmount = Math.min(1, speedLerpFactor * frameDelta * 60); // Scale by 60 to match physics timestep
      cameraRef.current.position.lerp(position.current, lerpAmount);

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
  const { handleInteraction } = useAudio();
  const {
    playerId,
    players,
    bananas,
    itemBoxes,
    fakeCubes,
    greenShells,
    useItem,
  } = useMultiplayer();

  // Handle initial interaction to start audio
  useEffect(() => {
    const handleInitialInteraction = () => {
      handleInteraction();
    };

    window.addEventListener("click", handleInitialInteraction, { once: true });
    window.addEventListener("keydown", handleInitialInteraction, { once: true });
    window.addEventListener("touchstart", handleInitialInteraction, { once: true });

    return () => {
      window.removeEventListener("click", handleInitialInteraction);
      window.removeEventListener("keydown", handleInitialInteraction);
      window.removeEventListener("touchstart", handleInitialInteraction);
    };
  }, [handleInteraction]);

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
  const spinSpeed = 50;
  const possibleItems = [
    "/icons/icon-banana.png",
    "/icons/icon-boost.png",
    "/icons/icon-cube.png",
    "/icons/icon-shell.png",
    "/icons/icon-star.png",
    "/icons/icon-bananas.png",
    "/icons/icon-shells.png",
  ];

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
      return (
        <img
          src={possibleItems[spinningItemIndex]}
          alt="spinning item"
          style={{ width: "240px", height: "240px" }}
        />
      );
    }

    if (!item || item.quantity <= 0) return "";

    // Format based on item type
    switch (item.type) {
      case "banana":
        return (
          <img
            src="/icons/icon-banana.png"
            alt="banana"
            style={{ width: "240px", height: "240px" }}
          />
        );
      case "boost":
        return (
          <img
            src="/icons/icon-boost.png"
            alt="boost"
            style={{ width: "240px", height: "240px" }}
          />
        );
      case "fake_cube":
        return (
          <img
            src="/icons/icon-cube.png"
            alt="cube"
            style={{ width: "240px", height: "240px" }}
          />
        );
      case "green_shell":
        return (
          <img
            src="/icons/icon-shell.png"
            alt="shell"
            style={{ width: "240px", height: "240px" }}
          />
        );
      case "star":
        return (
          <img
            src="/icons/icon-star.png"
            alt="star"
            style={{ width: "240px", height: "240px" }}
          />
        );
      case "three_bananas":
        return (
          <img
            src="/icons/icon-bananas.png"
            alt="three bananas"
            style={{ width: "240px", height: "240px" }}
          />
        );
      case "three_green_shells":
        return (
          <img
            src="/icons/icon-shells.png"
            alt="three green shells"
            style={{ width: "240px", height: "240px" }}
          />
        );
      default:
        return `${item.type}`;
    }
  };

  // Helper to get animation style
  const getItemDisplayStyle = () => {
    const currentPlayer = players[playerId];
    if (isItemSpinning) {
      return {
        animation: "spin 0.5s infinite linear",
        fontSize: "2.5rem",
        transform: "scale(1.2)",
      };
    }

    if (currentPlayer?.activeItem) {
      return {
        animation: "pulse 0.5s infinite ease-in-out",
        background: "rgba(156, 103, 204, 0.4)",
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
      <Canvas
        dpr={[0.4, 0.4]}
        gl={{
          antialias: false,
          powerPreference: "high-performance",
          stencil: false,
          depth: true,
          alpha: false,
        }}
        camera={{ fov: 75, near: 0.1, far: 1000 }}
        style={{
          imageRendering: "pixelated",
          imageRendering: "crisp-edges",
        }}
      >
        {/* Always use follow camera */}
        <FollowCamera target={carRef} />

        {/* Player position updater */}
        <PlayerUpdater carRef={carRef} />

        {/* Basic lighting */}
        <ambientLight intensity={0.8} />
        <directionalLight position={[10, 10, 5]} intensity={1} />

        {/* Arena with walls and ground */}
        <Arena />

        {/* Player car */}
        <Player
          ref={carRef}
          color={players[playerId]?.color}
          trailingItem={players[playerId]?.trailingItem}
        />

        {/* Remote players */}
        {remotePlayers.map((player) => (
          <group key={player.id}>
            <RemotePlayer
              playerId={player.id}
              position={player.position}
              rotation={player.rotation}
              speed={player.speed || 0}
              color={player.color}
              lives={player.lives}
              isStarred={player.isStarred}
              trailingItem={player.trailingItem}
            />
          </group>
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
          <ItemBox
            key={fakeCube.id}
            position={[
              fakeCube.position.x,
              fakeCube.position.y,
              fakeCube.position.z,
            ]}
            isFakeCube
            rotation={fakeCube.rotation}
          />
        ))}

        {/* Green Shells */}
        {greenShells.map((shell) => (
          <GreenShell
            key={shell.id}
            position={[shell.position.x, shell.position.y, shell.position.z]}
            rotation={shell.rotation}
          />
        ))}

        {/* Add item boxes */}
        {itemBoxes.map((box) => (
          <ItemBox key={box.id} position={box.position} />
        ))}
      </Canvas>
      <MuteButton />
      <JoystickControl
        onMove={(x, y) => {
          if (carRef.current) {
            carRef.current.movement.forward = y;
            carRef.current.movement.turn = -x;
          }
        }}
      />

    <Minimap />

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
          display: window.innerWidth <= 768 ? "none" : "block",
        }}
      >
        Press <strong>SPACE</strong> to use item
      </div>

      {/* Game UI */}
      <div className="game-ui">
        <div
          className="item-display"
          style={{
            ...getItemDisplayStyle(),
            cursor: currentItem?.quantity > 0 ? "pointer" : "default",
            pointerEvents: currentItem?.quantity > 0 ? "auto" : "none",
          }}
          onClick={() => {
            if (carRef.current && currentItem?.quantity > 0) {
              const carPosition = carRef.current.position.clone();
              const carRotation = carRef.current.rotation.y;
              setIsAnimating(true);
              setTimeout(() => setIsAnimating(false), 300);
              useItem(carPosition, carRotation);
            }
          }}
        >
          {getItemDisplayText(currentItem)}
        </div>
      </div>

      {/* Add the CSS animations */}
      <style>
        {`
          @keyframes spin {
            0% { transform: scale(1) rotate(0deg); }
            100% { transform: scale(1) rotate(360deg); }
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
            padding: 35px 45px;
            border-radius: 200px;
            font-size: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            min-width: 200px;
            min-height: 200px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3),
              0 0 20px rgba(255, 255, 255, 0.1) inset;
            border: 3px solid #9c67cc;
          }

          .item-display img {
            image-rendering: pixelated;
            image-rendering: -moz-crisp-edges;
            image-rendering: crisp-edges;
            -ms-interpolation-mode: nearest-neighbor;
            width: 240px !important;
            height: 240px !important;
            transform: scale(1.2);
            transform-origin: center;
          }
        `}
      </style>
    </div>
  );
};

export default CarGame;
