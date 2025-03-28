import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { StarMaterial } from "../shaders/star";
import React from "react";

export function Star({ children, isStarred }) {
  const materialRef = useRef();
  const timeRef = useRef(0);

  useFrame((state, delta) => {
    if (materialRef.current) {
      timeRef.current += delta;
      materialRef.current.time = timeRef.current;
    }
  });

  if (!isStarred) return children;

  return (
    <group>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, {
            material: <starMaterial ref={materialRef} color={[1, 1, 0]} transparent />,
          });
        }
        return child;
      })}
    </group>
  );
} 