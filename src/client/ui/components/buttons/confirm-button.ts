import { DEFAULT_ANCHOR, DEFAULT_MIN_SIZE } from "./constants";
import type { ButtonLayer, ButtonSounds } from "./types";
import { createBaseButton } from "./base-button";
import { bindStandardActivation } from "./activations";
import {
  createPendingIndicator,
  ensureContentFrame,
  ensureHorizontalLayout,
  ensureIcon,
  ensureLabel,
} from "./content-utils";

export type ConfirmButtonOptions = {
  parent: Instance;
  visible: boolean;
  position: UDim2;
  size: UDim2;
  text?: string;
  icon?: string;
  layer?: ButtonLayer;
  zIndex?: number;
  sounds?: ButtonSounds;
  autoPending?: boolean;
};

export const createConfirmButton = (options: ConfirmButtonOptions) => {
  const controller = createBaseButton({
    name: "BtnConfirm",
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
      idle: Color3.fromRGB(58, 168, 92),
      pressed: Color3.fromRGB(74, 189, 110),
      disabled: Color3.fromRGB(120, 120, 120),
      pending: Color3.fromRGB(68, 164, 98),
    },
    feedbackPalette: {
      success: Color3.fromRGB(96, 214, 132),
      failure: Color3.fromRGB(124, 96, 96),
    },
    stroke: { thickness: 2, color: Color3.fromRGB(255, 255, 255), transparency: 0.2 },
    cornerRadius: new UDim(0.18, 0),
    availabilityMode: "disable",
    sounds: options.sounds,
  });

  const childZIndex = controller.getChildZIndex();
  const content = ensureContentFrame(controller.button, childZIndex);
  content.AnchorPoint = new Vector2(0.5, 0.5);
  content.Position = new UDim2(0.5, 0, 0.5, 0);
  content.Size = new UDim2(1, -24, 1, 0);

  ensureHorizontalLayout(content, 8);

  const icon = ensureIcon(content, "Icon", childZIndex);
  icon.Size = new UDim2(0, 20, 0, 20);
  icon.Image = options.icon ?? "";
  icon.ImageColor3 = Color3.fromRGB(255, 255, 255);
  icon.Visible = options.icon !== undefined && options.icon.size() > 0;

  const label = ensureLabel(content, "Label", childZIndex);
  label.Text = options.text ?? "";
  label.TextColor3 = Color3.fromRGB(255, 255, 255);
  label.Font = Enum.Font.GothamBold;
  label.Size = new UDim2(0, 0, 1, 0);
  label.AutomaticSize = Enum.AutomaticSize.X;
  label.TextScaled = false;
  label.TextSize = 18;
  label.Visible = options.text !== undefined && options.text.size() > 0;

  const pendingIndicator = createPendingIndicator(controller.button, childZIndex, Color3.fromRGB(255, 255, 255));

  controller.onStateChange((state) => {
    const disabled = state === "Disabled";
    label.TextTransparency = disabled ? 0.4 : 0;
    icon.ImageTransparency = disabled ? 0.4 : 0;
    if (state === "Pending") {
      pendingIndicator.start();
    } else {
      pendingIndicator.stop();
    }
  });

  const autoPending = options.autoPending ?? true;

  const resolveSuccess = () => {
    controller.setPending(false);
    controller.playSuccessFeedback();
  };

  const resolveFailure = () => {
    controller.setPending(false);
    controller.playFailureFeedback("weak");
  };

  const activated = new Instance("BindableEvent");
  activated.Name = "Activated";
  activated.Parent = controller.button;

  bindStandardActivation(controller, () => activated.Fire(), { autoPending });

  return {
    ...controller,
    resolveSuccess,
    resolveFailure,
    onActivated: (handler: () => void) => activated.Event.Connect(handler),
  };
};
