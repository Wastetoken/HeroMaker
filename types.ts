
export interface ShaderParams {
  colors: string[];
  complexity: number;
  zoom: number;
  speed: number;
  distortion: number;
  iterations: number;
  noise: number;
  hueRotation: number;
}

export interface Layer {
  id: string;
  type: 'text' | 'button';
  text: string;
  x: number;
  y: number;
  size: number;
  font: string;
  weight: number;
  opacity: number;
  rotation: number;
  letterSpacing: number;
  mixBlendMode: string;
  color: string;
  italic: boolean;
  // CTA specific
  paddingX?: number;
  paddingY?: number;
  borderRadius?: number;
  backgroundColor?: string;
  borderWidth?: number;
  borderColor?: string;
}

export interface GlobalSettings {
  showGrid: boolean;
  gridOpacity: number;
}

export type TabType = 'Visuals' | 'Palette' | 'Layout' | 'Layers';

export interface DragState {
  id: string;
  offsetX: number;
  offsetY: number;
}
