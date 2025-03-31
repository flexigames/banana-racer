// Define types for shared game configuration
export type Ramp = {
  position: [number, number, number];
  rotation: number;
  scale: [number, number, number];
};

export type RampsConfig = Ramp[];

export const ITEM_TYPES = {
  BANANA: "banana",
  BOOST: "boost",
  FAKE_CUBE: "fake_cube",
  GREEN_SHELL: "green_shell",
  STAR: "star",
  THREE_BANANAS: "three_bananas",
  THREE_GREEN_SHELLS: "three_green_shells",
  RED_SHELL: "red_shell",
  THREE_RED_SHELLS: "three_red_shells",
};

export type Color = {
  h: number;
  s: number;
  l: number;
};

export type Position = {
  x: number;
  y: number;
  z: number;
};

export type Item = {
  type: string;
  quantity: number;
};

export type GreenShell = {
  id: string;
  position: Position;
  rotation: number;
  direction: number;
  speed: number;
  droppedBy: string;
  droppedAt: number;
  verticalVelocity?: number;
  canHitOwner: boolean;
};

export type RedShell = {
  id: string;
  position: Position;
  rotation: number;
  direction: number;
  speed: number;
  droppedBy: string;
  droppedAt: number;
  verticalVelocity?: number;
  canHitOwner: boolean;
};

export type Player = {
  id: string;
  socket: string;
  position: Position;
  rotation: number;
  speed: number;
  color: Color;
  lastUpdate: number;
  item: Item;
  lives: number;
  isSpinning?: boolean;
  isBoosted?: boolean;
  isItemSpinning?: boolean;
  isStarred?: boolean;
  activeItem?: Item;
  trailingItem?: {
    type: string;
    quantity: number;
  };
};

export type Banana = {
  id: string;
  position: Position;
  rotation: number;
  droppedBy: string;
  droppedAt: number;
};

export type FakeCube = {
  id: string;
  position: Position;
  rotation: number;
  droppedBy: string;
  droppedAt: number;
};

export type ItemBox = {
  id: number;
  position: number[];
};

export type ItemBoxItem = {
  type: string;
};

export type GameState = {
  players: Record<string, Player>;
  bananas: Record<string, Banana>;
  fakeCubes: Record<string, FakeCube>;
  greenShells: Record<string, GreenShell>;
  redShells: Record<string, RedShell>;
  itemBoxes: ItemBox[];
};
