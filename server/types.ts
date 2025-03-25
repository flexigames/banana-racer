// Define types for shared game configuration
export type Ramp = {
  position: [number, number, number];
  rotation: number;
  scale: [number, number, number];
};

export type RampsConfig = Ramp[]; 