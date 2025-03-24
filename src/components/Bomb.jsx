import React, { useRef, useState, useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useMultiplayer } from "../contexts/MultiplayerContext";
import { BOMB_EXPLOSION_RADIUS } from "../constants";

const Bomb = ({ id, position, velocity, firedAt }) => {
  const ref = useRef();
  const startTime = useRef(firedAt || Date.now());
  const initialPosition = useRef(
    new THREE.Vector3(
      position.x || 0,
      position.y || 0.5, // Slightly above ground
      position.z || 0
    )
  );

  const velocityVector = useRef(
    new THREE.Vector3(velocity?.x || 0, velocity?.y || 0, velocity?.z || 0)
  );

  // Get player info and multiplayer functions
  const { playerId, players } = useMultiplayer();

  // Add explosion state
  const [isExploding, setIsExploding] = useState(false);
  const [explosionScale, setExplosionScale] = useState(1);
  const maxExplosionScale = BOMB_EXPLOSION_RADIUS / 0.3; // Scale needed to reach the defined explosion radius (0.3 is base geometry radius)

  // Create particles for the explosion
  const particleCount = 30;
  const particles = useMemo(() => {
    const tempParticles = [];
    for (let i = 0; i < particleCount; i++) {
      // Random positions around a sphere
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const r = 0.3 + Math.random() * 0.5; // Vary the initial distance

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);

      // Random velocities outward
      const speed = 0.05 + Math.random() * 0.1;
      const vx = x * speed;
      const vy = y * speed;
      const vz = z * speed;

      // Random sizes
      const size = 0.05 + Math.random() * 0.15;

      // Random colors (from yellow to red)
      const color = new THREE.Color();
      color.setHSL(0.05 + Math.random() * 0.1, 1, 0.5 + Math.random() * 0.2);

      tempParticles.push({
        position: new THREE.Vector3(x, y, z),
        velocity: new THREE.Vector3(vx, vy, vz),
        size,
        color,
        opacity: 1,
      });
    }
    return tempParticles;
  }, []);

  // Track explosion progress
  const [explosionProgress, setExplosionProgress] = useState(0);

  // Function to check if a player is within the explosion radius
  const checkExplosionCollisions = () => {
    if (!ref.current) return;

    // Get bomb's current world position
    const bombPosition = new THREE.Vector3();
    ref.current.getWorldPosition(bombPosition);

    console.log(
      `[EXPLOSION] Checking collisions at position (${bombPosition.x.toFixed(
        2
      )}, ${bombPosition.y.toFixed(2)}, ${bombPosition.z.toFixed(2)})`
    );
    console.log(
      `[EXPLOSION] Using explosion radius: ${BOMB_EXPLOSION_RADIUS} units`
    );

    let playersInRadius = 0;

    // Check all players
    Object.values(players).forEach((player) => {
      // Skip if no position data
      if (!player.position) return;

      // Create Vector3 from player position
      const playerPosition = new THREE.Vector3(
        player.position.x,
        player.position.y,
        player.position.z
      );

      const distance = bombPosition.distanceTo(playerPosition);

      if (distance < BOMB_EXPLOSION_RADIUS) {
        playersInRadius++;
        console.log(
          `[EXPLOSION] Player ${
            player.id
          } caught in explosion (distance: ${distance.toFixed(2)})`
        );

        if (
          player.id === playerId &&
          window.playerCarRef &&
          window.playerCarRef.triggerSpinOut
        ) {
          console.log(`[EXPLOSION] Triggering spinout for local player`);
          window.playerCarRef.triggerSpinOut();
        }
      }
    });

    console.log(
      `[EXPLOSION] Total players in explosion radius: ${playersInRadius}`
    );
  };

  // Timer for explosion
  useEffect(() => {
    const explosionTimer = setTimeout(() => {
      setIsExploding(true);

      // Check for players caught in the explosion - do this ONCE when explosion happens
      checkExplosionCollisions();

      // Remove the fixed timer for ending the explosion - we'll handle this based on scale/progress
    }, 800);

    return () => clearTimeout(explosionTimer);
  }, []);

  // Update position based on velocity and time
  useFrame(() => {
    if (!ref.current) return;

    // Handle explosion animation
    if (isExploding) {
      // Track progress from 0 to 1
      setExplosionProgress((prev) => {
        const newProgress = Math.min(prev + 0.025, 1);

        // If we've reached the end of the animation, make the bomb invisible
        if (newProgress >= 1 && ref.current) {
          ref.current.visible = false;
        }

        return newProgress;
      });

      // Increase scale but cap it at the maximum value
      setExplosionScale((prev) => {
        // The target scale follows a sine curve that peaks at the middle of the animation
        // and returns to 0 at the end
        const target =
          maxExplosionScale * Math.sin(explosionProgress * Math.PI);

        // Smooth interpolation towards the target
        return THREE.MathUtils.lerp(prev, target, 0.2);
      });

      // Calculate how close we are to peak scale (0 = start, 1 = peak, 0 = end)
      const scaleFactor = explosionScale / maxExplosionScale;
      // Calculate progress toward peak (0 to 1 during first half)
      const peakProgress = Math.min(1, explosionProgress * 2);

      // Calculate the current explosion radius in world units for debugging
      const currentExplosionRadius = explosionScale * 0.3; // 0.3 is the base geometry radius

      // For debugging - log the current explosion radius a few times
      if (
        explosionProgress < 0.1 ||
        (explosionProgress > 0.48 && explosionProgress < 0.52)
      ) {
        console.log(
          `[EXPLOSION] Current explosion radius: ${currentExplosionRadius.toFixed(
            2
          )}/${BOMB_EXPLOSION_RADIUS} units (scale: ${explosionScale.toFixed(
            2
          )})`
        );
      }

      // Get the explosion mesh
      const explosionMesh = ref.current.children[2];
      if (explosionMesh && explosionMesh.material) {
        // Fade the main explosion based on scale
        // More opaque at peak, fades out as scale decreases
        const opacity = Math.max(0, scaleFactor);
        explosionMesh.material.opacity = opacity;

        // Color transition from yellow to red as we approach peak
        const hue = Math.max(0, 0.16 - peakProgress * 0.16); // 0.16 (yellow) to 0 (red)
        explosionMesh.material.color.setHSL(hue, 1, 0.5);

        // Increase emissive intensity at the start, decrease as we reach peak
        explosionMesh.material.emissiveIntensity = Math.max(
          1,
          4 * (1 - peakProgress) + 1
        );
      }

      // Update particles
      particles.forEach((particle, i) => {
        // Get the particle mesh
        const particleMesh = ref.current.children[i + 3]; // Offset by 3 for the main meshes
        if (particleMesh) {
          // Update position
          particle.position.add(particle.velocity);
          particleMesh.position.copy(particle.position);

          // Scale particles with main explosion but slightly randomized
          // Make scale proportional to the main explosion scale
          const particleScale = explosionScale * (0.1 + Math.random() * 0.05);
          particleMesh.scale.set(particleScale, particleScale, particleScale);

          // Fade out particles based on both time and scale
          if (particleMesh.material) {
            // More opacity early in explosion, fade out as progress increases
            particle.opacity =
              Math.max(0, 1 - explosionProgress * 1.2) *
              (0.5 + scaleFactor * 0.5);
            particleMesh.material.opacity = particle.opacity;
          }
        }
      });

      return;
    }

    // Calculate time passed since firing (in seconds)
    const elapsedTime = (Date.now() - startTime.current) / 1000;

    // Add a small arc to the bomb trajectory
    const gravity = -9.8; // m/s^2
    const initialYVelocity = 5; // Initial upward velocity

    // Position based on physics equations:
    // p = p0 + v0*t + 0.5*a*t^2
    const newY =
      initialPosition.current.y +
      initialYVelocity * elapsedTime +
      0.5 * gravity * elapsedTime * elapsedTime;

    // Update position
    ref.current.position.x =
      initialPosition.current.x + velocityVector.current.x * elapsedTime;
    ref.current.position.y = Math.max(0.3, newY); // Don't go below ground level
    ref.current.position.z =
      initialPosition.current.z + velocityVector.current.z * elapsedTime;
  });

  return (
    <group
      ref={ref}
      position={[position.x || 0, position.y || 0.5, position.z || 0]}
    >
      {/* Bomb body */}
      <mesh visible={!isExploding}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshStandardMaterial color="black" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Bomb fuse */}
      <mesh visible={!isExploding} position={[0, 0.35, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.2, 8]} />
        <meshStandardMaterial color="gray" />
      </mesh>

      {/* Main explosion effect */}
      <mesh
        visible={isExploding}
        scale={[explosionScale, explosionScale, explosionScale]}
      >
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshStandardMaterial
          color="yellow"
          emissive="orange"
          emissiveIntensity={2}
          transparent={true}
          opacity={1}
        />
      </mesh>

      {/* Explosion particles */}
      {particles.map((particle, i) => (
        <mesh
          key={i}
          visible={isExploding}
          position={[
            particle.position.x,
            particle.position.y,
            particle.position.z,
          ]}
        >
          <sphereGeometry args={[particle.size, 8, 8]} />
          <meshBasicMaterial
            color={particle.color}
            transparent={true}
            opacity={particle.opacity}
          />
        </mesh>
      ))}
    </group>
  );
};

export default Bomb;
