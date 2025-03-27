import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

function WebcamTexture() {
  const videoRef = useRef();
  const textureRef = useRef();
  const materialRef = useRef();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function setupWebcam() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        const video = document.createElement('video');
        video.srcObject = stream;
        video.playsInline = true;
        video.muted = true;
        
        // Wait for video to be ready
        await new Promise((resolve) => {
          video.onloadedmetadata = () => {
            video.play().then(resolve);
          };
        });

        const texture = new THREE.VideoTexture(video);
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.format = THREE.RGBAFormat;
        texture.flipY = true;
        texture.generateMipmaps = false;
        
        textureRef.current = texture;
        videoRef.current = video;
        setIsReady(true);
      } catch (error) {
        console.error('Error accessing webcam:', error);
      }
    }

    setupWebcam();

    return () => {
      if (videoRef.current?.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, []);

  useFrame(() => {
    if (textureRef.current && isReady) {
      textureRef.current.needsUpdate = true;
    }
  });

  if (!isReady) return null;

  return (
    <mesh position={[0, 0.5, 0]} rotation={[0, Math.PI, 0]}>
      <planeGeometry args={[0.8, 0.6]} />
      <meshBasicMaterial 
        ref={materialRef}
        map={textureRef.current} 
        transparent 
        opacity={0.8}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

export default WebcamTexture; 