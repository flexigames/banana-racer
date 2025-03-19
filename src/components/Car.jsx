import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useFrame } from '@react-three/fiber';
import { useModelWithMaterials, prepareModel } from '../lib/loaders';
import { updateVehiclePhysics, updateObjectPosition } from '../lib/physics';
import { useVehicleControls } from '../lib/input';

const Car = forwardRef((props, ref) => {
  const car = useRef();
  
  // Expose the car ref to parent components
  useImperativeHandle(ref, () => car.current);
  
  // Load the vehicle-racer model with materials
  const vehicleModel = useModelWithMaterials(
    '/assets/vehicle-racer.obj',
    '/assets/vehicle-racer.mtl'
  );
  
  // Car movement state
  const movement = useRef({
    forward: 0,
    turn: 0,
    speed: 0,
    rotation: 0,
    handbrake: false,
    tireSlip: 0
  });

  // Set up vehicle controls
  useVehicleControls(movement);
  
  // Position car at start position
  useEffect(() => {
    if (car.current) {
      car.current.position.set(0, 0.1, 0); // Lower to 0.1
      car.current.rotation.y = 0; // Facing forward
    }
  }, []);

  // Update physics each frame
  useFrame((state, delta) => {
    // Update physics
    updateVehiclePhysics(movement.current, delta);
    
    // Update position
    updateObjectPosition(car.current, movement.current, delta);
    
    // Ensure the car stays on the ground
    if (car.current) {
      car.current.position.y = 0.1; // Lower to 0.1
    }
  });

  return (
    <group ref={car} position={[0, 0.1, 0]}>
      <primitive 
        object={vehicleModel} 
        scale={[0.5, 0.5, 0.5]} 
        rotation={[0, Math.PI, 0]} // Rotate 180 degrees to face forward
      />
    </group>
  );
});

export default Car; 