import React, { useRef, useEffect, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { PerspectiveCamera, Grid } from "@react-three/drei";
import Car from "./Car";
import RemotePlayer from "./RemotePlayer";
import Banana from "./Banana";
import Bomb from "./Cannonball";
import { useMultiplayer } from "../contexts/MultiplayerContext";
import * as THREE from "three";
import ScatteredElements from "./ScatteredElements";
import ItemBox from "./ItemBox";
import { BANANA_COLLISION_RADIUS, ITEM_BOX_COLLISION_RADIUS, CANNONBALL_COLLISION_RADIUS } from "../constants";

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
    
    // Removed direct bomb collision detection - bombs only affect players when they explode
    
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
    useItem,
    hitBanana,
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

  // Handle item box collection
  const handleItemBoxCollect = (itemBoxId) => {
    // Notify context about item box collection
    collectItemBox(itemBoxId);
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
      console.log('[CAR REF] Setting window.playerCarRef with methods:', 
        Object.keys(carRef.current).filter(key => typeof carRef.current[key] === 'function'));
      
      // Debugging check for applyBoost
      if (carRef.current.applyBoost) {
        console.log('[CAR REF] applyBoost function exists on carRef.current');
      } else {
        console.log('[CAR REF] WARNING: applyBoost function not found on carRef.current');
      }
      
      // Set the global reference
      window.playerCarRef = carRef.current;
      
      // Verify it was set correctly
      console.log('[CAR REF] Global window.playerCarRef set, has applyBoost:', 
        !!(window.playerCarRef && window.playerCarRef.applyBoost));
    } else {
      console.log('[CAR REF] carRef.current is not available');
    }
    
    // Clean up on unmount
    return () => {
      window.playerCarRef = null;
      console.log('[CAR REF] window.playerCarRef cleared');
    };
  }, [carRef.current]);
  
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
    if (!item || item.quantity <= 0) return "";
    
    // Format based on item type
    switch (item.type) {
      case 'banana':
        if (item.quantity <= 3) {
          return '🍌'.repeat(item.quantity);
        } else {
          // For more than 3 bananas, show a number
          return (
            <>
              🍌<span style={{ fontSize: '20px' }}>×{item.quantity}</span>
            </>
          );
        }
      case 'boost':
        if (item.quantity <= 3) {
          return '🚀'.repeat(item.quantity);
        } else {
          // For more than 3 boosts, show a number
          return (
            <>
              🚀<span style={{ fontSize: '20px' }}>×{item.quantity}</span>
            </>
          );
        }
      case 'cannon':
        if (item.quantity <= 3) {
          return '💣'.repeat(item.quantity);
        } else {
          // For more than 3 bombs, show a number
          return (
            <>
              💣<span style={{ fontSize: '20px' }}>×{item.quantity}</span>
            </>
          );
        }
      default:
        return `${item.type}: ${item.quantity}`;
    }
  };

  // Helper to get animation style
  const getItemDisplayStyle = () => {
    if (isAnimating) {
      return { animation: 'pulse 0.3s ease-in-out' };
    }
    return {};
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
        <Car 
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
    </div>
  );
};

export default CarGame;
