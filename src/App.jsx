import React, { useEffect } from "react";
import CarGame from "./components/CarGame";

function App() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const portalRef = params.get("ref");
    if (portalRef) {
      window.portalRef = portalRef;
    }
  }, []);

  return (
    <div>
      <CarGame />
    </div>
  );
}

export default App;
