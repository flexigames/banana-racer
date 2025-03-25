export const ARENA_SIZE = 61;
export const ARENA_HALF_SIZE = ARENA_SIZE / 2;

export const DEFAULT_HEIGHT = 0.1;

export const BATTLE_BLOCKS = {
  size: 16,
  offset: ARENA_SIZE / 4,
  positions: [
    // Top-left block
    { x: -ARENA_SIZE / 4, y: 0, z: -ARENA_SIZE / 4 },
    // Top-right block
    { x: ARENA_SIZE / 4, y: 0, z: -ARENA_SIZE / 4 },
    // Bottom-left block
    { x: -ARENA_SIZE / 4, y: 0, z: ARENA_SIZE / 4 },
    // Bottom-right block
    { x: ARENA_SIZE / 4, y: 0, z: ARENA_SIZE / 4 },
  ],
};

export const RAMPS = [
  { position: [-10, 0, 0], rotation: Math.PI / 2, scale: [6, 1.5, 12] },
  { position: [10, 0, 0], rotation: -Math.PI / 2, scale: [6, 1.5, 12] },
  { position: [0, 0, 15], rotation: Math.PI, scale: [6, 1.5, 12] },
  { position: [0, 0, -15], rotation: 0, scale: [6, 1.5, 12] },
]; 