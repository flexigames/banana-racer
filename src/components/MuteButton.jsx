import React from "react";
import { useAudio } from "../contexts/AudioContext";

export function MuteButton() {
  const { isMuted, toggleMute } = useAudio();

  return (
    <div
      onClick={toggleMute}
      style={{
        position: "absolute",
        top: "50px",
        left: "20px",
        width: "40px",
        height: "40px",
        borderRadius: "50%",
        border: "none",
        backgroundColor: "rgba(0,0,0,0.7)",
        color: "white",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "20px",
        zIndex: 1000,
        outline: "none",
        pointerEvents: "auto",
      }}
    >
      {isMuted ? "🔇" : "🔊"}
    </div>
  );
}
