import React from 'react';
import CarGame from './components/CarGame';
import MultiplayerProvider from './contexts/MultiplayerContext';

const App = () => {
  return (
    <div>
      <MultiplayerProvider>
        <CarGame />
      </MultiplayerProvider>
    </div>
  );
};

export default App; 