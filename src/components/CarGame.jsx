import React, { useRef, useEffect, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { PerspectiveCamera, Grid } from "@react-three/drei";
import Car from "./Car";
import RemotePlayer from "./RemotePlayer";
import Banana from "./Banana";
import { useMultiplayer } from "../contexts/MultiplayerContext";
import * as THREE from "three";
import ScatteredElements from "./ScatteredElements";
import ItemBox from "./ItemBox";
import RewardCube from "./RewardCube";
import { BANANA_COLLISION_RADIUS, ITEM_BOX_COLLISION_RADIUS } from "../constants";

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
const GameLogic = ({ carRef, bananas, itemBoxes, onBananaHit, onItemBoxCollect }) => {
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
      if (distance < BANANA_COLLISION_RADIUS) {
        console.log(
          `Collision detected with banana ${
            banana.id
          } at distance ${distance.toFixed(2)}`
        );
        onBananaHit(banana.id);
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
    itemBoxes,
    dropBanana,
    hitBanana,
    collectItemBox,
  } = useMultiplayer();

  // State for item box reward animation
  const [showingReward, setShowingReward] = useState(false);
  const [randomizingReward, setRandomizingReward] = useState(false);
  const [rewardAmount, setRewardAmount] = useState(0);

  // Handle key press events
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Space bar to drop banana
      if (event.code === "Space") {
        // Only need to get current car position and rotation
        if (carRef.current) {
          const carPosition = carRef.current.position.clone();
          const carRotation = carRef.current.rotation.y;
          dropBanana(carPosition, carRotation);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [dropBanana]);

  // Handle banana collision
  const handleBananaHit = (bananaId) => {
    // Trigger car spinout
    if (carRef.current && carRef.current.triggerSpinOut) {
      carRef.current.triggerSpinOut();
    }

    // Notify context about banana hit
    hitBanana(bananaId);
  };

  // Handle item box collection
  const handleItemBoxCollect = (itemBoxId) => {
    // Generate a final reward value (1, 2, or 3)
    const finalReward = Math.floor(Math.random() * 3) + 1;
    
    // Notify context about item box collection with the finalReward
    // The context will handle adding the reward after the animation
    collectItemBox(itemBoxId, finalReward);
    
    // Start reward animation
    setShowingReward(true);
    setRandomizingReward(true);
    // Set the reward amount for the cube to target
    setRewardAmount(finalReward);
    
    // Stop randomizing after 2.5 seconds
    setTimeout(() => {
      setRandomizingReward(false);
      
      // Hide reward after another 5 seconds (showing the final reward face)
      setTimeout(() => {
        setShowingReward(false);
      }, 5000);
    }, 2500);
  };

  // Get remote players (all players except current player)
  const remotePlayers = Object.values(players).filter(
    (player) => player.id !== playerId
  );

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
          onBananaHit={handleBananaHit}
          onItemBoxCollect={handleItemBoxCollect}
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
        <Car ref={carRef} />

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

        {/* Add item boxes */}
        {itemBoxes.length > 0 ? (
          itemBoxes.map((box) => (
            <ItemBox
              key={box.id}
              position={box.position}
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

      {/* 3D Reward Animation */}
      {showingReward && (
        <div
          style={{
            position: "absolute",
            bottom: "20px",
            left: "20px",
            width: "150px",
            height: "150px",
            borderRadius: "10px",
            overflow: "hidden"
          }}
        >
          <Canvas>
            <ambientLight intensity={1.5} />
            <directionalLight position={[5, 5, 5]} intensity={1} />
            <PerspectiveCamera makeDefault position={[0, 0, 3]} fov={50} />
            <RewardCube rewardAmount={rewardAmount} isSpinning={randomizingReward} />
          </Canvas>
        </div>
      )}

      {/* Game UI */}
      <div className="game-ui">
        <div className="banana-counter">
          Bananas: {players[playerId]?.bananas}
        </div>
      </div>
    </div>
  );
};

export default CarGame;
