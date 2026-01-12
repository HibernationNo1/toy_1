import { DEFAULT_ANCHOR, DEFAULT_MIN_SIZE } from "./constants";
import type { ButtonLayer, ButtonSounds } from "./types";
import { createBaseButton } from "./base-button";
import { bindStandardActivation } from "./activations";
import { ensureLabel } from "./content-utils";

export type CancelButtonOptions = {
  parent: Instance;
  visible: boolean;
  position: UDim2;
  size: UDim2;
  text?: string;
  layer?: ButtonLayer;
  zIndex?: number;
  sounds?: ButtonSounds;
};

export const createCancelButton = (options: CancelButtonOptions) => {
  const controller = createBaseButton({
    name: "BtnCancel",
    parent: options.parent,
    visible: options.visible,
    size: options.size,
    position: options.position,
    anchorPoint: DEFAULT_ANCHOR,
    minSize: DEFAULT_MIN_SIZE,
    layer: options.layer,
    zIndex: options.zIndex,
    backgroundTransparency: 0,
    palette: {
      idle: Color3.fromRGB(145, 145, 145),
      pressed: Color3.fromRGB(170, 170, 170),
      disabled: Color3.fromRGB(110, 110, 110),
    },
    feedbackPalette: {
      success: Color3.fromRGB(180, 180, 180),
      failure: Color3.fromRGB(120, 100, 100),
    },
    stroke: { thickness: 2, color: Color3.fromRGB(255, 255, 255), transparency: 0.35 },
    cornerRadius: new UDim(0.18, 0),
    availabilityMode: "disable",
    sounds: options.sounds,
  });

  const label = ensureLabel(controller.button, "Label", controller.getChildZIndex());
  label.Size = new UDim2(1, -16, 1, -16);
  label.Position = new UDim2(0.5, 0, 0.5, 0);
  label.AnchorPoint = new Vector2(0.5, 0.5);
  label.Text = options.text ?? "";
  label.TextColor3 = Color3.fromRGB(255, 255, 255);
  label.Font = Enum.Font.GothamMedium;
  label.TextScaled = true;

  controller.onStateChange((state) => {
    label.TextTransparency = state === "Disabled" ? 0.4 : 0;
  });

  const activated = new Instance("BindableEvent");
  activated.Name = "Activated";
  activated.Parent = controller.button;

  bindStandardActivation(controller, () => activated.Fire(), { pressStrength: "weak" });

  return {
    ...controller,
    onActivated: (handler: () => void) => activated.Event.Connect(handler),
  };
};
