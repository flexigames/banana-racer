export const ARENA_SIZE: number;
export const ARENA_HALF_SIZE: number;

export interface BattleBlockPosition {
  x: number;
  y: number;
  z: number;
}

export interface BattleBlocks {
  size: number;
  offset: number;
  positions: BattleBlockPosition[];
}

export const BATTLE_BLOCKS: BattleBlocks; 