import React, { useRef, useEffect, useState, RefObject } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { PerspectiveCamera, Grid } from "@react-three/drei";
import Car from "./Car";
import RemotePlayer from "./RemotePlayer";
import Banana from "./Banana";
import { useMultiplayer } from "../contexts/MultiplayerContext";
import * as THREE from "three";
import ScatteredElements from "./ScatteredElements";
import ItemBox from "./ItemBox";
import { BANANA_COLLISION_RADIUS, ITEM_BOX_COLLISION_RADIUS } from "../constants";
import { CarRef, BananaData, ItemBoxData, ItemData } from "../types";

interface FollowCameraProps {
  target: RefObject<CarRef>;
}

// Camera component that follows the player
const FollowCamera: React.FC<FollowCameraProps> = ({ target }) => {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
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

interface GameLogicProps {
  carRef: RefObject<CarRef>;
  bananas: BananaData[];
  itemBoxes: ItemBoxData[];
  onBananaHit: (bananaId: string) => void;
  onItemBoxCollect: (itemBoxId: string) => void;
}

// Component to handle collision detection and game logic
const GameLogic: React.FC<GameLogicProps> = ({ carRef, bananas, itemBoxes, onBananaHit, onItemBoxCollect }) => {
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

interface PlayerUpdaterProps {
  carRef: RefObject<CarRef>;
}

// New component to handle position updates
const PlayerUpdater: React.FC<PlayerUpdaterProps> = ({ carRef }) => {
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

const CarGame: React.FC = () => {
  const carRef = useRef<CarRef>(null);
  const {
    connected,
    playerId,
    players,
    bananas,
    itemBoxes,
    useItem,
    hitBanana,
    collectItemBox,
  } = useMultiplayer();

  // Handle key press events
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
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
      window.addEventListener("keydown", handleKeyDown);
    };
  }, [useItem]);

  // Handle banana collision
  const handleBananaHit = (bananaId: string) => {
    // Trigger car spinout
    if (carRef.current && carRef.current.triggerSpinOut) {
      carRef.current.triggerSpinOut();
    }

    // Notify context about banana hit
    hitBanana(bananaId);
  };

  // Handle item box collection
  const handleItemBoxCollect = (itemBoxId: string) => {
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
  const [prevQuantity, setPrevQuantity] = useState<number>(0);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  
  // Make car reference available globally for the boost effect
  useEffect(() => {
    if (carRef.current) {
      console.log('[CAR REF] Setting window.playerCarRef with methods:', 
        Object.getOwnPropertyNames(carRef.current)
          .filter(key => typeof (carRef.current as any)[key] === 'function'));
      
      // Debugging check for applyBoost
      if (carRef.current.applyBoost) {
        console.log('[CAR REF] applyBoost function exists on carRef.current');
      } else {
        console.log('[CAR REF] WARNING: applyBoost function not found on carRef.current');
      }
      
      // Set the global reference
      (window as any).playerCarRef = carRef.current;
      
      // Verify it was set correctly
      console.log('[CAR REF] Global window.playerCarRef set, has applyBoost:', 
        !!(window as any).playerCarRef && (window as any).playerCarRef.applyBoost);
    } else {
      console.log('[CAR REF] carRef.current is not available');
    }
    
    return () => {
      (window as any).playerCarRef = null;
    };
  }, []);
  
  // Update previous quantity when current item changes
  useEffect(() => {
    if (currentItem) {
      setPrevQuantity(currentItem.quantity);
    }
  }, [currentItem?.quantity]);
  
  // Item display text function
  const getItemDisplayText = (item: ItemData | undefined): string => {
    if (!item) return "";
    
    switch (item.type) {
      case "banana":
        return `Banana x${item.quantity}`;
      case "booster":
        return `Booster x${item.quantity}`;
      default:
        return `${item.type} x${item.quantity}`;
    }
  };
  
  // Item display style function for animations
  const getItemDisplayStyle = () => {
    const baseStyle: React.CSSProperties = {
      position: 'absolute',
      bottom: '30px',
      right: '30px',
      padding: '10px 20px',
      background: 'rgba(0, 0, 0, 0.5)',
      color: 'white',
      borderRadius: '10px',
      fontFamily: 'Arial, sans-serif',
      fontWeight: 'bold',
      fontSize: '24px',
      transition: 'all 0.2s ease-out',
    };
    
    if (isAnimating) {
      return {
        ...baseStyle,
        transform: 'scale(1.3)',
        background: 'rgba(255, 215, 0, 0.8)',
      };
    }
    
    return baseStyle;
  };

  return (
    <>
      {/* Item display */}
      {currentItem && currentItem.quantity > 0 && (
        <div style={getItemDisplayStyle()}>
          {getItemDisplayText(currentItem)}
        </div>
      )}
      
      {/* Connection status */}
      <div style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        padding: '5px 10px',
        background: connected ? 'rgba(0, 255, 0, 0.5)' : 'rgba(255, 0, 0, 0.5)',
        color: 'white',
        borderRadius: '5px',
        fontSize: '14px',
      }}>
        {connected ? 'Connected' : 'Disconnected'}
      </div>
      
      {/* Main 3D Canvas */}
      <Canvas shadows>
        <FollowCamera target={carRef} />
        
        {/* Car and game logic */}
        <Car ref={carRef} />
        <PlayerUpdater carRef={carRef} />
        <GameLogic 
          carRef={carRef}
          bananas={bananas}
          itemBoxes={itemBoxes}
          onBananaHit={handleBananaHit}
          onItemBoxCollect={handleItemBoxCollect}
        />
        
        {/* Track environment */}
        <ambientLight intensity={0.4} />
        <directionalLight 
          position={[10, 10, 5]} 
          intensity={0.8} 
          castShadow 
          shadow-mapSize={[2048, 2048]} 
        />
        
        <Grid
          args={[500, 500]}
          position={[0, -0.01, 0]}
          cellSize={5}
          cellThickness={0.5}
          cellColor="#6f6f6f"
          sectionSize={20}
          sectionThickness={1}
          sectionColor="#9d4b4b"
          fadeDistance={500}
          fadeStrength={1}
        />
        
        {/* Remote players */}
        {remotePlayers.map(player => (
          <RemotePlayer
            key={player.id}
            position={[player.position.x, player.position.y, player.position.z]}
            rotation={player.rotation}
            speed={player.speed}
            playerId={player.id}
            color={player.color || { h: 0, s: 0, l: 0.5 }} // Default color if not provided
          />
        ))}
        
        {/* Render bananas */}
        {bananas.map(banana => (
          <Banana
            key={banana.id}
            position={[banana.position.x, banana.position.y, banana.position.z]}
            rotation={banana.rotation}
            onExpire={() => {}} // Add required onExpire function
          />
        ))}
        
        {/* Render item boxes */}
        {itemBoxes.map(box => (
          <ItemBox 
            key={box.id}
            position={box.position}
          />
        ))}
        
        {/* Scattered trees and environment objects */}
        <ScatteredElements count={20} radius={100} />
      </Canvas>
    </>
  );
};

export default CarGame; 