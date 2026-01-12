export const SCREEN_GUI_NAME = "ScreenGui";
export const BUTTONS_FOLDER_NAME = "Buttons";

export const COMMON_BUTTON_ASPECT_RATIO = 1.58;
export const COMMON_BUTTON_WIDTH_SCALE = 0.18;
export const COMMON_BUTTON_HEIGHT_SCALE = COMMON_BUTTON_WIDTH_SCALE / COMMON_BUTTON_ASPECT_RATIO;

export const INVENTORY_BUTTON_CONFIG = {
  containerName: "Inventory",
  containerAnchorPoint: new Vector2(1, 0),
  containerPosition: new UDim2(0.97, 0, 0.05, 0),
  containerSize: new UDim2(COMMON_BUTTON_WIDTH_SCALE, 0, COMMON_BUTTON_HEIGHT_SCALE, 0),
  aspectRatio: COMMON_BUTTON_ASPECT_RATIO,
  buttonName: "InventoryButton",
  visible: true,
  buttonAnchorPoint: new Vector2(0.5, 0.5),
  buttonPosition: new UDim2(0.5, 0, 0.5, 0),
  buttonSize: new UDim2(1, 0, 1, 0),
  palette: {
    idle: Color3.fromRGB(0, 120, 255),
    pressed: Color3.fromRGB(255, 230, 0),
    disabled: Color3.fromRGB(90, 90, 90),
  },
  stroke: { thickness: 2, color: Color3.fromRGB(255, 255, 255), transparency: 0.2 },
  cornerRadius: new UDim(0.1, 0),
};

export const PULL_BANANA_BUTTON_CONFIG = {
  buttonName: "PullBanana",
  visible: true,
  buttonAnchorPoint: new Vector2(0, 1),
  buttonPosition: new UDim2(0.03, 0, 0.95, 0),
  buttonSize: new UDim2(COMMON_BUTTON_WIDTH_SCALE, 0, COMMON_BUTTON_HEIGHT_SCALE, 0),
  aspectRatio: COMMON_BUTTON_ASPECT_RATIO,
  palette: {
    idle: Color3.fromRGB(212, 80, 80),
    pressed: Color3.fromRGB(184, 53, 53),
    disabled: Color3.fromRGB(100, 100, 100),
  },
  stroke: { thickness: 2, color: Color3.fromRGB(255, 255, 255), transparency: 0.2 },
  cornerRadius: new UDim(0.1, 0),
  modal: true,
};

export const INVENTORY_PANEL_CLOSE_BUTTON_CONFIG = {
  name: "CloseButton",
  visible: true,
  anchorPoint: new Vector2(1, 0),
  position: new UDim2(1, -12, 0, 12),
  size: new UDim2(0, 28, 0, 28),
  palette: {
    idle: Color3.fromRGB(140, 140, 140),
    pressed: Color3.fromRGB(160, 160, 160),
    disabled: Color3.fromRGB(110, 110, 110),
  },
  stroke: { thickness: 2, color: Color3.fromRGB(255, 255, 255), transparency: 0.2 },
  cornerRadius: new UDim(0.1, 0),
  label: {
    text: "X",
    color: Color3.fromRGB(255, 255, 255),
  },
  cooldownSeconds: 0.2,
};
