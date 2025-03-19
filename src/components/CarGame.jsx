import React, { useRef, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { PerspectiveCamera, OrbitControls } from '@react-three/drei';
import Car from './Car';
import RemotePlayer from './RemotePlayer';
import multiplayerManager from '../lib/multiplayer';

const CarGame = () => {
  const carRef = useRef();
  const [remotePlayers, setRemotePlayers] = useState({});
  const [connected, setConnected] = useState(false);
  
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
  
  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <Canvas>
        {/* Simple static top-down camera */}
        <PerspectiveCamera makeDefault position={[0, 20, 0]} fov={50} />
        <OrbitControls />
        
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
          />
        ))}
      </Canvas>
      
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
        <div>Status: {connected ? 'Connected' : 'Disconnected'}</div>
        <div>Players: {Object.keys(remotePlayers).length + 1}</div>
        <div>
          <h5>Remote Players:</h5>
          {Object.values(remotePlayers).map(player => (
            <div key={`debug-${player.id}`}>
              ID: {player.id.substring(0, 6)} | 
              Pos: ({player.position.x.toFixed(1)}, {player.position.y.toFixed(1)}, {player.position.z.toFixed(1)})
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CarGame; 