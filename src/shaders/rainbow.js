export const rainbowVertexShader = `
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

export const rainbowFragmentShader = `
  uniform float time;
  uniform sampler2D texture1;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;

  vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
  }

  void main() {
    vec4 texColor = texture2D(texture1, vUv);
    
    // Create a moving pattern based on position and time
    float pattern = sin(vPosition.x * 2.0 + time) * 
                   cos(vPosition.y * 2.0 + time * 0.7) * 
                   sin(vPosition.z * 2.0 + time * 0.5);
    
    // Create bright rainbow colors
    float hue = fract(time * 0.3 + pattern * 0.5);
    vec3 rainbowColor = hsv2rgb(vec3(hue, 1.0, 1.0)); // Full saturation and brightness
    
    // Calculate opacity based on pattern and texture
    float baseOpacity = texColor.a * 0.4; // Base transparency
    float rainbowOpacity = abs(pattern) * 0.7; // Increased rainbow effect intensity
    float finalOpacity = mix(baseOpacity, 0.6, rainbowOpacity); // Slightly increased max opacity
    
    // Blend the texture with the rainbow effect
    vec3 finalColor = mix(texColor.rgb, rainbowColor, rainbowOpacity);
    
    // Brighten the final color
    finalColor = mix(finalColor, vec3(1.0), 0.3);
    
    gl_FragColor = vec4(finalColor, finalOpacity);
  }
`; 