import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
} from "react";

const AudioContext = createContext({
  isMusicMuted: false,
  isSoundEffectsMuted: false,
  toggleMusicMute: () => {},
  toggleSoundEffectsMute: () => {},
  updateListenerPosition: () => {},
  hasInteracted: false,
});

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error("useAudio must be used within an AudioProvider");
  }
  return context;
};

export const AudioProvider = ({ children }) => {
  const [isMusicMuted, setIsMusicMuted] = useState(() => {
    const savedMuteState = localStorage.getItem("isMusicMuted");
    return savedMuteState ? JSON.parse(savedMuteState) : false;
  });
  const [isSoundEffectsMuted, setIsSoundEffectsMuted] = useState(() => {
    const savedMuteState = localStorage.getItem("isSoundEffectsMuted");
    return savedMuteState ? JSON.parse(savedMuteState) : false;
  });
  const [hasInteracted, setHasInteracted] = useState(false);
  const audioRef = useRef(null);
  const userMusicMutedRef = useRef(isMusicMuted);
  const webAudioContextRef = useRef(null);
  const listenerRef = useRef(null);

  useEffect(() => {
    audioRef.current = new Audio("/sounds/background.mp3");
    audioRef.current.loop = true;
    audioRef.current.volume = 0.15;

    webAudioContextRef.current = new (window.AudioContext ||
      window.webkitAudioContext)();
    listenerRef.current = webAudioContextRef.current.listener;
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = isMusicMuted;
    }
    if (webAudioContextRef.current) {
      if (isSoundEffectsMuted) {
        webAudioContextRef.current.suspend();
      } else {
        webAudioContextRef.current.resume();
      }
    }
    userMusicMutedRef.current = isMusicMuted;
    localStorage.setItem("isMusicMuted", JSON.stringify(isMusicMuted));
    localStorage.setItem(
      "isSoundEffectsMuted",
      JSON.stringify(isSoundEffectsMuted)
    );
  }, [isMusicMuted, isSoundEffectsMuted]);

  useEffect(() => {
    function handleVisibilityChange() {
      if (audioRef.current) {
        if (document.hidden) {
          audioRef.current.muted = true;
        } else {
          audioRef.current.muted = userMusicMutedRef.current;
        }
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  function handleInteraction() {
    if (!hasInteracted && audioRef.current) {
      audioRef.current.play().catch((error) => {
        console.error("Error playing audio:", error);
      });
      setHasInteracted(true);
    }
  }

  function updateListenerPosition(position, forward, up) {
    if (!listenerRef.current) return;

    listenerRef.current.setPosition(position.x, position.y, position.z);
    listenerRef.current.setOrientation(
      forward.x,
      forward.y,
      forward.z,
      up.x,
      up.y,
      up.z
    );
  }

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      if (webAudioContextRef.current) {
        webAudioContextRef.current.close();
      }
    };
  }, []);

  function toggleMusicMute() {
    setIsMusicMuted((prev) => !prev);
  }

  function toggleSoundEffectsMute() {
    setIsSoundEffectsMuted((prev) => !prev);
  }

  return (
    <AudioContext.Provider
      value={{
        isMusicMuted,
        isSoundEffectsMuted,
        toggleMusicMute,
        toggleSoundEffectsMute,
        handleInteraction,
        updateListenerPosition,
        hasInteracted,
      }}
    >
      {children}
    </AudioContext.Provider>
  );
};

export default AudioProvider;
