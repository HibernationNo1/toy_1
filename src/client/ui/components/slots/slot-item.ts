import { TweenService } from "@rbxts/services";
import {
  DEFAULT_ANCHOR,
  DEFAULT_MIN_SIZE,
  DEFAULT_RARITY_COLORS,
  DEFAULT_RARITY_FALLBACK,
  DEFAULT_SLOT_CORNER,
  DEFAULT_SLOT_FEEDBACK_PALETTE,
  DEFAULT_SLOT_PALETTE,
  DEFAULT_SLOT_STROKE,
  DEFAULT_SLOT_TEXT_STYLE,
  PRESS_RESET_DELAY,
  SLOT_Z_INDEX_RANGES,
} from "./constants";
import type {
  AvailabilityMode,
  FeedbackStrength,
  SlotItemController,
  SlotItemData,
  SlotItemFeedbackPalette,
  SlotItemOptions,
  SlotItemPalette,
  SlotItemTextStyle,
  SlotState,
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

const isPointerInput = (input: InputObject) =>
  input.UserInputType === Enum.UserInputType.MouseButton1 || input.UserInputType === Enum.UserInputType.Touch;

export const createSlotItem = (options: SlotItemOptions): SlotItemController => {
  const palette: SlotItemPalette = { ...DEFAULT_SLOT_PALETTE, ...(options.palette ?? {}) };
  const feedbackPalette: SlotItemFeedbackPalette = {
    ...DEFAULT_SLOT_FEEDBACK_PALETTE,
    ...(options.feedbackPalette ?? {}),
  };
  const textStyle: SlotItemTextStyle = { ...DEFAULT_SLOT_TEXT_STYLE, ...(options.textStyle ?? {}) };
  const rarityColors = options.rarityColors ?? DEFAULT_RARITY_COLORS;
  const rarityFallback = options.rarityFallbackColor ?? DEFAULT_RARITY_FALLBACK;
  const availabilityMode: AvailabilityMode = options.availabilityMode ?? "disable";
  const soundVolume = options.sounds?.volume ?? 0.45;
  const showRarityBar = options.showRarityBar ?? true;
  const rarityBarHeight = options.rarityBarHeight ?? 6;
  const lockedOverlayTransparency = options.lockedOverlayTransparency ?? 0.45;
  const autoSuccessFeedback = options.autoSuccessFeedback ?? false;

  const layer = options.layer ?? "base";
  const zIndexRange = SLOT_Z_INDEX_RANGES[layer];
  const zIndex = resolveZIndex(layer, options.zIndex);
  const childZIndex = clamp(zIndex + 1, zIndexRange.min, zIndexRange.max);
  const overlayZIndex = clamp(childZIndex + 1, zIndexRange.min, zIndexRange.max);
  const hitZIndex = clamp(overlayZIndex + 1, zIndexRange.min, zIndexRange.max);

  const slot = new Instance("Frame");
  slot.Name = options.name;
  slot.Visible = options.visible;
  slot.AnchorPoint = options.anchorPoint ?? DEFAULT_ANCHOR;
  slot.Position = options.position;
  slot.Size = options.size;
  slot.BackgroundColor3 = palette.idle;
  slot.BorderSizePixel = 0;
  slot.ZIndex = zIndex;
  slot.Parent = options.parent;

  ensureSizeConstraint(slot, options.minSize ?? DEFAULT_MIN_SIZE);
  ensureCorner(slot, options.cornerRadius ?? DEFAULT_SLOT_CORNER);

  const strokeConfig = {
    thickness: options.stroke?.thickness ?? DEFAULT_SLOT_STROKE.thickness,
    color: options.stroke?.color ?? DEFAULT_SLOT_STROKE.color,
    transparency: options.stroke?.transparency ?? DEFAULT_SLOT_STROKE.transparency,
  };
  const stroke = ensureStroke(slot, strokeConfig.thickness, strokeConfig.color, strokeConfig.transparency);

  const rarityBar = new Instance("Frame");
  rarityBar.Name = "RarityBar";
  rarityBar.Size = new UDim2(1, 0, 0, rarityBarHeight);
  rarityBar.Position = new UDim2(0, 0, 1, -rarityBarHeight);
  rarityBar.BackgroundColor3 = rarityFallback;
  rarityBar.BorderSizePixel = 0;
  rarityBar.Visible = showRarityBar;
  rarityBar.ZIndex = childZIndex;
  rarityBar.Parent = slot;

  const icon = new Instance("ImageLabel");
  icon.Name = "Icon";
  icon.BackgroundTransparency = 1;
  icon.AnchorPoint = new Vector2(0.5, 0.45);
  icon.Position = new UDim2(0.5, 0, 0.45, 0);
  icon.Size = new UDim2(0.7, 0, 0.5, 0);
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
  nameLabel.Size = new UDim2(1, -16, 0.25, 0);
  nameLabel.Text = "";
  nameLabel.TextColor3 = textStyle.nameColor;
  nameLabel.Font = textStyle.font;
  nameLabel.TextScaled = true;
  nameLabel.TextWrapped = true;
  nameLabel.ZIndex = childZIndex;
  nameLabel.Parent = slot;

  const qtyLabel = new Instance("TextLabel");
  qtyLabel.Name = "Qty";
  qtyLabel.BackgroundTransparency = 1;
  qtyLabel.AnchorPoint = new Vector2(1, 1);
  qtyLabel.Position = new UDim2(1, -8, 1, -8);
  qtyLabel.Size = new UDim2(0.4, 0, 0.2, 0);
  qtyLabel.Text = "";
  qtyLabel.TextColor3 = textStyle.qtyColor;
  qtyLabel.Font = textStyle.qtyFont;
  qtyLabel.TextScaled = true;
  qtyLabel.TextXAlignment = Enum.TextXAlignment.Right;
  qtyLabel.TextYAlignment = Enum.TextYAlignment.Bottom;
  qtyLabel.Visible = false;
  qtyLabel.ZIndex = childZIndex;
  qtyLabel.Parent = slot;

  const lockedOverlay = new Instance("Frame");
  lockedOverlay.Name = "LockedOverlay";
  lockedOverlay.Size = new UDim2(1, 0, 1, 0);
  lockedOverlay.BackgroundColor3 = Color3.fromRGB(0, 0, 0);
  lockedOverlay.BackgroundTransparency = lockedOverlayTransparency;
  lockedOverlay.BorderSizePixel = 0;
  lockedOverlay.Visible = false;
  lockedOverlay.ZIndex = overlayZIndex;
  lockedOverlay.Parent = slot;

  const hitButton = new Instance("TextButton");
  hitButton.Name = "HitArea";
  hitButton.Size = new UDim2(1, 0, 1, 0);
  hitButton.BackgroundTransparency = 1;
  hitButton.Text = "";
  hitButton.AutoButtonColor = false;
  hitButton.Active = true;
  hitButton.Selectable = false;
  hitButton.ZIndex = hitZIndex;
  hitButton.Parent = slot;

  let currentData: SlotItemData = { name: "" };
  let selected = false;
  let locked = false;
  let clickable = options.clickable ?? true;
  let flashToken = 0;
  let lastBlockedAt = 0;

  if (!clickable && availabilityMode === "hide") {
    slot.Visible = false;
  }

  const getState = (): SlotState => {
    if (locked) {
      return "Locked";
    }
    if (selected) {
      return "Selected";
    }
    return "Idle";
  };

  const applyState = () => {
    const state = getState();
    if (state === "Locked") {
      slot.BackgroundColor3 = palette.locked;
      stroke.Color = strokeConfig.color;
      stroke.Transparency = strokeConfig.transparency;
      stroke.Thickness = strokeConfig.thickness;
      lockedOverlay.Visible = true;
      nameLabel.TextTransparency = 0.4;
      icon.ImageTransparency = 0.4;
      qtyLabel.TextTransparency = 0.4;
      return;
    }

    lockedOverlay.Visible = false;
    nameLabel.TextTransparency = 0;
    icon.ImageTransparency = 0;
    qtyLabel.TextTransparency = 0;

    if (state === "Selected") {
      slot.BackgroundColor3 = palette.selected;
      stroke.Color = palette.selected;
      stroke.Transparency = 0.2;
      stroke.Thickness = strokeConfig.thickness + 1;
      return;
    }

    slot.BackgroundColor3 = palette.idle;
    stroke.Color = strokeConfig.color;
    stroke.Transparency = strokeConfig.transparency;
    stroke.Thickness = strokeConfig.thickness;
  };

  const resolveRarityColor = (rarity?: string) => {
    if (!rarity) {
      return rarityFallback;
    }
    const key = rarity.lower();
    return rarityColors[key] ?? rarityFallback;
  };

  const flash = (color: Color3, duration: number) => {
    flashToken += 1;
    const token = flashToken;
    slot.BackgroundColor3 = color;
    task.delay(duration, () => {
      if (token !== flashToken) {
        return;
      }
      if (!slot.Parent) {
        return;
      }
      applyState();
    });
  };

  const playPressFeedback = () => {
    const scale = ensureScale(slot);
    const down = TweenService.Create(
      scale,
      new TweenInfo(0.07, Enum.EasingStyle.Quad, Enum.EasingDirection.Out),
      { Scale: 0.96 }
    );
    const up = TweenService.Create(
      scale,
      new TweenInfo(0.09, Enum.EasingStyle.Quad, Enum.EasingDirection.Out),
      { Scale: 1 }
    );
    down.Completed.Connect(() => up.Play());
    down.Play();
    flash(palette.pressed, 0.08);
    playSound(slot, "ClickSound", options.sounds?.click, soundVolume);
  };

  const playSuccessFeedback = () => {
    flash(feedbackPalette.success, 0.12);
    playSound(slot, "SuccessSound", options.sounds?.success, soundVolume);
  };

  const playFailureFeedback = (strength: FeedbackStrength = "weak") => {
    flash(feedbackPalette.failure, 0.12);
    playSound(slot, "FailureSound", options.sounds?.failure, soundVolume);
    const rotation = strength === "strong" ? 4 : 2;
    const originalRotation = slot.Rotation;
    const left = TweenService.Create(
      slot,
      new TweenInfo(0.05, Enum.EasingStyle.Quad, Enum.EasingDirection.Out),
      { Rotation: originalRotation - rotation }
    );
    const right = TweenService.Create(
      slot,
      new TweenInfo(0.05, Enum.EasingStyle.Quad, Enum.EasingDirection.Out),
      { Rotation: originalRotation + rotation }
    );
    const reset = TweenService.Create(
      slot,
      new TweenInfo(0.05, Enum.EasingStyle.Quad, Enum.EasingDirection.Out),
      { Rotation: originalRotation }
    );
    left.Completed.Connect(() => right.Play());
    right.Completed.Connect(() => reset.Play());
    left.Play();
  };

  const setSelected = (next: boolean) => {
    selected = next;
    applyState();
  };

  const setLocked = (next: boolean) => {
    locked = next;
    applyState();
  };

  const setVisible = (visible: boolean) => {
    slot.Visible = visible;
  };

  const setClickable = (next: boolean, mode: AvailabilityMode = availabilityMode) => {
    clickable = next;
    if (!next && mode === "hide") {
      slot.Visible = false;
    } else {
      slot.Visible = true;
    }
  };

  const setBorderColor = (color: Color3) => {
    strokeConfig.color = color;
    applyState();
  };

  const setItem = (data: SlotItemData) => {
    currentData = { ...currentData, ...data };
    nameLabel.Text = data.name;
    if (data.icon && data.icon.size() > 0) {
      icon.Image = data.icon;
      icon.Visible = true;
    } else {
      icon.Image = "";
      icon.Visible = false;
    }

    const qty = data.qty ?? 0;
    if (qty > 1) {
      qtyLabel.Text = `x${qty}`;
      qtyLabel.Visible = true;
    } else {
      qtyLabel.Text = "";
      qtyLabel.Visible = false;
    }

    rarityBar.BackgroundColor3 = resolveRarityColor(data.rarity);

    if (data.locked !== undefined) {
      locked = data.locked;
    }
    if (data.selected !== undefined) {
      selected = data.selected;
    }
    applyState();
  };

  const activated = new Instance("BindableEvent");
  activated.Name = "Activated";
  activated.Parent = slot;

  const canActivate = () => clickable && !locked;

  hitButton.InputBegan.Connect((input) => {
    if (!isPointerInput(input)) {
      return;
    }
    if (!canActivate()) {
      lastBlockedAt = os.clock();
      playFailureFeedback("weak");
      return;
    }
    playPressFeedback();
  });

  hitButton.Activated.Connect(() => {
    if (!canActivate()) {
      if (os.clock() - lastBlockedAt > 0.15) {
        playFailureFeedback("weak");
      }
      return;
    }
    if (autoSuccessFeedback) {
      playSuccessFeedback();
    }
    activated.Fire(currentData);
    task.delay(PRESS_RESET_DELAY, () => {
      applyState();
    });
  });

  applyState();

  return {
    slot,
    getState,
    getData: () => currentData,
    setItem,
    setSelected,
    setLocked,
    setVisible,
    setClickable,
    setBorderColor,
    onActivated: (handler: (data: SlotItemData) => void) => activated.Event.Connect(handler),
    playSuccessFeedback,
    playFailureFeedback,
    destroy: () => slot.Destroy(),
  };
};
