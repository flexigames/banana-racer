import React, { useRef, useMemo, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const RewardCube = ({ onRewardDetermined, isSpinning = true }) => {
  const cubeRef = useRef();
  const [spinSpeed, setSpinSpeed] = useState(10);
  const [finalReward, setFinalReward] = useState(null);
  const [spinningState, setSpinningState] = useState(isSpinning ? 'spinning' : 'stopped');
  const [targetRotation, setTargetRotation] = useState(0);
  

  // Create texture for a single face showing a specific number of bananas
  const createBananaTexture = (count) => {
    // Create a canvas to draw the banana emojis
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const context = canvas.getContext('2d');
    
    // Fill with semi-transparent black background
    context.fillStyle = '#783DC4';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // Banana emojis
    const bananas = Array(count).fill('🍌').join(' ');
    context.font = '150px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = 'white';
    context.fillText(bananas, canvas.width / 2, canvas.height / 2);
    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    
    return new THREE.MeshBasicMaterial({ map: texture });
  };
  
  // Create materials for each face - each with a different reward
  const materials = useMemo(() => {
    return [
      createBananaTexture(1),
      createBananaTexture(2),
      createBananaTexture(2),
      createBananaTexture(4)
    ];
  }, []);
  
  // Effect to handle spinning state changes
  useEffect(() => {
    if (isSpinning && spinningState === 'stopped') {
      // Start spinning again
      setSpinSpeed(10);
      setFinalReward(null);
      setSpinningState('spinning');
    } else if (!isSpinning && spinningState === 'spinning') {
      // Begin slowing down
      setSpinningState('slowing');
    }
  }, [isSpinning, spinningState]);

  // Animation
  useFrame((_, delta) => {
    if (!cubeRef.current) return;
    
    if (spinningState === 'spinning') {
      // Fast spinning during randomization - only on Y axis (top/down rotation)
      cubeRef.current.rotation.y += delta * spinSpeed;
    } else if (spinningState === 'slowing') {
      // Gradually slow down the cube
      const newSpeed = spinSpeed * 0.98; // Gradually reduce speed
      
      // Continue spinning but slower
      cubeRef.current.rotation.y += delta * newSpeed;
      
      // When speed is very low, determine which face is showing and set as reward
      if (newSpeed <= 0.0) {
        // Determine which face is currently facing forward
        const normalizedRotation = (cubeRef.current.rotation.y % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
        
        // Find the closest face alignment
        const faceIndex = Math.round(normalizedRotation / (Math.PI / 2)) % 4;
        const exactTargetRotation = (faceIndex * (Math.PI / 2)) % (Math.PI * 2);
        
        // Set target rotation for smooth final alignment
        setTargetRotation(exactTargetRotation);
        
        // Determine the reward based on which face is showing
        const determinedReward = facesWithRewards[faceIndex];
        setFinalReward(determinedReward);
        
        // Change state to stopped
        setSpinningState('stopped');
        setSpinSpeed(0);
        
        // Notify parent component about the determined reward
        if (onRewardDetermined) {
          onRewardDetermined(determinedReward);
        }
      } else {
        // Update speed state
        setSpinSpeed(newSpeed);
      }
    } else if (spinningState === 'stopped') {
      // When stopped, make sure the cube is aligned perfectly with a face
      if (finalReward !== null) {
        // Smoothly align to the closest face
        const currentRotation = cubeRef.current.rotation.y;
        const smoothFactor = Math.min(1, delta * 3); // Gentler interpolation
        
        // Find the closest face alignment (multiple of 90 degrees)
        const closestFaceRotation = Math.round(currentRotation / (Math.PI / 2)) * (Math.PI / 2);
        
        // Use direct interpolation to avoid sudden movements
        cubeRef.current.rotation.y = currentRotation * (1 - smoothFactor) + closestFaceRotation * smoothFactor;
      }
    }
  });
  
  return (
    <mesh ref={cubeRef} position={[0, 0, 0]}>
      <boxGeometry args={[1.5, 1.5, 1.5, 6, 6, 6, 0.3]} />
      {/* Apply materials to all 6 sides, but only the 4 sides visible during Y-rotation matter */}
      <meshStandardMaterial attachArray="material" map={materials[0].map} /> {/* +X (right) - visible during rotation */}
      <meshStandardMaterial attachArray="material" map={materials[1].map} /> {/* -X (left) - visible during rotation */}
      <meshStandardMaterial attachArray="material" /> {/* +Y (top) - not visible during Y-rotation */}
      <meshStandardMaterial attachArray="material" /> {/* -Y (bottom) - not visible during Y-rotation */}
      <meshStandardMaterial attachArray="material" map={materials[2].map} /> {/* +Z (front) - visible during rotation */}
      <meshStandardMaterial attachArray="material" map={materials[3].map} /> {/* -Z (back) - visible during rotation */}
    </mesh>
  );
};

export default RewardCube; 