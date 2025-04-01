import React from "react";

function GameOver() {

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000,
        color: "white",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <h1 style={{ fontSize: "3rem", marginBottom: "2rem" }}>Game Over</h1>
      <button
        onClick={respawn}
        style={{
          padding: "1rem 2rem",
          fontSize: "1.5rem",
          backgroundColor: "#4CAF50",
          color: "white",
          border: "none",
          borderRadius: "5px",
          cursor: "pointer",
          transition: "background-color 0.3s",
        }}
        onMouseOver={(e) => (e.target.style.backgroundColor = "#45a049")}
        onMouseOut={(e) => (e.target.style.backgroundColor = "#4CAF50")}
      >
        Respawn
      </button>
    </div>
  );

  function respawn() {
    window.location.reload();
  }
}

export default GameOver;
