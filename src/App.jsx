import React, { useEffect } from "react";
import CarGame from "./components/CarGame";
import { useMultiplayer } from "./contexts/MultiplayerContext";
import { hexToHsl } from "./lib/color";

function App() {
  const { changeName, changeColor } = useMultiplayer();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const username = params.get("username");
    const color = params.get("color");

    if (username) {
      changeName(username);
    }

    if (color) {
      changeColor(hexToHsl(color));
    }
  }, [changeName, changeColor]);

  return (
    <div>
      <CarGame />
    </div>
  );
}

export default App;
