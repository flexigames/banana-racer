import React, { useRef } from "react";
import { useTexture } from "@react-three/drei";
import { Decal } from "@react-three/drei";
import * as THREE from "three";

function TireMark({ position, rotation, scale = [0.5, 0.5, 0.5] }) {
  const texture = useTexture("/icons/icon-banana.png");
  const materialRef = useRef();

  return (
    <Decal
      position={position}
      rotation={rotation}
      scale={scale}
      map={texture}
      depthTest={true}
      depthWrite={false}
      polygonOffset={true}
      polygonOffsetFactor={-4}
      transparent={true}
      opacity={0.5}
    />
  );
}

export default TireMark;
