import React from "react";
import { useMultiplayer } from "../contexts/MultiplayerContext";

export function PlayerCountBadge() {
  const { players } = useMultiplayer();
  const activePlayers = Object.values(players).filter(player => player.lives > 0).length;

  return (
    <div
      style={{
        position: "absolute",
        top: 150,
        right: 20,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        padding: "6px 12px",
        borderRadius: "16px",
        display: "flex",
        alignItems: "center",
        gap: "8px",
        color: "white",
        fontSize: "20px",
      }}
    >
      <div
        style={{
          width: "16px",
          height: "16px",
          backgroundColor: "#4CAF50",
          borderRadius: "50%",
        }}
      />
      {activePlayers} Racers
    </div>
  );
} 