import * as THREE from "three";

// Simple colored materials for blocks
const blockMaterials = {
  gray: new THREE.MeshStandardMaterial({ color: 0x808080, roughness: 0.7, metalness: 0.2 }),
  red: new THREE.MeshStandardMaterial({ color: 0xff0000, roughness: 0.7, metalness: 0.2 }),
  green: new THREE.MeshStandardMaterial({ color: 0x00ff00, roughness: 0.7, metalness: 0.2 }),
  blue: new THREE.MeshStandardMaterial({ color: 0x0000ff, roughness: 0.7, metalness: 0.2 }),
  yellow: new THREE.MeshStandardMaterial({ color: 0xffff00, roughness: 0.7, metalness: 0.2 })
};

// Cache for loaded textures
const textureCache = new Map();

export function getBlockMaterial(color) {
  return blockMaterials[color] || blockMaterials.gray;
}

export function createWallTexture(color) {
  const cacheKey = `wall_${color}`;
  if (textureCache.has(cacheKey)) {
    return textureCache.get(cacheKey);
  }

  const textureLoader = new THREE.TextureLoader();
  const texture = textureLoader.load(color ? `/banana-racer/textures/wall_${color}.png` : `/banana-racer/textures/wall.png`);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  texture.encoding = THREE.sRGBEncoding;
  texture.colorSpace = "srgb";
  
  textureCache.set(cacheKey, texture);
  return texture;
}

function createSkyboxTexture() {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const size = 2048;
  canvas.width = size;
  canvas.height = size / 2;

  // Create gradient with distinct steps
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0.4, "#004080");
  gradient.addColorStop(0.42, "#0066cc");
  gradient.addColorStop(0.44, "#1e90ff");
  gradient.addColorStop(0.48, "#87ceeb");
  gradient.addColorStop(0.5, "#b0e0e6");
  gradient.addColorStop(0.55, "#fff5c2");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, canvas.height);

  // Add cloud layers
  const addCloudLayer = (opacity, count, sizeRange) => {
    ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
    ctx.shadowColor = "rgba(255, 255, 255, 0.3)";
    ctx.shadowBlur = 15;

    for (let i = 0; i < count; i++) {
      const x = Math.random() * size;
      const y = Math.random() * (canvas.height * 0.5);
      const baseRadius =
        sizeRange[0] + Math.random() * (sizeRange[1] - sizeRange[0]);

      for (let j = 0; j < 5; j++) {
        const angle = (j / 5) * Math.PI;
        const distance = baseRadius * (0.3 + Math.random() * 0.7);
        const cloudX = x + Math.cos(angle) * distance;
        const cloudY = y + Math.sin(angle) * distance * 0.5;
        const radius = baseRadius * (0.2 + Math.random() * 0.3);

        const cloudGradient = ctx.createRadialGradient(
          cloudX,
          cloudY,
          0,
          cloudX,
          cloudY,
          radius
        );
        cloudGradient.addColorStop(0, `rgba(255, 255, 255, ${opacity})`);
        cloudGradient.addColorStop(1, "rgba(255, 255, 255, 0)");

        ctx.fillStyle = cloudGradient;
        ctx.beginPath();
        ctx.arc(cloudX, cloudY, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  };

  addCloudLayer(0.08, 8, [60, 80]);
  addCloudLayer(0.1, 6, [40, 60]);
  addCloudLayer(0.12, 4, [30, 45]);

  const texture = new THREE.CanvasTexture(canvas);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  return texture;
}

function createGroundTexture() {
  const textureLoader = new THREE.TextureLoader();
  const texture = textureLoader.load("/banana-racer/textures/floor.png");
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.encoding = THREE.sRGBEncoding;
  texture.colorSpace = "srgb";
  return texture;
}

// Block colors
export const BLOCK_COLORS = [
  "#00FFFF", // Cyan
  "#FFD700", // Gold
  "#00FF00", // Lime Green
  "#FF1493", // Deep Pink
];

// Create and export constant textures
export const SKYBOX_TEXTURE = createSkyboxTexture();
export const GROUND_TEXTURE = createGroundTexture();

// Preload textures in the background
export function preloadTextures() {
  const colors = ['red', 'green', 'blue', 'yellow', 'gray'];
  colors.forEach(color => {
    createWallTexture(color);
  });
}
