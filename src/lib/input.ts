import { useEffect, MutableRefObject } from 'react';
import { CarMovement } from '../types';

/**
 * Hook to handle keyboard input for vehicle control
 * @param movementRef - Reference to movement state
 */
export const useVehicleControls = (movementRef: MutableRefObject<CarMovement>): void => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
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

    const handleKeyUp = (e: KeyboardEvent): void => {
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
}; 