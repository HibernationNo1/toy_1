export const DEFAULT_MIN_SIZE = new Vector2(44, 44);
export const DEFAULT_ANCHOR = new Vector2(0.5, 0.5);
export const PRESS_RESET_DELAY = 0.12;

export const Z_INDEX_RANGES = {
  base: { min: 1, max: 10, fallback: 5 },
  panel: { min: 20, max: 40, fallback: 30 },
  overlay: { min: 80, max: 90, fallback: 85 },
  popup: { min: 100, max: 120, fallback: 100 },
} as const;
