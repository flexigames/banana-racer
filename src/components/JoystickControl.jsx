import React from 'react';
import { Joystick } from 'react-joystick-component';

const JoystickControl = ({ onMove }) => {
  const handleMove = (event) => {
    const { x, y } = event;
    onMove(x, y);
  };

  const handleStop = () => {
    onMove(0, 0);
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      left: '20px',
      zIndex: 1000,
      display: 'none', // Hidden by default
    }} className="mobile-only">
      <Joystick
        size={100}
        baseColor="#666666"
        stickColor="#333333"
        throttle={0.5}
        move={handleMove}
        stop={handleStop}
      />
    </div>
  );
};

export default JoystickControl; 