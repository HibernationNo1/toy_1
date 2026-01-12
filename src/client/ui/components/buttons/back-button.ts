import { DEFAULT_ANCHOR, DEFAULT_MIN_SIZE } from "./constants";
import type { ButtonLayer, ButtonSounds } from "./types";
import { createBaseButton } from "./base-button";
import { bindStandardActivation } from "./activations";

export type BackButtonOptions = {
  parent: Instance;
  visible: boolean;
  icon?: string;
  offset?: number;
  size?: UDim2;
  layer?: ButtonLayer;
  zIndex?: number;
  sounds?: ButtonSounds;
};

export const createBackButton = (options: BackButtonOptions) => {
  const size = options.size ?? new UDim2(0, 56, 0, 56);
  const offset = options.offset ?? 24;
  const position = new UDim2(0, offset, 0, offset);

  const controller = createBaseButton({
    name: "BtnBack",
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
    backgroundTransparency: 0.1,
    palette: {
      idle: Color3.fromRGB(95, 95, 95),
      pressed: Color3.fromRGB(120, 120, 120),
      disabled: Color3.fromRGB(70, 70, 70),
    },
    feedbackPalette: {
      success: Color3.fromRGB(150, 150, 150),
      failure: Color3.fromRGB(110, 90, 90),
    },
    stroke: { thickness: 2, color: Color3.fromRGB(255, 255, 255), transparency: 0.5 },
    cornerRadius: new UDim(0.4, 0),
    cooldownSeconds: 0.25,
    availabilityMode: "disable",
    sounds: options.sounds,
  });

  const activated = new Instance("BindableEvent");
  activated.Name = "Activated";
  activated.Parent = controller.button;

  bindStandardActivation(controller, () => activated.Fire());

  const onBackRequested = (handler: () => boolean) =>
    activated.Event.Connect(() => {
      const ok = handler();
      if (!ok) {
        controller.playFailureFeedback("weak");
      }
    });

  return {
    ...controller,
    onActivated: (handler: () => void) => activated.Event.Connect(handler),
    onBackRequested,
  };
};
