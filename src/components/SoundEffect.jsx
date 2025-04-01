import React, {
  forwardRef,
  useRef,
  useEffect,
  useImperativeHandle,
} from "react";
import { useThree } from "@react-three/fiber";
import { AudioListener, AudioLoader } from "three";
import { useLoader } from "@react-three/fiber";
import { useAudio } from "../contexts/AudioContext";

const SoundEffect = forwardRef(
  (
    {
      name,
      distance = 1,
      volume = 1,
      playOnMount = false,
      playOnUnMount = false,
    },
    ref
  ) => {
    const sound = useRef(null);
    const { isSoundEffectsMuted } = useAudio();
    const camera = useThree(({ camera }) => camera);
    const [listener] = React.useState(() => new AudioListener());
    const buffer = useLoader(AudioLoader, `/sounds/${name}.wav`);

    useImperativeHandle(
      ref,
      () => ({
        play: () => {
          if (
            sound.current &&
            !sound.current.isPlaying &&
            !isSoundEffectsMuted
          ) {
            sound.current.setVolume(volume);
            sound.current.play();
          }
        },
        stop: () => {
          if (sound.current && sound.current.isPlaying) {
            sound.current.stop();
          }
        },
      }),
      [isSoundEffectsMuted, volume]
    );

    useEffect(() => {
      const _sound = sound.current;
      if (_sound) {
        _sound.setBuffer(buffer);
        _sound.setRefDistance(distance);
        _sound.setVolume(volume);
        if (playOnMount && !_sound.isPlaying && !isSoundEffectsMuted)
          _sound.play();
      }
    }, [buffer, distance, volume, playOnMount, isSoundEffectsMuted]);

    useEffect(() => {
      const _sound = sound.current;
      camera.add(listener);
      return () => {
        if (playOnUnMount && _sound && !isSoundEffectsMuted) {
          _sound.setVolume(volume);
          _sound.play();
        }

        if (_sound) {
          setTimeout(() => {
            camera.remove(listener);
            if (_sound.isPlaying) _sound.stop();
            if (_sound.source && _sound.source._connected) _sound.disconnect();
          }, 2000);
        }
      };
    }, [camera, listener, playOnUnMount, isSoundEffectsMuted, volume]);

    return <positionalAudio ref={sound} args={[listener]} />;
  }
);

SoundEffect.displayName = "SoundEffect";

export default SoundEffect;
