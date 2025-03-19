import React, { useRef, useEffect } from 'react';
import { Html } from '@react-three/drei';
import { useLoader } from '@react-three/fiber';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader';
import * as THREE from 'three';

const RemotePlayer = ({ playerId, position, rotation }) => {
  const car = useRef();
  
  // Create a simple colored box as the remote player vehicle
  // This is much more reliable than trying to load complex models
  useEffect(() => {
    if (!car.current) return;
    
    // Clear any existing children
    while (car.current.children.length > 0) {
      car.current.remove(car.current.children[0]);
    }
    
    // Generate a consistent color based on player ID
    const hash = playerId.split('').reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);
    
    const color = new THREE.Color().setHSL(
      Math.abs(hash % 360) / 360,
      0.8,
      0.5
    );
    
    // Create a simple truck-like shape
    const truckGroup = new THREE.Group();
    
    // Chassis
    const chassisGeometry = new THREE.BoxGeometry(1.5, 0.5, 3);
    const chassisMaterial = new THREE.MeshStandardMaterial({ color });
    const chassis = new THREE.Mesh(chassisGeometry, chassisMaterial);
    chassis.position.y = 0.5;
    truckGroup.add(chassis);
    
    // Cabin
    const cabinGeometry = new THREE.BoxGeometry(1.3, 0.8, 1);
    const cabinMaterial = new THREE.MeshStandardMaterial({ color: color.clone().multiplyScalar(1.2) });
    const cabin = new THREE.Mesh(cabinGeometry, cabinMaterial);
    cabin.position.set(0, 1.1, -0.5);
    truckGroup.add(cabin);
    
    // Wheels
    const wheelGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 16);
    const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
    
    // Front wheels
    const wheelFL = new THREE.Mesh(wheelGeometry, wheelMaterial);
    wheelFL.rotation.z = Math.PI / 2;
    wheelFL.position.set(-0.8, 0.4, -1);
    truckGroup.add(wheelFL);
    
    const wheelFR = new THREE.Mesh(wheelGeometry, wheelMaterial);
    wheelFR.rotation.z = Math.PI / 2;
    wheelFR.position.set(0.8, 0.4, -1);
    truckGroup.add(wheelFR);
    
    // Rear wheels
    const wheelRL = new THREE.Mesh(wheelGeometry, wheelMaterial);
    wheelRL.rotation.z = Math.PI / 2;
    wheelRL.position.set(-0.8, 0.4, 1);
    truckGroup.add(wheelRL);
    
    const wheelRR = new THREE.Mesh(wheelGeometry, wheelMaterial);
    wheelRR.rotation.z = Math.PI / 2;
    wheelRR.position.set(0.8, 0.4, 1);
    truckGroup.add(wheelRR);
    
    // Add the truck to the scene
    car.current.add(truckGroup);
    
    console.log(`Created truck model for player ${playerId.substring(0, 6)}`);
  }, [playerId]);
  
  // Update position and rotation
  useEffect(() => {
    if (!car.current) return;
    car.current.position.set(position.x, position.y, position.z);
    car.current.rotation.y = rotation;
  }, [position, rotation]);
  
  return (
    <group ref={car} position={[position.x, position.y, position.z]}>
      {/* Player name label */}
      <group position={[0, 2.5, 0]}>
        <sprite scale={[3, 0.7, 1]}>
          <spriteMaterial color="#000000" transparent opacity={0.6} />
        </sprite>
        <Html position={[0, 0, 0]} center>
          <div style={{ 
            color: 'white', 
            fontSize: '12px',
            fontWeight: 'bold',
            textShadow: '1px 1px 1px rgba(0,0,0,0.5)',
            padding: '2px 5px',
            backgroundColor: 'rgba(0,0,0,0.5)',
            borderRadius: '3px'
          }}>
            {playerId.substring(0, 6)}
          </div>
        </Html>
      </group>
    </group>
  );
};

export default RemotePlayer; 