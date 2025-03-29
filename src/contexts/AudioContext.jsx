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
  const [isMuted, setIsMuted] = useState(() => {
    const savedMuteState = localStorage.getItem("isMuted");
    return savedMuteState ? JSON.parse(savedMuteState) : false;
  });
  const [hasInteracted, setHasInteracted] = useState(false);
  const audioRef = useRef(null);
  const userMutedRef = useRef(isMuted);

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
    userMutedRef.current = isMuted;
    localStorage.setItem("isMuted", JSON.stringify(isMuted));
  }, [isMuted]);

  // Handle tab visibility changes
  useEffect(() => {
    function handleVisibilityChange() {
      if (audioRef.current) {
        if (document.hidden) {
          audioRef.current.muted = true;
        } else {
          audioRef.current.muted = userMutedRef.current;
        }
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

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
