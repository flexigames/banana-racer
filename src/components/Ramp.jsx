import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';

const Ramp = ({ position = [0, 0, 0], rotation = [0, 0, 0], width = 5, length = 8, height = 2, color = "#FFCC00" }) => {
  const rampRef = useRef();
  
  // Create a simple ramp shape geometry
  const rampGeometry = useMemo(() => {
    // Create a custom shape for a proper triangular ramp
    const shape = new THREE.Shape();
    
    // Draw the ramp profile (in the xz plane)
    shape.moveTo(-length/2, -height/2); // Bottom left
    shape.lineTo(length/2, -height/2);   // Bottom right
    shape.lineTo(-length/2, height/2);   // Top left (creates triangle)
    shape.lineTo(-length/2, -height/2);  // Back to start
    
    // Extrude the shape to create the 3D ramp
    const extrudeSettings = {
      steps: 1,
      depth: width,
      bevelEnabled: false
    };
    
    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }, [length, width, height]);
  
  return (
    <group 
      ref={rampRef} 
      position={[position[0], position[1] + height/4, position[2]]} 
      rotation={[0, rotation[1], 0]}
    >
      {/* Main ramp with collision */}
      <mesh geometry={rampGeometry} rotation={[Math.PI/2, 0, 0]}>
        <meshStandardMaterial color="#888888" roughness={0.7} metalness={0.2} />
      </mesh>
      
      {/* Add a colored stripe on top for visibility */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI/4, 0, 0]}>
        <planeGeometry args={[length * 0.95, width * 0.8]} />
        <meshStandardMaterial color={color} opacity={0.7} transparent={true} />
      </mesh>
    </group>
  );
};

export default Ramp; 