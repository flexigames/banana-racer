import React, {
  forwardRef,
  useRef,
  useEffect,
  useImperativeHandle,
} from "react";
import { useThree } from "@react-three/fiber";
import { AudioListener } from "three";
import { useAudio } from "../contexts/AudioContext";

const DrivingSound = forwardRef(({ volume = 0.3, speed = 0 }, ref) => {
  const sound = useRef(null);
  const { isSoundEffectsMuted } = useAudio();
  const camera = useThree(({ camera }) => camera);

  const [listener] = React.useState(() => new AudioListener());
  const isPlaying = useRef(false);

  const oscillator = useRef(null);
  const noiseSource = useRef(null);
  const filter = useRef(null);
  const lfo = useRef(null);
  const lfoGain = useRef(null);

  useImperativeHandle(
    ref,
    () => ({
      updateFrequency: (s) => updateEngineParams(s),
    }),
    []
  );

  const updateEngineParams = (s) => {
    if (!isPlaying.current) return;

    const clampedSpeed = Math.max(0, Math.min(s, 7.5));
    const freq = 90 + (clampedSpeed / 7.5) * 360; // 90Hz → 450Hz
    const filterFreq = 800 + (clampedSpeed / 7.5) * 1200; // 800Hz → 2000Hz

    oscillator.current.frequency.setTargetAtTime(
      freq,
      oscillator.current.context.currentTime,
      0.05
    );
    filter.current.frequency.setTargetAtTime(
      filterFreq,
      oscillator.current.context.currentTime,
      0.05
    );
  };

  const startEngine = () => {
    const ctx = sound.current.context;

    // Noise
    const bufferSize = 2 * ctx.sampleRate;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    noiseSource.current = ctx.createBufferSource();
    noiseSource.current.buffer = noiseBuffer;
    noiseSource.current.loop = true;

    // Filter
    filter.current = ctx.createBiquadFilter();
    filter.current.type = "lowpass";
    filter.current.frequency.value = 800;

    // Oscillator
    oscillator.current = ctx.createOscillator();
    oscillator.current.type = "sawtooth";
    oscillator.current.frequency.value = 150;

    // LFO
    lfo.current = ctx.createOscillator();
    lfo.current.frequency.value = 8;
    lfoGain.current = ctx.createGain();
    lfoGain.current.gain.value = 5;
    lfo.current.connect(lfoGain.current).connect(oscillator.current.frequency);

    // Output Gain
    const outputGain = ctx.createGain();
    outputGain.gain.value = volume;

    // Routing
    noiseSource.current.connect(filter.current);
    oscillator.current.connect(outputGain);
    filter.current.connect(outputGain);
    outputGain.connect(sound.current.getOutput());

    // Start
    noiseSource.current.start();
    oscillator.current.start();
    lfo.current.start();

    isPlaying.current = true;
  };

  const stopEngine = () => {
    noiseSource.current?.stop();
    oscillator.current?.stop();
    lfo.current?.stop();
  };

  useEffect(() => {
    const _sound = sound.current;
    if (_sound && !isSoundEffectsMuted) {
      startEngine();
      isPlaying.current = true;
    }
    return () => {
      if (_sound) {
        stopEngine();
        if (_sound.isPlaying) _sound.stop();
      }
    };
  }, [isSoundEffectsMuted]);

  useEffect(() => {
    updateEngineParams(speed);
  }, [speed]);

  useEffect(() => {
    camera.add(listener);
    return () => {
      camera.remove(listener);
      if (isPlaying.current) stopEngine();
    };
  }, [camera, listener]);

  return <positionalAudio ref={sound} args={[listener]} position={[0, 0, 0]} />;
});

DrivingSound.displayName = "DrivingSound";

export default DrivingSound;
