import React from "react";
import { Text } from "@react-three/drei";

function PortalText({ position, rotation = [0, 0, 0], text }) {
  return (
    <Text
      position={position}
      color="white"
      fontSize={0.8}
      rotation={rotation}
      anchorX="center"
      anchorY="middle"
      outlineWidth={0.04}
      outlineColor="darkorange"  
        >
      {text}
    </Text>
  );
}

export default PortalText;
