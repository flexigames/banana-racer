import { useFrame } from "@react-three/fiber";
import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import * as THREE from "three";
import { useMultiplayer } from "../contexts/MultiplayerContext";
import { useVehicleControls } from "../lib/input";
import { runFixedStepPhysics } from "../lib/physics";
import Car from "./Car";
import { Star } from "./Star";
import { portals } from "../lib/map";

const Player = forwardRef((props, ref) => {
  const { color: colorProp, vehicle: vehicleProp, trailingItem } = props;
  const car = useRef();
  const lastUpdateTime = useRef(0);
  const [spinningOut, setSpinningOut] = useState(false);
  const spinTimer = useRef(null);
  const spinDirection = useRef(1);
  const spinSpeed = useRef(0);
  const [hasSpawnedAtPortal, setHasSpawnedAtPortal] = useState(false);

  const { connected, playerId, playerColor, players, updatePlayerPosition } =
    useMultiplayer();

  const lives = players[playerId]?.lives;
  const isStarred = players[playerId]?.isStarred || false;

  useImperativeHandle(ref, () => car.current);

  const effectiveColor = colorProp || playerColor;

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

  const getSpawnPosition = () => {
    const params = new URLSearchParams(window.location.search);
    const isPortal = params.get("portal");

    if (isPortal === "true" && !hasSpawnedAtPortal) {
      setHasSpawnedAtPortal(true);
      const portal = portals[0];
      return {
        x: portal.position[0],
        y: 0,
        z: portal.position[2] + 1,
      };
    }

    return getRandomSpawnPosition();
  };

  const getRandomSpawnPosition = () => {
    const x = Math.random() * 5.5 - 4;
    const z = Math.random() * 5.5 - 4;
    return { x, y: 0, z };
  };

  useEffect(() => {
    if (car.current) {
      const spawnPos = getSpawnPosition();
      console.log("[APP] Spawn position", spawnPos);
      car.current.position.set(spawnPos.x, spawnPos.y, spawnPos.z);
      car.current.rotation.y = Math.random() * Math.PI * 2;
      car.current.userData.playerId = playerId;
    }
  }, [playerId]);

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
        runFixedStepPhysics(
          movement.current,
          car.current,
          delta,
          isBoosted ? 2.5 : 1.0,
          players
        );
      } catch (error) {
        console.error("Error updating vehicle physics:", error);
      }
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
      <Star isActive={isStarred} color={[1, 1, 0]}>
        <Car
          color={carColor}
          scale={[0.5, 0.5, 0.5]}
          rotation={[0, Math.PI, 0]}
          boosting={isBoosted}
          lives={lives}
          isStarred={isStarred}
          trailingItem={trailingItem}
          movement={movement.current}
        />
      </Star>
    </group>
  );
});

export default Player;
