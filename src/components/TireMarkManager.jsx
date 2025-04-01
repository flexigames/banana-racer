import React, { useRef, useState, useEffect } from "react";
import * as THREE from "three";
import TireMark from "./TireMark";

function TireMarkManager({ carRef, movement }) {
  const [tireMarks, setTireMarks] = useState([]);
  const lastMarkTime = useRef(0);
  const markIdCounter = useRef(0);

  useEffect(() => {
    if (!carRef.current) return;

    const createTireMark = () => {
      const car = carRef.current;
      if (!car) return;

      const position = [
        car.position.x,
        0.01, // Slightly above ground to prevent z-fighting
        car.position.z,
      ];

      const rotation = [
        -Math.PI / 2, // Rotate to face up
        0,
        car.rotation.y,
      ];

      setTireMarks((prev) => [
        ...prev,
        {
          id: markIdCounter.current++,
          position,
          rotation,
        },
      ]);
    };

    const currentTime = Date.now();
    const timeSinceLastMark = currentTime - lastMarkTime.current;

    // Create tire marks based on speed and turning
    if (Math.abs(movement.speed) > 0.5) {
      const markInterval = Math.max(100, 500 - Math.abs(movement.speed) * 50);
      if (timeSinceLastMark > markInterval) {
        createTireMark();
        lastMarkTime.current = currentTime;
      }
    }

    // Clean up old tire marks
    const cleanupInterval = 5000; // 5 seconds
    setTireMarks((prev) =>
      prev.filter((mark) => currentTime - mark.id < cleanupInterval)
    );
  }, [carRef, movement.speed, movement.turn]);

  return (
    <>
      {tireMarks.map((mark) => (
        <TireMark
          key={mark.id}
          position={mark.position}
          rotation={mark.rotation}
        />
      ))}
    </>
  );
}

export default TireMarkManager;
