import React, {
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";
import { useFrame } from "@react-three/fiber";
import { updateVehiclePhysics, updateObjectPosition } from "../lib/physics";
import { useVehicleControls } from "../lib/input";
import { useMultiplayer } from "../contexts/MultiplayerContext";
import * as THREE from "three";
import Car from "./Car";

const Player = forwardRef((props, ref) => {
  const { color: colorProp, vehicle: vehicleProp } = props;
  const car = useRef();
  const lastUpdateTime = useRef(0);
  const [spinningOut, setSpinningOut] = useState(false);
  const spinTimer = useRef(null);
  const spinDirection = useRef(1); // 1 or -1 for spin direction
  const spinSpeed = useRef(0);

  // Get multiplayer context
  const {
    connected,
    playerId,
    playerColor,
    playerVehicle,
    players,
    updatePlayerPosition,
  } = useMultiplayer();

  const lives = players[playerId]?.lives;

  // Expose the car ref to parent components
  useImperativeHandle(ref, () => car.current);

  // Use props first, then fall back to context
  const effectiveColor = colorProp || playerColor;
  const effectiveVehicle = vehicleProp || playerVehicle;

  // Get boost state from player data
  const isBoosted = players[playerId]?.isBoosted || false;
  const isDead = players[playerId]?.lives <= 0;

  // Create a THREE.Color from player color data
  const carColor = useMemo(() => {
    if (!effectiveColor) return null;

    return new THREE.Color().setHSL(
      effectiveColor.h,
      effectiveColor.s,
      effectiveColor.l
    );
  }, [effectiveColor]);

  // Car movement state
  const movement = useRef({
    forward: 0,
    turn: 0,
    speed: 0,
    rotation: 0,
    handbrake: false,
    tireSlip: 0,
  });

  // Set up vehicle controls
  useVehicleControls(movement);

  // Function to get a random spawn position
  const getRandomSpawnPosition = () => {
    // Generate a random position within a 40x40 area
    // But not too close to the center to avoid walls
    let x, z;
    do {
      x = (Math.random() - 0.5) * 40;
      z = (Math.random() - 0.5) * 40;
    } while (Math.sqrt(x * x + z * z) < 5); // Ensure not too close to origin

    return { x, y: 0, z };
  };

  // Position car at random start position
  useEffect(() => {
    if (car.current) {
      const spawnPos = getRandomSpawnPosition();
      car.current.position.set(spawnPos.x, spawnPos.y, spawnPos.z);
      car.current.rotation.y = Math.random() * Math.PI * 2; // Random initial rotation
    }
  }, []);

  // Function to trigger spin out when hitting a banana
  const triggerSpinOut = () => {
    if (spinningOut) return; // Already spinning out

    // Store current speed before stopping
    spinSpeed.current = movement.current.speed;

    // Set spinning out state
    setSpinningOut(true);

    // Block controls during spinout
    movement.current.forward = 0;
    movement.current.turn = 0;
    // Don't completely zero out speed to avoid position jumps
    movement.current.speed *= 0.5; // Reduce speed but don't stop completely

    // Random spin direction
    spinDirection.current = Math.random() > 0.5 ? 1 : -1;

    // Clear any existing timer
    if (spinTimer.current) {
      clearTimeout(spinTimer.current);
    }

    // Set timeout to recover from spinout after 2 seconds
    spinTimer.current = setTimeout(() => {
      setSpinningOut(false);
      spinTimer.current = null;
    }, 2000);
  };

  // Track spinout progress
  const spinProgress = useRef(0);
  const MAX_SPIN_RATE = 10; // Maximum spin rate

  // Update physics each frame
  useFrame((state, delta) => {
    if (!car.current || isDead) return;

    if (spinningOut) {
      // When spinning out, gradually decrease the spinning rate
      // Calculate spin rate based on a decreasing curve
      spinProgress.current += delta;
      const spinDuration = 2; // Should match the spinout timer duration
      const normalizedTime = Math.min(spinProgress.current / spinDuration, 1);

      // Start fast, then slow down - using a cosine easing
      const spinRate = MAX_SPIN_RATE * Math.cos(normalizedTime * Math.PI * 0.5);

      // Apply the spin
      car.current.rotation.y += spinDirection.current * delta * spinRate;

      // Gradually decrease speed
      movement.current.speed *= 0.9;
    } else {
      // Reset spin progress when not spinning
      spinProgress.current = 0;

      // Normal driving physics with boost adjustments
      updateVehiclePhysics(movement.current, delta, isBoosted ? 3.0 : 1.0);
      updateObjectPosition(car.current, movement.current, delta);
    }

    // Send position updates to server (limit to 10 updates per second)
    if (state.clock.elapsedTime - lastUpdateTime.current > 0.1) {
      lastUpdateTime.current = state.clock.elapsedTime;

      if (connected) {
        // Format position with precision to reduce network traffic
        const position = {
          x: parseFloat(car.current.position.x.toFixed(2)),
          y: parseFloat(car.current.position.y.toFixed(2)),
          z: parseFloat(car.current.position.z.toFixed(2)),
        };

        const rotation = parseFloat(car.current.rotation.y.toFixed(2));
        const speed = parseFloat(movement.current.speed.toFixed(2));

        updatePlayerPosition(position, rotation, speed);
      }
    }
  });

  // Expose the car ref and functions to parent components
  useImperativeHandle(ref, () => ({
    ...car.current,
    triggerSpinOut,
    isSpinningOut: () => spinningOut,
  }));

  if (isDead) return null;

  return (
    <group ref={car} position={[0, 0, 0]}>
      <Car
        vehicleType={effectiveVehicle}
        color={carColor}
        scale={[1.0, 1.0, 1.0]}
        rotation={[0, Math.PI, 0]}
        boosting={isBoosted}
        lives={lives}
      />
    </group>
  );
});

export default Player;
