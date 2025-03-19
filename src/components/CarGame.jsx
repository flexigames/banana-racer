import React, { useRef, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import Car from './Car';
import RemotePlayer from './RemotePlayer';
import Banana from './Banana';
import multiplayerManager from '../lib/multiplayer';
import * as THREE from 'three';

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
    bananas.forEach(banana => {
      const bananaPosition = new THREE.Vector3(
        banana.position.x,
        banana.position.y,
        banana.position.z
      );
      
      const distance = carPosition.distanceTo(bananaPosition);
      
      // If close enough to banana, trigger collision
      if (distance < COLLISION_THRESHOLD) {
        console.log(`Collision detected with banana ${banana.id} at distance ${distance.toFixed(2)}`);
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
  
  // Handle key press events
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Space bar to drop banana
      if (event.code === 'Space') {
        dropBanana();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
  
  // Function to drop a banana behind the player
  const dropBanana = () => {
    if (!carRef.current) return;
    
    // Check if we can drop a banana (cooldown)
    const now = Date.now();
    if (now - lastBananaTime < bananaTimeout) return;
    
    // Update last banana time
    setLastBananaTime(now);
    
    // Get car position and rotation
    const carPosition = carRef.current.position.clone();
    const carRotation = carRef.current.rotation.y;
    
    // Calculate position behind the car
    const distanceBehind = 1; // 1 unit behind the car (reduced from 2)
    const offsetX = Math.sin(carRotation) * distanceBehind;
    const offsetZ = Math.cos(carRotation) * distanceBehind;
    
    // Position for the banana
    const bananaPosition = {
      x: carPosition.x - offsetX,
      y: 0.1, // Lower to the ground (was 0.2)
      z: carPosition.z - offsetZ
    };
    
    // Send banana drop event to server via multiplayer manager
    multiplayerManager.dropBanana(bananaPosition, carRotation);
    
    console.log('Requested banana drop at', bananaPosition);
  };
  
  // Handle banana collision
  const handleBananaHit = (bananaId) => {
    // Trigger car spinout
    if (carRef.current && carRef.current.triggerSpinOut) {
      carRef.current.triggerSpinOut();
    }
    
    // Remove the banana locally (server will also broadcast to all clients)
    setBananas(prev => prev.filter(b => b.id !== bananaId));
    
    // Notify server about banana hit
    multiplayerManager.hitBanana(bananaId);
  };
  
  // Connect to multiplayer server
  useEffect(() => {
    multiplayerManager.connect()
      .then(() => {
        setConnected(true);
        
        // Set up event handlers
        multiplayerManager.onPlayerJoined = (player) => {
          setRemotePlayers(prev => ({
            ...prev,
            [player.id]: player
          }));
        };
        
        multiplayerManager.onPlayerLeft = (player) => {
          setRemotePlayers(prev => {
            const newPlayers = { ...prev };
            delete newPlayers[player.id];
            return newPlayers;
          });
        };
        
        multiplayerManager.onPlayerUpdated = (player) => {
          setRemotePlayers(prev => ({
            ...prev,
            [player.id]: player
          }));
        };
        
        // Set up banana event handlers
        multiplayerManager.onBananaDropped = (banana) => {
          console.log("Banana dropped event received", banana);
          setBananas(prev => [...prev, banana]);
        };
        
        multiplayerManager.onBananaExpired = (bananaId) => {
          console.log("Banana expired event received", bananaId);
          setBananas(prev => prev.filter(b => b.id !== bananaId));
        };
        
        multiplayerManager.onBananaHit = (bananaId, hitByPlayerId) => {
          console.log(`Banana hit event received: ${bananaId} hit by ${hitByPlayerId}`);
          setBananas(prev => prev.filter(b => b.id !== bananaId));
          
          // If the current player didn't trigger this hit, play a sound or show visual indicator
          if (hitByPlayerId !== multiplayerManager.playerId) {
            console.log(`Player ${hitByPlayerId} hit a banana`);
            // Optional: Play sound or show notification
          }
        };
      })
      .catch(error => {
        console.error('Failed to connect to multiplayer server:', error);
      });
      
    return () => {
      multiplayerManager.disconnect();
    };
  }, []);
  
  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
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
        <directionalLight
          position={[10, 10, 5]}
          intensity={1}
        />
        
        {/* Ground */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
          <planeGeometry args={[100, 100]} />
          <meshBasicMaterial color="#4a7023" />
        </mesh>
        
        {/* Player car */}
        <Car ref={carRef} />
        
        {/* Remote players */}
        {Object.values(remotePlayers).map(player => (
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
        {bananas.map(banana => (
          <Banana
            key={banana.id}
            position={banana.position}
            rotation={banana.rotation}
            onExpire={() => {}} // No longer needed as server handles expiration
          />
        ))}
      </Canvas>
      
      {/* Banana instructions */}
      <div style={{
        position: 'absolute',
        top: 10,
        left: 10,
        background: 'rgba(0,0,0,0.7)',
        color: 'white',
        padding: 10,
        borderRadius: 5,
        fontSize: '14px'
      }}>
        Press <strong>SPACE</strong> to drop a banana
      </div>
      
      {/* Add debug info to the UI */}
      <div style={{
        position: 'absolute',
        bottom: 10,
        right: 10,
        background: 'rgba(0,0,0,0.7)',
        color: 'white',
        padding: 10,
        borderRadius: 5,
        maxHeight: '200px',
        overflowY: 'auto',
        fontSize: '12px'
      }}>
        <h4>Multiplayer Info</h4>
        <div>Your ID: {multiplayerManager.playerId}</div>
        <div>Your Vehicle: {multiplayerManager.playerVehicle}</div>
        <div>Status: {connected ? 'Connected' : 'Disconnected'}</div>
        <div>Players: {Object.keys(remotePlayers).length + 1}</div>
        <div>Active Bananas: {bananas.length}</div>
        <div>
          <h5>Remote Players:</h5>
          {Object.values(remotePlayers).map(player => (
            <div key={`debug-${player.id}`} style={{
              display: 'flex',
              alignItems: 'center',
              margin: '4px 0'
            }}>
              <div style={{
                width: '12px',
                height: '12px',
                backgroundColor: `hsl(${player.color ? Math.round(player.color.h * 360) : 0}deg, ${player.color ? Math.round(player.color.s * 100) : 0}%, ${player.color ? Math.round(player.color.l * 100) : 0}%)`,
                marginRight: '8px',
                borderRadius: '50%',
              }} />
              ID: {player.id.substring(0, 6)} | 
              Vehicle: {player.vehicle || 'unknown'} |
              Pos: ({player.position.x.toFixed(1)}, {player.position.y.toFixed(1)}, {player.position.z.toFixed(1)})
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CarGame; 