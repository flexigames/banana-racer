import * as THREE from "three";

function adjustColor(color, amount) {
  const hex = color.replace("#", "");
  const r = Math.max(0, Math.min(255, parseInt(hex.substring(0, 2), 16) + amount));
  const g = Math.max(0, Math.min(255, parseInt(hex.substring(2, 4), 16) + amount));
  const b = Math.max(0, Math.min(255, parseInt(hex.substring(4, 6), 16) + amount));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

function createBrickTexture(baseColor) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const brickWidth = 200;
  const brickHeight = 150;
  const mortarThickness = 9;
  const numBricksX = 2;
  const numBricksY = 2;

  canvas.width = brickWidth * numBricksX;
  canvas.height = brickHeight * numBricksY;

  // Draw background (mortar color)
  ctx.fillStyle = "#808080";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw brick pattern with multiple offsets
  ctx.fillStyle = baseColor;

  for (let y = 0; y < numBricksY; y++) {
    const rowOffset = (y % 3) * (brickWidth / 3);

    for (let x = -1; x < numBricksX + 1; x++) {
      ctx.fillRect(
        ((x * brickWidth + rowOffset) % canvas.width) + mortarThickness,
        y * brickHeight + mortarThickness,
        brickWidth - mortarThickness * 2,
        brickHeight - mortarThickness * 2
      );

      const brickX = ((x * brickWidth + rowOffset) % canvas.width) + mortarThickness;
      const brickY = y * brickHeight + mortarThickness;

      // Add shading to create depth
      const gradient = ctx.createLinearGradient(
        brickX,
        brickY,
        brickX,
        brickY + brickHeight - mortarThickness * 2
      );
      gradient.addColorStop(0, adjustColor(baseColor, 20));
      gradient.addColorStop(1, adjustColor(baseColor, -20));
      ctx.fillStyle = gradient;
      ctx.fillRect(
        brickX,
        brickY,
        brickWidth - mortarThickness * 2,
        brickHeight - mortarThickness * 2
      );

      // Add highlight line
      ctx.strokeStyle = adjustColor(baseColor, 30);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(brickX + 2, brickY + 2);
      ctx.lineTo(brickX + brickWidth - mortarThickness * 2 - 2, brickY + 2);
      ctx.stroke();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(6, 6);

  return texture;
}

function createWallTexture() {
  const texture = createBrickTexture("#A0A0A0");
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

function createWoodTexture() {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const size = 256;
  canvas.width = size;
  canvas.height = size;

  // Base color
  ctx.fillStyle = "#B27D51";
  ctx.fillRect(0, 0, size, size);

  // Add wood grain
  for (let i = 0; i < 24; i++) {
    const y = i * (size / 24);
    const width = 2 + Math.random() * 3;
    const colorShift = -15 + Math.random() * 30;
    
    // Create darker grain lines
    ctx.fillStyle = adjustColor("#B27D51", colorShift);
    ctx.fillRect(0, y, size, width);
  }

  // Add some noise for texture
  for (let i = 0; i < 1000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const brightness = -10 + Math.random() * 20;
    
    ctx.fillStyle = adjustColor("#B27D51", brightness);
    ctx.fillRect(x, y, 1, 1);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
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
    ctx.shadowColor = 'rgba(255, 255, 255, 0.3)';
    ctx.shadowBlur = 15;
    
    for (let i = 0; i < count; i++) {
      const x = Math.random() * size;
      const y = Math.random() * (canvas.height * 0.5);
      const baseRadius = sizeRange[0] + Math.random() * (sizeRange[1] - sizeRange[0]);
      
      for (let j = 0; j < 5; j++) {
        const angle = (j / 5) * Math.PI;
        const distance = baseRadius * (0.3 + Math.random() * 0.7);
        const cloudX = x + Math.cos(angle) * distance;
        const cloudY = y + Math.sin(angle) * distance * 0.5;
        const radius = baseRadius * (0.2 + Math.random() * 0.3);
        
        const cloudGradient = ctx.createRadialGradient(
          cloudX, cloudY, 0,
          cloudX, cloudY, radius
        );
        cloudGradient.addColorStop(0, `rgba(255, 255, 255, ${opacity})`);
        cloudGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
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
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const tileSize = 64;
  canvas.width = tileSize;
  canvas.height = tileSize;

  // Draw tile pattern
  ctx.fillStyle = "#A9A9A9";
  ctx.fillRect(0, 0, tileSize, tileSize);

  // Draw tile lines
  ctx.strokeStyle = "#808080";
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, tileSize, tileSize);
  ctx.strokeRect(tileSize / 2, 0, tileSize / 2, tileSize);
  ctx.strokeRect(0, tileSize / 2, tileSize, tileSize / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

// Block colors
export const BLOCK_COLORS = [
  "#00FFFF", // Cyan
  "#FFD700", // Gold
  "#00FF00", // Lime Green
  "#FF1493", // Deep Pink
];

// Pre-generate brick textures for each block color
export const BLOCK_TEXTURES = BLOCK_COLORS.map(color => createBrickTexture(color));

// Create and export constant textures
export const SKYBOX_TEXTURE = createSkyboxTexture();
export const WALL_TEXTURE = createWallTexture();
export const WOOD_TEXTURE = createWoodTexture();
export const GROUND_TEXTURE = createGroundTexture();

// Export functions for dynamic texture creation
export { createBrickTexture, adjustColor }; 