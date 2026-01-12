const SLOT_ACTIVE_COLOR = Color3.fromRGB(217, 217, 217);
const SLOT_INACTIVE_COLOR = Color3.fromRGB(69, 69, 69);
const SLOT_FLASH_COLOR = Color3.fromRGB(212, 182, 182);
const SLOT_OWNED_FLASH_COLOR = Color3.fromRGB(168, 205, 227);
const SLOT_OWNED_BORDER_COLOR = Color3.fromRGB(217, 213, 184);
const SLOT_UNOWNED_BORDER_COLOR = Color3.fromRGB(209, 177, 163);
const SLOT_STROKE_COLOR = Color3.fromRGB(66, 66, 66);

const REROLL_SLOT_COLOR = Color3.fromRGB(200, 200, 200);
const REROLL_SLOT_PRESSED_COLOR = Color3.fromRGB(220, 220, 220);
const REROLL_SLOT_STROKE_COLOR = Color3.fromRGB(140, 140, 140);

export const BANANA_SUBMIT_SLOT_CONFIG = {
  count: 3,
  palette: {
    idle: SLOT_ACTIVE_COLOR,
    pressed: SLOT_FLASH_COLOR,
    selected: SLOT_OWNED_FLASH_COLOR,
    locked: SLOT_INACTIVE_COLOR,
  },
  feedbackPalette: {
    success: SLOT_OWNED_FLASH_COLOR,
    failure: SLOT_FLASH_COLOR,
  },
  textStyle: {
    nameColor: Color3.fromRGB(40, 40, 40),
    qtyColor: Color3.fromRGB(40, 40, 40),
    font: Enum.Font.GothamMedium,
    qtyFont: Enum.Font.GothamMedium,
  },
  stroke: {
    thickness: 3,
    color: SLOT_STROKE_COLOR,
    transparency: 0.2,
  },
  cornerRadius: new UDim(0, 0),
  showRarityBar: false,
  lockedOverlayTransparency: 1,
  borderColors: {
    inactive: SLOT_STROKE_COLOR,
    owned: SLOT_OWNED_BORDER_COLOR,
    unowned: SLOT_UNOWNED_BORDER_COLOR,
  },
};

export const BANANA_SUBMIT_LAYOUT = {
  padding: 6,
  spacing: 4,
  rerollScale: 0.8,
};

export const BANANA_SUBMIT_REROLL_BUTTON_CONFIG = {
  name: "RerollSlot",
  visible: true,
  palette: {
    idle: REROLL_SLOT_COLOR,
    pressed: REROLL_SLOT_PRESSED_COLOR,
    disabled: REROLL_SLOT_COLOR,
    selected: REROLL_SLOT_PRESSED_COLOR,
  },
  stroke: { thickness: 3, color: REROLL_SLOT_STROKE_COLOR, transparency: 0.2 },
  cornerRadius: new UDim(0.1, 0),
};
