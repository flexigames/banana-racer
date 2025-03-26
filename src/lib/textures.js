import * as THREE from "three";

function adjustColor(color, amount) {
  const hex = color.replace("#", "");
  const r = Math.max(
    0,
    Math.min(255, parseInt(hex.substring(0, 2), 16) + amount)
  );
  const g = Math.max(
    0,
    Math.min(255, parseInt(hex.substring(2, 4), 16) + amount)
  );
  const b = Math.max(
    0,
    Math.min(255, parseInt(hex.substring(4, 6), 16) + amount)
  );
  return `#${r.toString(16).padStart(2, "0")}${g
    .toString(16)
    .padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

function createBrickTexture(width = 2) {
  const textureLoader = new THREE.TextureLoader();
  const texture = textureLoader.load("/banana-racer/textures/green_wall.png");
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(width, 2);
  texture.encoding = THREE.sRGBEncoding;
  texture.colorSpace = "srgb";
  return texture;
}

function createWallTexture() {
  const textureLoader = new THREE.TextureLoader();
  const texture = textureLoader.load("/banana-racer/textures/green_wall.png");
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  texture.encoding = THREE.sRGBEncoding;
  texture.colorSpace = "srgb";
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
export const WALL_TEXTURE = createWallTexture();
export const GROUND_TEXTURE = createGroundTexture();

// Export functions for dynamic texture creation
export { createBrickTexture, adjustColor };
