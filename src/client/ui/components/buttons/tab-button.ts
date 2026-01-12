import { DEFAULT_ANCHOR, DEFAULT_MIN_SIZE } from "./constants";
import type { ButtonLayer, ButtonSounds } from "./types";
import { createBaseButton } from "./base-button";
import { bindTabActivation } from "./activations";
import { ensureLabel } from "./content-utils";

export type TabButtonOptions = {
  parent: Instance;
  visible: boolean;
  position: UDim2;
  size: UDim2;
  text: string;
  tabKey: string;
  layer?: ButtonLayer;
  zIndex?: number;
  sounds?: ButtonSounds;
  selected?: boolean;
};

export const createTabButton = (options: TabButtonOptions) => {
  const controller = createBaseButton({
    name: "BtnTab",
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
      idle: Color3.fromRGB(120, 120, 120),
      pressed: Color3.fromRGB(145, 145, 145),
      disabled: Color3.fromRGB(90, 90, 90),
      selected: Color3.fromRGB(80, 150, 210),
    },
    feedbackPalette: {
      success: Color3.fromRGB(120, 180, 230),
      failure: Color3.fromRGB(110, 90, 90),
    },
    stroke: { thickness: 2, color: Color3.fromRGB(255, 255, 255), transparency: 0.45 },
    cornerRadius: new UDim(0.2, 0),
    availabilityMode: "disable",
    sounds: options.sounds,
  });

  const childZIndex = controller.getChildZIndex();
  const label = ensureLabel(controller.button, "Label", childZIndex);
  label.Size = new UDim2(1, -16, 1, -16);
  label.Position = new UDim2(0.5, 0, 0.5, 0);
  label.AnchorPoint = new Vector2(0.5, 0.5);
  label.Text = options.text;
  label.TextColor3 = Color3.fromRGB(240, 240, 240);
  label.Font = Enum.Font.GothamMedium;
  label.TextScaled = true;

  const indicator = new Instance("Frame");
  indicator.Name = "SelectedIndicator";
  indicator.AnchorPoint = new Vector2(0.5, 1);
  indicator.Position = new UDim2(0.5, 0, 1, -4);
  indicator.Size = new UDim2(1, -18, 0, 4);
  indicator.BackgroundColor3 = Color3.fromRGB(255, 255, 255);
  indicator.BorderSizePixel = 0;
  indicator.ZIndex = childZIndex;
  indicator.Parent = controller.button;
  indicator.Visible = options.selected === true;

  controller.setSelected(options.selected === true);

  controller.onStateChange((state) => {
    const selected = state === "Selected";
    indicator.Visible = selected;
    label.TextColor3 = selected ? Color3.fromRGB(255, 255, 255) : Color3.fromRGB(230, 230, 230);
    label.TextTransparency = state === "Disabled" ? 0.4 : 0;
  });

  const tabRequested = new Instance("BindableEvent");
  tabRequested.Name = "TabRequested";
  tabRequested.Parent = controller.button;

  bindTabActivation(controller, () => {
    tabRequested.Fire(options.tabKey);
  });

  return {
    ...controller,
    tabKey: options.tabKey,
    onTabRequested: (handler: (tabKey: string) => void) => tabRequested.Event.Connect(handler),
  };
};
