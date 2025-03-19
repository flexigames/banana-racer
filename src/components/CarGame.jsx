import React, { useRef, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { PerspectiveCamera, OrbitControls, Html } from '@react-three/drei';
import Car from './Car';
import RemotePlayer from './RemotePlayer';
import multiplayerManager from '../lib/multiplayer';

const CarGame = () => {
  const carRef = useRef();
  const [remotePlayers, setRemotePlayers] = useState({});
  const [connected, setConnected] = useState(false);
  const [roomId, setRoomId] = useState('');
  const [inputRoomId, setInputRoomId] = useState('lobby');
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  
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
        
        multiplayerManager.onChatMessage = (playerId, message) => {
          const sender = playerId === multiplayerManager.playerId ? 'You' : playerId.substring(0, 6);
          setChatMessages(prev => [...prev, `${sender}: ${message}`].slice(-5));
        };
      })
      .catch(error => {
        console.error('Failed to connect to multiplayer server:', error);
      });
      
    return () => {
      multiplayerManager.disconnect();
    };
  }, []);
  
  // Join room handler
  const handleJoinRoom = () => {
    if (connected && inputRoomId) {
      multiplayerManager.joinRoom(inputRoomId);
      setRoomId(inputRoomId);
      setRemotePlayers({});
    }
  };
  
  // Send chat message
  const handleSendChat = (e) => {
    e.preventDefault();
    if (chatInput.trim() && connected && roomId) {
      multiplayerManager.sendChatMessage(chatInput);
      setChatInput('');
    }
  };
  
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
          />
        ))}
        
        {/* Debug markers for player positions */}
        {Object.values(remotePlayers).map(player => (
          <mesh 
            key={`marker-${player.id}`}
            position={[player.position.x, player.position.y + 3, player.position.z]}
          >
            <sphereGeometry args={[0.5, 16, 16]} />
            <meshBasicMaterial color="red" />
          </mesh>
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
        <h4>Debug Info</h4>
        <div>Your ID: {multiplayerManager.playerId}</div>
        <div>Room: {roomId}</div>
        <div>Connected Players: {Object.keys(remotePlayers).length}</div>
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
      
      {/* Multiplayer UI */}
      <div style={{
        position: 'absolute',
        top: 10,
        left: 10,
        background: 'rgba(0,0,0,0.7)',
        color: 'white',
        padding: 10,
        borderRadius: 5
      }}>
        <h3>Multiplayer</h3>
        <div>
          Status: {connected ? 'Connected' : 'Disconnected'}
          {roomId && ` - Room: ${roomId}`}
        </div>
        <div>
          Players: {Object.keys(remotePlayers).length + 1}
        </div>
        
        <div style={{ marginTop: 10 }}>
          <input
            type="text"
            value={inputRoomId}
            onChange={(e) => setInputRoomId(e.target.value)}
            placeholder="Room ID"
            style={{ marginRight: 5 }}
          />
          <button onClick={handleJoinRoom}>Join Room</button>
        </div>
        
        {/* Chat */}
        <div style={{ marginTop: 10, maxHeight: 100, overflowY: 'auto' }}>
          {chatMessages.map((msg, i) => (
            <div key={i}>{msg}</div>
          ))}
        </div>
        
        <form onSubmit={handleSendChat} style={{ marginTop: 5, display: 'flex' }}>
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Chat message"
            style={{ flexGrow: 1, marginRight: 5 }}
          />
          <button type="submit">Send</button>
        </form>
      </div>
    </div>
  );
};

export default CarGame; 