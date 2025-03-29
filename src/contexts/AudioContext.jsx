import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
} from "react";

const AudioContext = createContext({
  isMuted: false,
  toggleMute: () => {},
});

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error("useAudio must be used within an AudioProvider");
  }
  return context;
};

export const AudioProvider = ({ children }) => {
  const [isMuted, setIsMuted] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const audioRef = useRef(null);

  // Initialize audio
  useEffect(() => {
    audioRef.current = new Audio("/sounds/background.mp3");
    audioRef.current.loop = true;
    audioRef.current.volume = 0.2;
  }, []);

  // Handle mute state changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = isMuted;
    }
  }, [isMuted]);

  // Handle user interaction
  const handleInteraction = () => {
    if (!hasInteracted && audioRef.current) {
      audioRef.current.play().catch((error) => {
        console.error("Error playing audio:", error);
      });
      setHasInteracted(true);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const toggleMute = () => {
    setIsMuted((prev) => !prev);
  };

  return (
    <AudioContext.Provider value={{ isMuted, toggleMute, handleInteraction }}>
      {children}
    </AudioContext.Provider>
  );
};

export default AudioProvider;
