import * as THREE from "three";
import { shaderMaterial } from "@react-three/drei";
import { extend } from "@react-three/fiber";

const vertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  uniform float time;
  uniform vec3 color;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;

  // Function to create sparkle effect
  float sparkle(vec2 uv, float t) {
    float x = uv.x * 10.0;
    float y = uv.y * 10.0;
    float sparkle = sin(x * 10.0 + t) * cos(y * 10.0 + t) * 0.5 + 0.5;
    return sparkle * sparkle;
  }

  void main() {
    // Base glow effect
    float baseGlow = sin(time * 2.0) * 0.3 + 0.7;
    
    // Sparkle effect
    float sparkleEffect = sparkle(vUv, time * 3.0);
    
    // Normal-based highlight
    float normalHighlight = pow(max(dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0), 2.0);
    
    // Combine effects
    float glow = mix(baseGlow, 1.0, sparkleEffect * 0.5);
    glow = mix(glow, 1.0, normalHighlight * 0.3);
    
    // Create pulsing effect
    float pulse = sin(time * 4.0) * 0.2 + 0.8;
    
    // Final color with enhanced glow
    vec3 finalColor = mix(color, vec3(1.0), glow * pulse);
    
    // Add some color variation
    finalColor = mix(finalColor, vec3(1.0, 1.0, 0.8), sparkleEffect * 0.3);
    
    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

export const StarMaterial = shaderMaterial(
  {
    time: 0,
    color: [1, 1, 0],
  },
  vertexShader,
  fragmentShader
);

export function createStarMaterial(color = [1, 1, 0]) {
  return new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      color: { value: new THREE.Color(...color) },
    },
    vertexShader,
    fragmentShader,
    transparent: true,
  });
}

extend({ StarMaterial }); 