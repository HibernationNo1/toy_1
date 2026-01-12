import type { ButtonLayer } from "./types";
import { Z_INDEX_RANGES } from "./constants";

export const clamp = (value: number, min: number, max: number) => math.max(min, math.min(max, value));

export const resolveZIndex = (layer: ButtonLayer | undefined, value?: number) => {
  const range = Z_INDEX_RANGES[layer ?? "base"];
  if (value !== undefined) {
    return clamp(value, range.min, range.max);
  }
  return range.fallback;
};

export const ensureCorner = (parent: GuiObject, radius: UDim) => {
  const existing = parent.FindFirstChildOfClass("UICorner");
  if (existing) {
    existing.CornerRadius = radius;
    return existing;
  }
  const corner = new Instance("UICorner");
  corner.CornerRadius = radius;
  corner.Parent = parent;
  return corner;
};

export const ensureStroke = (parent: GuiObject, thickness: number, color: Color3, transparency: number) => {
  const existing = parent.FindFirstChildOfClass("UIStroke");
  if (existing) {
    existing.Thickness = thickness;
    existing.Color = color;
    existing.Transparency = transparency;
    existing.ApplyStrokeMode = Enum.ApplyStrokeMode.Border;
    existing.LineJoinMode = Enum.LineJoinMode.Round;
    return existing;
  }
  const stroke = new Instance("UIStroke");
  stroke.Thickness = thickness;
  stroke.Color = color;
  stroke.Transparency = transparency;
  stroke.ApplyStrokeMode = Enum.ApplyStrokeMode.Border;
  stroke.LineJoinMode = Enum.LineJoinMode.Round;
  stroke.Parent = parent;
  return stroke;
};

export const ensureScale = (parent: GuiObject) => {
  const existing = parent.FindFirstChildOfClass("UIScale");
  if (existing) {
    return existing;
  }
  const scale = new Instance("UIScale");
  scale.Parent = parent;
  return scale;
};

export const ensureSizeConstraint = (parent: GuiObject, minSize: Vector2) => {
  const existing = parent.FindFirstChildOfClass("UISizeConstraint");
  if (existing) {
    existing.MinSize = minSize;
    return existing;
  }
  const constraint = new Instance("UISizeConstraint");
  constraint.MinSize = minSize;
  constraint.Parent = parent;
  return constraint;
};

export const ensureSound = (parent: Instance, name: string, soundId: string, volume: number) => {
  const existing = parent.FindFirstChild(name);
  if (existing && existing.IsA("Sound")) {
    existing.SoundId = soundId;
    existing.Volume = volume;
    return existing;
  }
  if (existing) {
    existing.Destroy();
  }
  const sound = new Instance("Sound");
  sound.Name = name;
  sound.SoundId = soundId;
  sound.Volume = volume;
  sound.Parent = parent;
  return sound;
};

export const playSound = (parent: Instance, name: string, soundId: string | undefined, volume: number) => {
  if (!soundId || soundId.size() === 0) {
    return;
  }
  const sound = ensureSound(parent, name, soundId, volume);
  sound.Play();
};
