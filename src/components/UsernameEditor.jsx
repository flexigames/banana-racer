import React, { useState } from "react";
import { useMultiplayer } from "../contexts/MultiplayerContext";

export function UsernameEditor({ playerId }) {
  const { players, playerId: currentPlayerId, changeName } = useMultiplayer();
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState("");

  const player = players[playerId];
  if (!player) return null;

  const isCurrentPlayer = playerId === currentPlayerId;

  function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!newName.trim()) {
      setError("Username cannot be empty");
      return;
    }

    if (newName.length > 30) {
      setError("Username must be 30 characters or less");
      return;
    }

    changeName(newName);
    setIsEditing(false);
  }

  if (!isCurrentPlayer) {
    return <span>{player.name}</span>;
  }

  if (!isEditing) {
    return (
      <span
        onClick={() => {
          setNewName(player.name);
          setIsEditing(true);
        }}
        style={{ cursor: "pointer" }}
      >
        {player.name}
        <span style={{ marginLeft: "4px", opacity: 0.7 }}>✏️</span>
      </span>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "inline" }}>
      <input
        type="text"
        value={newName}
        onChange={(e) => setNewName(e.target.value)}
        autoFocus
        onBlur={() => setIsEditing(false)}
        style={{
          background: "transparent",
          border: "none",
          borderBottom: "1px solid currentColor",
          padding: "0",
          margin: "0",
          font: "inherit",
          color: "inherit",
          width: `${newName.length}ch`,
        }}
      />
      {error && <div style={{ color: "red", fontSize: "0.8em" }}>{error}</div>}
    </form>
  );
} 