import { DEFAULT_ANCHOR, DEFAULT_MIN_SIZE } from "./constants";
import type { ButtonLayer, ButtonSounds } from "./types";
import { createBaseButton } from "./base-button";
import { bindStandardActivation } from "./activations";

type CornerPreset = "topLeft" | "topRight";

const resolveCornerPosition = (preset: CornerPreset, offset: number) => {
  if (preset === "topLeft") {
    return new UDim2(0, offset, 0, offset);
  }
  return new UDim2(1, -offset, 0, offset);
};

export type CloseButtonOptions = {
  parent: Instance;
  visible: boolean;
  icon?: string;
  preset?: CornerPreset;
  offset?: number;
  size?: UDim2;
  layer?: ButtonLayer;
  zIndex?: number;
  sounds?: ButtonSounds;
};

export const createCloseButton = (options: CloseButtonOptions) => {
  const size = options.size ?? new UDim2(0, 52, 0, 52);
  const offset = options.offset ?? 24;
  const position = resolveCornerPosition(options.preset ?? "topRight", offset);

  const controller = createBaseButton({
    name: "BtnClose",
    parent: options.parent,
    visible: options.visible,
    size,
    position,
    anchorPoint: DEFAULT_ANCHOR,
    minSize: DEFAULT_MIN_SIZE,
    layer: options.layer,
    zIndex: options.zIndex,
    image: options.icon ?? "",
    imageColor: Color3.fromRGB(255, 255, 255),
    backgroundTransparency: 0.15,
    palette: {
      idle: Color3.fromRGB(120, 120, 120),
      pressed: Color3.fromRGB(145, 145, 145),
      disabled: Color3.fromRGB(90, 90, 90),
    },
    feedbackPalette: {
      success: Color3.fromRGB(170, 170, 170),
      failure: Color3.fromRGB(110, 90, 90),
    },
    stroke: { thickness: 2, color: Color3.fromRGB(255, 255, 255), transparency: 0.6 },
    cornerRadius: new UDim(0.4, 0),
    cooldownSeconds: 0.2,
    availabilityMode: "disable",
    sounds: options.sounds,
  });

  const activated = new Instance("BindableEvent");
  activated.Name = "Activated";
  activated.Parent = controller.button;

  bindStandardActivation(controller, () => activated.Fire());

  return {
    ...controller,
    onActivated: (handler: () => void) => activated.Event.Connect(handler),
  };
};
