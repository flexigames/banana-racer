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
  const spinDirection = useRef(1);
  const spinSpeed = useRef(0);

  const {
    connected,
    playerId,
    playerColor,
    playerVehicle,
    players,
    updatePlayerPosition,
  } = useMultiplayer();

  const lives = players[playerId]?.lives;

  useImperativeHandle(ref, () => car.current);

  const effectiveColor = colorProp || playerColor;
  const effectiveVehicle = vehicleProp || playerVehicle;

  const isBoosted = players[playerId]?.isBoosted || false;
  const isDead = players[playerId]?.lives <= 0;

  const carColor = useMemo(() => {
    if (!effectiveColor) return null;
    return new THREE.Color().setHSL(
      effectiveColor.h,
      effectiveColor.s,
      effectiveColor.l
    );
  }, [effectiveColor]);

  const movement = useRef({
    forward: 0,
    turn: 0,
    speed: 0,
    rotation: 0,
    handbrake: false,
    tireSlip: 0,
  });

  useVehicleControls(movement);

  const getRandomSpawnPosition = () => {
    let x, z;
    do {
      x = (Math.random() - 0.5) * 40;
      z = (Math.random() - 0.5) * 40;
    } while (Math.sqrt(x * x + z * z) < 5);
    return { x, y: 0, z };
  };

  useEffect(() => {
    if (car.current) {
      const spawnPos = getRandomSpawnPosition();
      car.current.position.set(spawnPos.x, spawnPos.y, spawnPos.z);
      car.current.rotation.y = Math.random() * Math.PI * 2;
    }
  }, []);

  const triggerSpinOut = () => {
    if (spinningOut) return;
    spinSpeed.current = movement.current.speed;
    setSpinningOut(true);
    movement.current.forward = 0;
    movement.current.turn = 0;
    movement.current.speed *= 0.5;
    spinDirection.current = Math.random() > 0.5 ? 1 : -1;

    if (spinTimer.current) {
      clearTimeout(spinTimer.current);
    }

    spinTimer.current = setTimeout(() => {
      setSpinningOut(false);
      spinTimer.current = null;
    }, 2000);
  };

  const spinProgress = useRef(0);
  const MAX_SPIN_RATE = 10;

  useFrame((state, delta) => {
    if (!car.current || isDead) return;

    if (spinningOut) {
      spinProgress.current += delta;
      const spinDuration = 2;
      const normalizedTime = Math.min(spinProgress.current / spinDuration, 1);
      const spinRate = MAX_SPIN_RATE * Math.cos(normalizedTime * Math.PI * 0.5);
      car.current.rotation.y += spinDirection.current * delta * spinRate;
      movement.current.speed *= 0.9;
    } else {
      spinProgress.current = 0;
      try {
        updateVehiclePhysics(movement.current, delta, isBoosted ? 2.5 : 1.0);
      } catch (error) {
        console.error("Error updating vehicle physics:", error);
      }
      updateObjectPosition(car.current, movement.current, delta);
    }

    if (state.clock.elapsedTime - lastUpdateTime.current > 0.1) {
      lastUpdateTime.current = state.clock.elapsedTime;

      if (connected) {
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

  useImperativeHandle(ref, () => ({
    ...car.current,
    triggerSpinOut,
    isSpinningOut: () => spinningOut,
    movement: movement.current,
  }));

  if (isDead) return null;

  return (
    <group ref={car} position={[0, 0, 0]}>
      <Car
        vehicleType={effectiveVehicle}
        color={carColor}
        scale={[0.5, 0.5, 0.5]}
        rotation={[0, Math.PI, 0]}
        boosting={isBoosted}
        lives={lives}
      />
    </group>
  );
});

export default Player;
