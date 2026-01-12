export type ButtonLayer = "base" | "panel" | "overlay" | "popup";
export type ButtonState = "Idle" | "Pressed" | "Disabled" | "Selected" | "Pending";
export type AvailabilityMode = "hide" | "disable";
export type FeedbackStrength = "strong" | "weak";

export type ButtonSounds = {
  click?: string;
  success?: string;
  failure?: string;
  volume?: number;
};

export type ButtonPalette = {
  idle: Color3;
  pressed: Color3;
  disabled: Color3;
  selected?: Color3;
  pending?: Color3;
};

export type ButtonFeedbackPalette = {
  success: Color3;
  failure: Color3;
};

export type ButtonBaseOptions = {
  name: string;
  parent: Instance;
  visible: boolean;
  size: UDim2;
  position: UDim2;
  anchorPoint?: Vector2;
  minSize?: Vector2;
  layer?: ButtonLayer;
  zIndex?: number;
  backgroundTransparency?: number;
  disabledTransparency?: number;
  image?: string;
  imageColor?: Color3;
  imageTransparency?: number;
  disabledImageTransparency?: number;
  scaleType?: Enum.ScaleType;
  cornerRadius?: UDim;
  stroke?: { thickness: number; color: Color3; transparency?: number };
  palette: ButtonPalette;
  feedbackPalette?: ButtonFeedbackPalette;
  sounds?: ButtonSounds;
  cooldownSeconds?: number;
  availabilityMode?: AvailabilityMode;
};

export type BaseButtonController = {
  button: ImageButton;
  getState: () => ButtonState;
  getChildZIndex: () => number;
  isSelected: () => boolean;
  isPending: () => boolean;
  setVisible: (visible: boolean) => void;
  setEnabled: (enabled: boolean, mode?: AvailabilityMode) => void;
  setSelected: (selected: boolean) => void;
  setPending: (pending: boolean) => void;
  setPressed: (pressed: boolean) => void;
  setState: (state: ButtonState) => void;
  canActivate: () => boolean;
  startCooldown: () => void;
  playPressFeedback: (strength?: FeedbackStrength) => void;
  playSuccessFeedback: () => void;
  playFailureFeedback: (strength?: FeedbackStrength) => void;
  onStateChange: (handler: (state: ButtonState) => void) => void;
  destroy: () => void;
};
