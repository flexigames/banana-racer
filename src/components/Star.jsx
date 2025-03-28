import { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { StarMaterial } from "../shaders/star";
import React from "react";

export function Star({ children, isStarred }) {
  const materialRef = useRef();
  const timeRef = useRef(0);
  const opacityRef = useRef(1);

  useEffect(() => {
    if (!isStarred) {
      opacityRef.current = 0;
    } else {
      opacityRef.current = 1;
    }
  }, [isStarred]);

  useFrame((state, delta) => {
    if (materialRef.current) {
      timeRef.current += delta;
      materialRef.current.time = timeRef.current;
      materialRef.current.opacity = opacityRef.current;
    }
  });

  if (!isStarred && opacityRef.current <= 0) return children;

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