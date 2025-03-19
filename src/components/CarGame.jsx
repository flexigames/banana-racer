import React, { useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { PerspectiveCamera, OrbitControls } from '@react-three/drei';
import Car from './Car';

const CarGame = () => {
  const carRef = useRef();
  
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
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
        
        {/* Car */}
        <Car ref={carRef} />
      </Canvas>
    </div>
  );
};

export default CarGame; 