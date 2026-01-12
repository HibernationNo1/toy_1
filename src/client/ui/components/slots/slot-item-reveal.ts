import { TweenService } from "@rbxts/services";
import {
  DEFAULT_ANCHOR,
  DEFAULT_MIN_SIZE,
  DEFAULT_RARITY_COLORS,
  DEFAULT_RARITY_FALLBACK,
  DEFAULT_REVEAL_CORNER,
  DEFAULT_REVEAL_PALETTE,
  DEFAULT_REVEAL_TEXT_STYLE,
  SLOT_Z_INDEX_RANGES,
} from "./constants";
import type {
  SlotItemRevealController,
  SlotItemRevealData,
  SlotItemRevealOptions,
  SlotRevealPalette,
  SlotRevealTextStyle,
} from "./types";
import {
  clamp,
  ensureCorner,
  ensureScale,
  ensureSizeConstraint,
  ensureStroke,
  playSound,
  resolveZIndex,
} from "./ui-utils";

const REVEAL_DURATION = 0.9;

export const createSlotItemReveal = (options: SlotItemRevealOptions): SlotItemRevealController => {
  const palette: SlotRevealPalette = { ...DEFAULT_REVEAL_PALETTE, ...(options.palette ?? {}) };
  const textStyle: SlotRevealTextStyle = { ...DEFAULT_REVEAL_TEXT_STYLE, ...(options.textStyle ?? {}) };
  const rarityColors = options.rarityColors ?? DEFAULT_RARITY_COLORS;
  const rarityFallback = options.rarityFallbackColor ?? DEFAULT_RARITY_FALLBACK;
  const soundVolume = options.sounds?.volume ?? 0.6;

  const layer = options.layer ?? "popup";
  const zIndexRange = SLOT_Z_INDEX_RANGES[layer];
  const zIndex = resolveZIndex(layer, options.zIndex);
  const childZIndex = clamp(zIndex + 1, zIndexRange.min, zIndexRange.max);

  const slot = new Instance("Frame");
  slot.Name = options.name;
  slot.Visible = options.visible;
  slot.AnchorPoint = options.anchorPoint ?? DEFAULT_ANCHOR;
  slot.Position = options.position;
  slot.Size = options.size;
  slot.BackgroundColor3 = palette.background;
  slot.BorderSizePixel = 0;
  slot.ZIndex = zIndex;
  slot.Parent = options.parent;

  ensureSizeConstraint(slot, options.minSize ?? DEFAULT_MIN_SIZE);
  ensureCorner(slot, options.cornerRadius ?? DEFAULT_REVEAL_CORNER);

  const strokeConfig = options.stroke ?? { thickness: 3, color: rarityFallback, transparency: 0.4 };
  const stroke = ensureStroke(
    slot,
    strokeConfig.thickness,
    strokeConfig.color,
    strokeConfig.transparency ?? 0.4
  );

  const scale = ensureScale(slot);
  scale.Scale = 1;

  const icon = new Instance("ImageLabel");
  icon.Name = "Icon";
  icon.BackgroundTransparency = 1;
  icon.AnchorPoint = new Vector2(0.5, 0.5);
  icon.Position = new UDim2(0.5, 0, 0.48, 0);
  icon.Size = new UDim2(0.6, 0, 0.6, 0);
  icon.Image = "";
  icon.ImageColor3 = Color3.fromRGB(255, 255, 255);
  icon.ScaleType = Enum.ScaleType.Fit;
  icon.ZIndex = childZIndex;
  icon.Parent = slot;

  const nameLabel = new Instance("TextLabel");
  nameLabel.Name = "Name";
  nameLabel.BackgroundTransparency = 1;
  nameLabel.AnchorPoint = new Vector2(0.5, 1);
  nameLabel.Position = new UDim2(0.5, 0, 1, -12);
  nameLabel.Size = new UDim2(1, -16, 0.2, 0);
  nameLabel.Text = "";
  nameLabel.TextColor3 = textStyle.nameColor;
  nameLabel.Font = textStyle.font;
  nameLabel.TextScaled = true;
  nameLabel.TextWrapped = true;
  nameLabel.ZIndex = childZIndex;
  nameLabel.Parent = slot;

  const badge = new Instance("TextLabel");
  badge.Name = "NewBadge";
  badge.BackgroundColor3 = Color3.fromRGB(255, 225, 120);
  badge.BackgroundTransparency = 0;
  badge.BorderSizePixel = 0;
  badge.AnchorPoint = new Vector2(0, 0);
  badge.Position = new UDim2(0, 10, 0, 10);
  badge.Size = new UDim2(0, 44, 0, 22);
  badge.Text = "NEW";
  badge.TextColor3 = Color3.fromRGB(50, 40, 20);
  badge.Font = Enum.Font.GothamBold;
  badge.TextScaled = true;
  badge.Visible = false;
  badge.ZIndex = childZIndex;
  badge.Parent = slot;
  ensureCorner(badge, new UDim(0.3, 0));

  let revealToken = 0;

  const resolveRarityColor = (rarity?: string) => {
    if (!rarity) {
      return rarityFallback;
    }
    const key = rarity.lower();
    return rarityColors[key] ?? rarityFallback;
  };

  const applyData = (data: SlotItemRevealData) => {
    nameLabel.Text = data.name;
    if (data.icon && data.icon.size() > 0) {
      icon.Image = data.icon;
      icon.Visible = true;
    } else {
      icon.Image = "";
      icon.Visible = false;
    }
    badge.Visible = data.isNew === true;
    const rarityColor = resolveRarityColor(data.rarity);
    stroke.Color = rarityColor;
  };

  const playReveal = (data: SlotItemRevealData) => {
    revealToken += 1;
    const token = revealToken;
    applyData(data);
    slot.Visible = true;

    scale.Scale = 0.75;
    stroke.Transparency = 0.6;

    const scaleTween = TweenService.Create(
      scale,
      new TweenInfo(0.25, Enum.EasingStyle.Back, Enum.EasingDirection.Out),
      { Scale: 1 }
    );
    const glowTween = TweenService.Create(
      stroke,
      new TweenInfo(0.45, Enum.EasingStyle.Quad, Enum.EasingDirection.Out),
      { Transparency: 0.2 }
    );
    scaleTween.Play();
    glowTween.Play();

    playSound(slot, "RevealSound", options.sounds?.reveal ?? options.sounds?.success, soundVolume);

    task.delay(REVEAL_DURATION, () => {
      if (token !== revealToken) {
        return;
      }
      completed.Fire();
    });
  };

  const skip = () => {
    revealToken += 1;
    scale.Scale = 1;
    stroke.Transparency = 0.2;
    completed.Fire();
  };

  const completed = new Instance("BindableEvent");
  completed.Name = "Completed";
  completed.Parent = slot;

  return {
    slot,
    setVisible: (visible: boolean) => {
      slot.Visible = visible;
    },
    playReveal,
    skip,
    onCompleted: (handler: () => void) => completed.Event.Connect(handler),
    destroy: () => slot.Destroy(),
  };
};
