import * as THREE from 'three';

export type VehicleType = 
  | 'vehicle-racer'
  | 'vehicle-truck'
  | 'vehicle-suv'
  | 'vehicle-monster-truck'
  | 'vehicle-vintage-racer'
  | 'vehicle-racer-low'
  | 'vehicle-speedster'
  | 'vehicle-drag-racer';

export interface Position {
  x: number;
  y: number;
  z: number;
}

export interface Player {
  id: string;
  position: Position;
  rotation: number;
  speed: number;
  item?: ItemData;
  color?: {
    h: number;
    s: number;
    l: number;
  };
  vehicle?: string;
}

export interface BananaData {
  id: string;
  position: Position;
  rotation: number;
  playerId: string;
}

export interface ItemBoxData {
  id: string;
  position: [number, number, number];
}

export interface ItemData {
  type: string;
  quantity: number;
}

export type CarRef = THREE.Object3D & {
  speed?: number;
  isSpinningOut?: () => boolean;
  triggerSpinOut?: () => void;
  applyBoost?: () => void;
};

export interface CarMovement {
  forward: number;
  turn: number;
  speed: number;
  rotation: number;
  handbrake: boolean;
  tireSlip: number;
}

export interface MultiplayerContextType {
  connected: boolean;
  playerId: string;
  players: Record<string, Player>;
  bananas: BananaData[];
  itemBoxes: ItemBoxData[];
  updatePlayerPosition: (position: Position, rotation: number, speed: number) => void;
  updatePosition: (position: Position | [number, number, number], rotation: number, speed: number) => void;
  useItem: (position?: THREE.Vector3, rotation?: number) => ItemData | null;
  hitBanana: (bananaId: string) => void;
  collectItemBox: (itemBoxId: string) => void;
} 