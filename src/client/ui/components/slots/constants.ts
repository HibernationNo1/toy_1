export const DEFAULT_MIN_SIZE = new Vector2(44, 44);
export const DEFAULT_ANCHOR = new Vector2(0.5, 0.5);
export const PRESS_RESET_DELAY = 0.12;

export const SLOT_Z_INDEX_RANGES = {
  base: { min: 1, max: 10, fallback: 5 },
  panel: { min: 20, max: 40, fallback: 30 },
  overlay: { min: 80, max: 90, fallback: 85 },
  popup: { min: 100, max: 120, fallback: 100 },
} as const;

export const DEFAULT_RARITY_COLORS: Record<string, Color3> = {
  common: Color3.fromRGB(190, 190, 190),
  uncommon: Color3.fromRGB(120, 200, 120),
  rare: Color3.fromRGB(90, 160, 220),
  epic: Color3.fromRGB(220, 170, 80),
  legendary: Color3.fromRGB(240, 210, 90),
};

export const DEFAULT_RARITY_FALLBACK = Color3.fromRGB(200, 200, 200);

export const DEFAULT_SLOT_PALETTE = {
  idle: Color3.fromRGB(120, 120, 120),
  pressed: Color3.fromRGB(150, 150, 150),
  selected: Color3.fromRGB(90, 150, 210),
  locked: Color3.fromRGB(90, 90, 90),
};

export const DEFAULT_SLOT_FEEDBACK_PALETTE = {
  success: Color3.fromRGB(90, 150, 210),
  failure: Color3.fromRGB(90, 90, 90),
};

export const DEFAULT_SLOT_TEXT_STYLE = {
  nameColor: Color3.fromRGB(255, 255, 255),
  qtyColor: Color3.fromRGB(235, 235, 235),
  font: Enum.Font.GothamMedium,
  qtyFont: Enum.Font.GothamMedium,
};

export const DEFAULT_SLOT_STROKE = {
  thickness: 2,
  transparency: 0.25,
  color: Color3.fromRGB(255, 255, 255),
};

export const DEFAULT_SLOT_CORNER = new UDim(0.12, 0);

export const DEFAULT_REVEAL_PALETTE = {
  background: Color3.fromRGB(40, 40, 40),
  text: Color3.fromRGB(255, 255, 255),
};

export const DEFAULT_REVEAL_TEXT_STYLE = {
  font: Enum.Font.GothamBold,
  nameColor: Color3.fromRGB(255, 255, 255),
};

export const DEFAULT_REVEAL_CORNER = new UDim(0.2, 0);
