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
  { position: [-1.25, 0, 10], rotation: Math.PI / 2, scale: [3, 2, 12] },
]; 