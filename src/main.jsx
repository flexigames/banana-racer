import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import MultiplayerProvider from './contexts/MultiplayerContext';
import AudioProvider from './contexts/AudioContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AudioProvider>
      <MultiplayerProvider>
        <App />
      </MultiplayerProvider>
    </AudioProvider>
  </React.StrictMode>
); 