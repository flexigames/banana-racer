import { useEffect, useRef } from 'react';

/**
 * Hook to handle keyboard and joystick input for vehicle control
 * @param {Object} movementRef - Reference to movement state
 */
export const useVehicleControls = (movementRef) => {
  const joystickInput = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleKeyDown = (e) => {
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          // Forward is positive
          movementRef.current.forward = 1;
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          // Backward is negative
          movementRef.current.forward = -1;
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          // Left is positive (swapped)
          movementRef.current.turn = 1;
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          // Right is negative (swapped)
          movementRef.current.turn = -1;
          break;
        case ' ':
          // Space for handbrake
          movementRef.current.handbrake = true;
          break;
      }
    };

    const handleKeyUp = (e) => {
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
        case 'ArrowDown':
        case 's':
        case 'S':
          movementRef.current.forward = 0;
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
        case 'ArrowRight':
        case 'd':
        case 'D':
          movementRef.current.turn = 0;
          break;
        case ' ':
          movementRef.current.handbrake = false;
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [movementRef]);

  // Function to update movement based on joystick input
  const updateJoystickInput = (x, y) => {
    joystickInput.current = { x, y };
    movementRef.current.forward = y;
    movementRef.current.turn = x;
  };

  return { updateJoystickInput };
}; 