export type SlotLayer = "base" | "panel" | "overlay" | "popup";
export type SlotState = "Idle" | "Selected" | "Locked";
export type AvailabilityMode = "hide" | "disable";
export type FeedbackStrength = "strong" | "weak";

export type SlotSounds = {
  click?: string;
  success?: string;
  failure?: string;
  reveal?: string;
  volume?: number;
};

export type SlotItemPalette = {
  idle: Color3;
  pressed: Color3;
  selected: Color3;
  locked: Color3;
};

export type SlotItemFeedbackPalette = {
  success: Color3;
  failure: Color3;
};

export type SlotItemTextStyle = {
  nameColor: Color3;
  qtyColor: Color3;
  font: Enum.Font;
  qtyFont: Enum.Font;
};

export type SlotItemOptions = {
  name: string;
  parent: Instance;
  visible: boolean;
  position: UDim2;
  size: UDim2;
  anchorPoint?: Vector2;
  minSize?: Vector2;
  layer?: SlotLayer;
  zIndex?: number;
  cornerRadius?: UDim;
  stroke?: { thickness: number; color: Color3; transparency?: number };
  palette?: Partial<SlotItemPalette>;
  feedbackPalette?: Partial<SlotItemFeedbackPalette>;
  textStyle?: Partial<SlotItemTextStyle>;
  rarityColors?: Record<string, Color3>;
  rarityFallbackColor?: Color3;
  showRarityBar?: boolean;
  rarityBarHeight?: number;
  lockedOverlayTransparency?: number;
  availabilityMode?: AvailabilityMode;
  clickable?: boolean;
  autoSuccessFeedback?: boolean;
  sounds?: SlotSounds;
};

export type SlotItemData = {
  id?: string;
  name: string;
  icon?: string;
  qty?: number;
  rarity?: string;
  locked?: boolean;
  selected?: boolean;
};

export type SlotItemController = {
  slot: Frame;
  getState: () => SlotState;
  getData: () => SlotItemData;
  setItem: (data: SlotItemData) => void;
  setSelected: (selected: boolean) => void;
  setLocked: (locked: boolean) => void;
  setVisible: (visible: boolean) => void;
  setClickable: (clickable: boolean, mode?: AvailabilityMode) => void;
  setBorderColor: (color: Color3) => void;
  onActivated: (handler: (data: SlotItemData) => void) => RBXScriptConnection;
  playSuccessFeedback: () => void;
  playFailureFeedback: (strength?: FeedbackStrength) => void;
  destroy: () => void;
};

export type SlotRevealPalette = {
  background: Color3;
  text: Color3;
};

export type SlotRevealTextStyle = {
  font: Enum.Font;
  nameColor: Color3;
};

export type SlotItemRevealOptions = {
  name: string;
  parent: Instance;
  visible: boolean;
  position: UDim2;
  size: UDim2;
  anchorPoint?: Vector2;
  minSize?: Vector2;
  layer?: SlotLayer;
  zIndex?: number;
  cornerRadius?: UDim;
  stroke?: { thickness: number; color: Color3; transparency?: number };
  palette?: Partial<SlotRevealPalette>;
  textStyle?: Partial<SlotRevealTextStyle>;
  rarityColors?: Record<string, Color3>;
  rarityFallbackColor?: Color3;
  sounds?: SlotSounds;
};

export type SlotItemRevealData = {
  name: string;
  icon?: string;
  rarity?: string;
  isNew?: boolean;
};

export type SlotItemRevealController = {
  slot: Frame;
  setVisible: (visible: boolean) => void;
  playReveal: (data: SlotItemRevealData) => void;
  skip: () => void;
  onCompleted: (handler: () => void) => RBXScriptConnection;
  destroy: () => void;
};
