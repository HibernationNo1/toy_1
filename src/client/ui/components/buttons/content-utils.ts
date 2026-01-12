import { TweenService } from "@rbxts/services";
import { ensureCorner, ensureScale } from "./ui-utils";

export const ensureLabel = (parent: Instance, name: string, zIndex: number) => {
  const existing = parent.FindFirstChild(name);
  if (existing && existing.IsA("TextLabel")) {
    existing.ZIndex = zIndex;
    return existing;
  }
  if (existing) {
    existing.Destroy();
  }
  const label = new Instance("TextLabel");
  label.Name = name;
  label.BackgroundTransparency = 1;
  label.TextScaled = false;
  label.TextSize = 18;
  label.TextWrapped = true;
  label.TextXAlignment = Enum.TextXAlignment.Center;
  label.TextYAlignment = Enum.TextYAlignment.Center;
  label.ZIndex = zIndex;
  label.Parent = parent;
  return label;
};

export const ensureIcon = (parent: Instance, name: string, zIndex: number) => {
  const existing = parent.FindFirstChild(name);
  if (existing && existing.IsA("ImageLabel")) {
    existing.ZIndex = zIndex;
    return existing;
  }
  if (existing) {
    existing.Destroy();
  }
  const icon = new Instance("ImageLabel");
  icon.Name = name;
  icon.BackgroundTransparency = 1;
  icon.ScaleType = Enum.ScaleType.Fit;
  icon.ZIndex = zIndex;
  icon.Parent = parent;
  return icon;
};

export const ensureContentFrame = (parent: Instance, zIndex: number) => {
  const existing = parent.FindFirstChild("Content");
  if (existing && existing.IsA("Frame")) {
    existing.ZIndex = zIndex;
    return existing;
  }
  if (existing) {
    existing.Destroy();
  }
  const frame = new Instance("Frame");
  frame.Name = "Content";
  frame.BackgroundTransparency = 1;
  frame.ZIndex = zIndex;
  frame.Parent = parent;
  return frame;
};

export const ensureHorizontalLayout = (parent: Instance, padding: number) => {
  const existing = parent.FindFirstChildOfClass("UIListLayout");
  if (existing) {
    existing.FillDirection = Enum.FillDirection.Horizontal;
    existing.HorizontalAlignment = Enum.HorizontalAlignment.Center;
    existing.VerticalAlignment = Enum.VerticalAlignment.Center;
    existing.Padding = new UDim(0, padding);
    return existing;
  }
  const layout = new Instance("UIListLayout");
  layout.FillDirection = Enum.FillDirection.Horizontal;
  layout.HorizontalAlignment = Enum.HorizontalAlignment.Center;
  layout.VerticalAlignment = Enum.VerticalAlignment.Center;
  layout.Padding = new UDim(0, padding);
  layout.Parent = parent;
  return layout;
};

export const createPendingIndicator = (parent: Instance, zIndex: number, color: Color3) => {
  const dot = new Instance("Frame");
  dot.Name = "PendingIndicator";
  dot.BackgroundColor3 = color;
  dot.BorderSizePixel = 0;
  dot.AnchorPoint = new Vector2(1, 0.5);
  dot.Position = new UDim2(1, -12, 0.5, 0);
  dot.Size = new UDim2(0, 10, 0, 10);
  dot.Visible = false;
  dot.ZIndex = zIndex;
  dot.Parent = parent;

  ensureCorner(dot, new UDim(1, 0));
  const scale = ensureScale(dot);
  scale.Scale = 1;

  const tween = TweenService.Create(
    scale,
    new TweenInfo(0.55, Enum.EasingStyle.Sine, Enum.EasingDirection.InOut, -1, true),
    { Scale: 0.6 }
  );

  return {
    start: () => {
      dot.Visible = true;
      tween.Play();
    },
    stop: () => {
      tween.Cancel();
      scale.Scale = 1;
      dot.Visible = false;
    },
  };
};
