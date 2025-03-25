import { useEffect, useRef } from "react";
import { createEngineSound } from "./sound";

export function useEngineSound(speed, maxSpeed = 7.5) {
  const engineSound = useRef(null);

  useEffect(() => {
    engineSound.current = createEngineSound();

    // Initialize and start the sound on first user interaction
    const handleInteraction = async () => {
      if (engineSound.current) {
        await engineSound.current.start();
        // update speed
        engineSound.current.update(0.5 + speed, maxSpeed + 0.5);
        // Remove the event listener after first interaction
        document.removeEventListener("keydown", handleInteraction);
        document.removeEventListener("mousedown", handleInteraction);
        document.removeEventListener("touchstart", handleInteraction);
      }
    };

    document.addEventListener("keydown", handleInteraction);
    document.addEventListener("mousedown", handleInteraction);
    document.addEventListener("touchstart", handleInteraction);

    return () => {
      if (engineSound.current) {
        engineSound.current.stop();
      }
      document.removeEventListener("keydown", handleInteraction);
      document.removeEventListener("mousedown", handleInteraction);
      document.removeEventListener("touchstart", handleInteraction);
    };
  }, []);

  useEffect(() => {
    if (engineSound.current) {
      engineSound.current.update(0.5 + speed, maxSpeed + 0.5);
    }
  }, [speed, maxSpeed]);
}
