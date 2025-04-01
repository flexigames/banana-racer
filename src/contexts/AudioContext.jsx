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
  playSoundEffect: () => {},
  updateListenerPosition: () => {},
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
  console.log("isSoundEffectsMuted", isSoundEffectsMuted);
  const [hasInteracted, setHasInteracted] = useState(false);
  const audioRef = useRef(null);
  const userMusicMutedRef = useRef(isMusicMuted);
  const soundEffectsRef = useRef({});
  const webAudioContextRef = useRef(null);
  const listenerRef = useRef(null);
  const sourceNodesRef = useRef({});
  const pannerNodesRef = useRef({});

  useEffect(() => {
    audioRef.current = new Audio("/sounds/background.mp3");
    audioRef.current.loop = true;
    audioRef.current.volume = 0.15;

    webAudioContextRef.current = new (window.AudioContext ||
      window.webkitAudioContext)();
    listenerRef.current = webAudioContextRef.current.listener;

    soundEffectsRef.current = {
      explosion: new Audio("/sounds/explosion.wav"),
      pickup: new Audio("/sounds/pickup.wav"),
      use: new Audio("/sounds/use.wav"),
      itemHit: new Audio("/sounds/itemHit.wav"),
      spinout: new Audio("/sounds/spinout.wav"),
    };
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

  function playSoundEffect(effectName, position = null) {
    console.log("playSoundEffect", effectName);
    if (isSoundEffectsMuted || !soundEffectsRef.current[effectName]) return;
    console.log("isSoundEffectsMuted", isSoundEffectsMuted);

    const sound = soundEffectsRef.current[effectName];
    sound.currentTime = 0;

    if (position && webAudioContextRef.current) {
      const listenerPos = {
        x: webAudioContextRef.current.listener.positionX.value,
        y: webAudioContextRef.current.listener.positionY.value,
        z: webAudioContextRef.current.listener.positionZ.value,
      };

      const distance = Math.sqrt(
        Math.pow(position.x - listenerPos.x, 2) +
          Math.pow(position.y - listenerPos.y, 2) +
          Math.pow(position.z - listenerPos.z, 2)
      );

      const maxDistance = 50;
      const minDistance = 5;
      const volume = Math.max(
        0,
        Math.min(1, 1 - (distance - minDistance) / (maxDistance - minDistance))
      );
      sound.volume = volume;
    }

    sound.play().catch((error) => {
      console.error("Error playing sound effect:", error);
    });
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
      Object.values(soundEffectsRef.current).forEach((sound) => {
        sound.pause();
        sound.currentTime = 0;
      });

      Object.values(sourceNodesRef.current).forEach((source) => {
        source.disconnect();
      });
      Object.values(pannerNodesRef.current).forEach((panner) => {
        panner.disconnect();
      });

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
        playSoundEffect,
        updateListenerPosition,
      }}
    >
      {children}
    </AudioContext.Provider>
  );
};

export default AudioProvider;
