import * as THREE from "three";
import { shaderMaterial } from "@react-three/drei";
import { extend } from "@react-three/fiber";

export const starVertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vViewDir;
  
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vPosition = position;
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vViewDir = normalize(cameraPosition - worldPosition.xyz);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const starFragmentShader = `
  uniform float time;
  uniform sampler2D texture1;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vViewDir;

  vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
  }

  void main() {
    vec4 texColor = texture2D(texture1, vUv);
    
    // Create metallic yellow base color
    vec3 baseColor = vec3(1.0, 0.85, 0.2); // Warm metallic yellow
    float metallic = pow(max(dot(vNormal, vViewDir), 0.0), 4.0);
    vec3 metallicBase = mix(baseColor, vec3(1.0), metallic * 0.5);
    
    // Create a moving pattern based on position and time
    float pattern = sin(vPosition.x * 3.0 + time) * 
                   cos(vPosition.y * 3.0 + time * 0.7) * 
                   sin(vPosition.z * 3.0 + time * 0.5);
    
    // Create bright rainbow colors with higher frequency
    float hue = fract(time * 0.5 + pattern * 0.7);
    vec3 rainbowColor = hsv2rgb(vec3(hue, 1.0, 1.0));
    
    // Calculate reflection
    vec3 reflection = reflect(-vViewDir, vNormal);
    float reflectionIntensity = pow(max(dot(reflection, vViewDir), 0.0), 32.0);
    
    // Create sparkle effect
    float sparkle = pow(max(dot(vNormal, vViewDir), 0.0), 8.0);
    
    // Combine effects
    float rainbowIntensity = abs(pattern) * 0.6; // Reduced rainbow intensity
    float glowIntensity = reflectionIntensity * 0.6 + sparkle * 0.4;
    
    // Create final color with metallic base
    vec3 finalColor = mix(metallicBase, rainbowColor, rainbowIntensity);
    finalColor = mix(finalColor, vec3(1.0), glowIntensity * 0.7);
    
    // Add extra brightness to edges
    float edgeGlow = pow(1.0 - abs(dot(vNormal, vViewDir)), 2.0);
    finalColor += vec3(1.0) * edgeGlow * 0.3;
    
    // Ensure full opacity
    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

export const StarMaterial = shaderMaterial(
  {
    time: 0,
    color: [1, 1, 0],
  },
  starVertexShader,
  starFragmentShader
);

export function createStarMaterial(color = [1, 1, 0]) {
  return new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      color: { value: new THREE.Color(...color) },
    },
    vertexShader: starVertexShader,
    fragmentShader: starFragmentShader,
    transparent: true,
  });
}

extend({ StarMaterial }); 