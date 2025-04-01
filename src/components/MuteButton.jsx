import React from "react";
import { useAudio } from "../contexts/AudioContext";

function SoundEffectsMuteButton() {
  const { isSoundEffectsMuted, toggleSoundEffectsMute } = useAudio();

  return (
    <div
      onClick={toggleSoundEffectsMute}
      title="Mute Sound Effects"
      style={{
        width: "40px",
        height: "40px",
        borderRadius: "50%",
        border: "none",
        backgroundColor: isSoundEffectsMuted
          ? "rgba(255, 0, 0, 0.732)"
          : "rgba(0,0,0,0.7)",
        color: "white",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "20px",
        outline: "none",
        pointerEvents: "auto",
        transition: "background-color 0.2s ease",
      }}
    >
      {isSoundEffectsMuted ? "🔇" : "🔊"}
    </div>
  );
}

function MusicMuteButton() {
  const { isMusicMuted, toggleMusicMute } = useAudio();

  return (
    <div
      onClick={toggleMusicMute}
      title="Mute Music"
      style={{
        width: "40px",
        height: "40px",
        borderRadius: "50%",
        border: "none",
        backgroundColor: isMusicMuted
          ? "rgba(255, 0, 0, 0.732)"
          : "rgba(0,0,0,0.7)",
        color: "white",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "20px",
        outline: "none",
        pointerEvents: "auto",
        transition: "background-color 0.2s ease",
      }}
    >
      ♬
    </div>
  );
}

export function MuteButtons() {
  return (
    <div
      style={{
        position: "absolute",
        top: "50px",
        left: "20px",
        display: "flex",
        gap: "10px",
        zIndex: 1000,
      }}
    >
      <SoundEffectsMuteButton />
      <MusicMuteButton />
    </div>
  );
}
