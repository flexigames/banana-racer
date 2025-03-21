import React, { useRef, useEffect, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { PerspectiveCamera, Grid } from "@react-three/drei";
import Player from "./Player";
import RemotePlayer from "./RemotePlayer";
import Banana from "./Banana";
import Bomb from "./Bomb";
import FakeCube from "./FakeCube";
import { useMultiplayer } from "../contexts/MultiplayerContext";
import * as THREE from "three";
import ScatteredElements from "./ScatteredElements";
import ItemBox from "./ItemBox";
import {
  BANANA_COLLISION_RADIUS,
  ITEM_BOX_COLLISION_RADIUS,
  FAKE_CUBE_COLLISION_RADIUS,
  PLAYER_COLLISION_RADIUS,
} from "../constants";

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
const GameLogic = ({
  carRef,
  bananas,
  itemBoxes,
  fakeCubes,
  remotePlayers,
  onBananaHit,
  onItemBoxCollect,
  onFakeCubeHit,
  onPlayerCollision,
}) => {
  // Check for collisions each frame
  useFrame(() => {
    if (!carRef.current || carRef.current.isSpinningOut?.()) return;

    const carPosition = new THREE.Vector3(
      carRef.current.position.x,
      carRef.current.position.y,
      carRef.current.position.z
    );

    // Check collision with other players
    remotePlayers.forEach((player) => {
      if (!player.position) return;

      const playerPosition = new THREE.Vector3(
        player.position.x,
        player.position.y,
        player.position.z
      );

      const distance = carPosition.distanceTo(playerPosition);

      // If close enough to another player and they are boosting, trigger collision
      if (distance < PLAYER_COLLISION_RADIUS && player.speed >= 15) { // speed >= 15 indicates boost
        console.log(
          `[PLAYER COLLISION] Detected collision with boosted player ${player.id} at distance ${distance.toFixed(2)}`
        );
        onPlayerCollision(player.id);
      }
    });

    // Check collision with each banana
    bananas.forEach((banana) => {
      const bananaPosition = new THREE.Vector3(
        banana.position.x,
        banana.position.y,
        banana.position.z
      );

      const distance = carPosition.distanceTo(bananaPosition);

      // If close enough to banana, trigger collision
      if (distance < BANANA_COLLISION_RADIUS) {
        console.log(
          `Collision detected with banana ${
            banana.id
          } at distance ${distance.toFixed(2)}`
        );
        onBananaHit(banana.id);
      }
    });

    // Check collision with each fake cube
    fakeCubes.forEach((fakeCube) => {
      const fakeCubePosition = new THREE.Vector3(
        fakeCube.position.x,
        fakeCube.position.y,
        fakeCube.position.z
      );

      const distance = carPosition.distanceTo(fakeCubePosition);
      
      // Debug log for distance
      console.log(`[FAKE CUBE] Distance to fake cube ${fakeCube.id}: ${distance.toFixed(2)}, collision radius: ${FAKE_CUBE_COLLISION_RADIUS}`);

      // If close enough to fake cube, trigger collision
      if (distance < FAKE_CUBE_COLLISION_RADIUS) {
        console.log(
          `[FAKE CUBE] Collision detected with fake cube ${
            fakeCube.id
          } at distance ${distance.toFixed(2)}`
        );
        onFakeCubeHit(fakeCube.id);
      }
    });

    // Check collision with each item box
    itemBoxes.forEach((box) => {
      const boxPosition = new THREE.Vector3(
        box.position[0],
        box.position[1],
        box.position[2]
      );

      const distance = carPosition.distanceTo(boxPosition);

      // If close enough to item box, trigger collection
      if (distance < ITEM_BOX_COLLISION_RADIUS) {
        console.log(
          `Collision detected with item box ${
            box.id
          } at distance ${distance.toFixed(2)}`
        );
        onItemBoxCollect(box.id);
      }
    });
  });

  return null; // This component doesn't render anything
};

// New component to handle position updates
const PlayerUpdater = ({ carRef }) => {
  const { connected, updatePlayerPosition } = useMultiplayer();

  useFrame(() => {
    if (carRef.current && connected) {
      // Get car data
      const position = carRef.current.position;
      const rotation = carRef.current.rotation.y;
      const speed = carRef.current.speed || 0;

      // Update position via context
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
    connected,
    playerId,
    players,
    bananas,
    cannonballs,
    itemBoxes,
    fakeCubes,
    useItem,
    hitBanana,
    hitCannon,
    hitFakeCube,
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

  // Handle banana collision
  const handleBananaHit = (bananaId) => {
    // Trigger car spinout
    if (carRef.current && carRef.current.triggerSpinOut) {
      carRef.current.triggerSpinOut();
    }

    // Notify context about banana hit
    hitBanana(bananaId);
  };

  // Handle fake cube collision
  const handleFakeCubeHit = (fakeCubeId) => {
    console.log(`[FAKE CUBE] Triggering spinout for fake cube hit ${fakeCubeId}`);
    
    // Trigger car spinout
    if (carRef.current && carRef.current.triggerSpinOut) {
      console.log(`[FAKE CUBE] Car reference exists, calling triggerSpinOut`);
      carRef.current.triggerSpinOut();
    } else {
      console.log(`[FAKE CUBE] Warning: Car reference or triggerSpinOut not available`);
    }

    // Notify context about fake cube hit
    hitFakeCube(fakeCubeId);
  };

  // Item animation states
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinningItemIndex, setSpinningItemIndex] = useState(0);
  const [spinSpeed, setSpinSpeed] = useState(50); // ms between item changes
  const possibleItems = ["🍌", "🚀", "💣", "🎲"];

  // Handle item box collection
  const handleItemBoxCollect = (itemBoxId) => {
    // Immediately notify context about item box collection to remove it from the scene
    collectItemBox(itemBoxId);

    // Start item spinning animation
    setIsSpinning(true);
    setSpinSpeed(50); // Start fast

    // Schedule the animation to slow down and stop
    const slowDownInterval = 600; // ms - slightly faster first slowdown
    const totalAnimationTime = 3000; // ms - longer total animation

    // Gradually slow down the spin with more dramatic slowdown at the end
    const slowDown = (factor = 1.5) => {
      setSpinSpeed((prevSpeed) => {
        const newSpeed = prevSpeed * factor; // Increase interval (slow down)
        return newSpeed > 800 ? 800 : newSpeed; // Cap at 800ms
      });
    };

    // Set up the slowdown intervals with increasing slowdown effect
    const interval1 = setTimeout(() => slowDown(1.5), slowDownInterval);
    const interval2 = setTimeout(() => slowDown(1.8), slowDownInterval * 2);
    const interval3 = setTimeout(() => slowDown(2.0), slowDownInterval * 3);
    const interval4 = setTimeout(() => slowDown(2.5), slowDownInterval * 4);

    // Stop the animation after the total time
    const stopTimeout = setTimeout(() => {
      setIsSpinning(false);
    }, totalAnimationTime);

    // Set up the spinning animation
    const spinInterval = setInterval(() => {
      if (!isSpinning) {
        clearInterval(spinInterval);
        return;
      }

      setSpinningItemIndex((prev) => (prev + 1) % possibleItems.length);
    }, spinSpeed);

    // Cleanup all timers and intervals
    return () => {
      clearTimeout(interval1);
      clearTimeout(interval2);
      clearTimeout(interval3);
      clearTimeout(interval4);
      clearTimeout(stopTimeout);
      clearInterval(spinInterval);
    };
  };

  // Get remote players (all players except current player)
  const remotePlayers = Object.values(players).filter(
    (player) => player.id !== playerId
  );

  // Get current player's item data
  const currentPlayer = players[playerId];
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
    if (!isSpinning) return;

    const spinInterval = setInterval(() => {
      setSpinningItemIndex((prev) => (prev + 1) % possibleItems.length);
    }, spinSpeed);

    return () => clearInterval(spinInterval);
  }, [spinSpeed, isSpinning, possibleItems.length]);

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
    if (isSpinning) {
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
      case "cannon":
        // Always use the number format to prevent overflow
        return (
          <>
            💣<span style={{ fontSize: "20px" }}>×{item.quantity}</span>
          </>
        );
      case "fake_cube":
        // Add fake cube display
        return (
          <>
            🎲<span style={{ fontSize: "20px" }}>×{item.quantity}</span>
          </>
        );
      default:
        return `${item.type}: ${item.quantity}`;
    }
  };

  // Helper to get animation style
  const getItemDisplayStyle = () => {
    if (isSpinning) {
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

  // Handle player collision
  const handlePlayerCollision = (collidingPlayerId) => {
    console.log(`[PLAYER COLLISION] Handling collision with player ${collidingPlayerId}`);
    
    // Only spin out if we're not boosting
    if (carRef.current && carRef.current.triggerSpinOut && (!carRef.current.speed || carRef.current.speed < 15)) {
      console.log(`[PLAYER COLLISION] Triggering spinout from player collision`);
      carRef.current.triggerSpinOut();
    }
  };

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>
      <Canvas>
        {/* Always use follow camera */}
        <FollowCamera target={carRef} />

        {/* Game logic with collision detection */}
        <GameLogic
          carRef={carRef}
          bananas={bananas}
          itemBoxes={itemBoxes}
          fakeCubes={fakeCubes}
          remotePlayers={remotePlayers}
          onBananaHit={handleBananaHit}
          onItemBoxCollect={handleItemBoxCollect}
          onFakeCubeHit={handleFakeCubeHit}
          onPlayerCollision={handlePlayerCollision}
        />

        {/* Player position updater */}
        <PlayerUpdater carRef={carRef} />

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

        {/* Bombs */}
        {cannonballs.map((bomb) => (
          <Bomb
            key={bomb.id}
            id={bomb.id}
            position={bomb.position}
            velocity={bomb.velocity}
            firedAt={bomb.firedAt}
          />
        ))}

        {/* Fake Cubes */}
        {fakeCubes.map((fakeCube) => (
          <FakeCube
            key={fakeCube.id}
            position={[fakeCube.position.x, fakeCube.position.y, fakeCube.position.z]}
            rotation={fakeCube.rotation}
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
