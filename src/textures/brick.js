import * as THREE from "three";

export function createBrickTexture(baseColor) {
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

      const brickX =
        ((x * brickWidth + rowOffset) % canvas.width) + mortarThickness;
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

// Helper function to adjust color brightness
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
