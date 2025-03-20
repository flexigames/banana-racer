import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import MultiplayerProvider from './contexts/MultiplayerContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <MultiplayerProvider>
      <App />
    </MultiplayerProvider>
  </React.StrictMode>
); 