import React, { useRef, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import Car from './Car';
import RemotePlayer from './RemotePlayer';
import multiplayerManager from '../lib/multiplayer';
import * as THREE from 'three';

// Camera component that follows the player
const FollowCamera = ({ target }) => {
  const cameraRef = useRef();
  const position = useRef(new THREE.Vector3(0, 3.5, 5));
  const targetPosition = useRef(new THREE.Vector3(0, 0, 0));
  
  useFrame(() => {
    if (!cameraRef.current || !target.current) return;
    
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
    
    // Make camera look at a point slightly above the car
    const lookTarget = targetPosition.current.clone();
    lookTarget.y += 0.3;
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

const CarGame = () => {
  const carRef = useRef();
  const [remotePlayers, setRemotePlayers] = useState({});
  const [connected, setConnected] = useState(false);
  const [cameraMode, setCameraMode] = useState('follow'); // 'follow' or 'overhead'
  
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
      })
      .catch(error => {
        console.error('Failed to connect to multiplayer server:', error);
      });
      
    return () => {
      multiplayerManager.disconnect();
    };
  }, []);
  
  // Handle camera mode toggle
  const toggleCameraMode = () => {
    setCameraMode(prev => prev === 'follow' ? 'overhead' : 'follow');
  };
  
  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <Canvas>
        {/* Camera setup based on mode */}
        {cameraMode === 'follow' ? (
          <FollowCamera target={carRef} />
        ) : (
          <PerspectiveCamera makeDefault position={[0, 20, 0]} fov={50} />
        )}
        
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
      </Canvas>
      
      {/* Camera toggle button */}
      <div style={{
        position: 'absolute',
        top: 10,
        left: 10,
        zIndex: 100
      }}>
        <button 
          onClick={toggleCameraMode}
          style={{
            padding: '8px 12px',
            backgroundColor: '#333',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Camera: {cameraMode === 'follow' ? 'Follow' : 'Overhead'}
        </button>
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