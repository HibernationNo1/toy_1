import { TweenService } from "@rbxts/services";
import { DEFAULT_ANCHOR, DEFAULT_MIN_SIZE, Z_INDEX_RANGES } from "./constants";
import type {
  AvailabilityMode,
  BaseButtonController,
  ButtonBaseOptions,
  ButtonFeedbackPalette,
  ButtonState,
  FeedbackStrength,
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

export const createBaseButton = (options: ButtonBaseOptions): BaseButtonController => {
  const layer = options.layer ?? "base";
  const zIndexRange = Z_INDEX_RANGES[layer];
  const zIndex = resolveZIndex(layer, options.zIndex);
  const childZIndex = clamp(zIndex + 1, zIndexRange.min, zIndexRange.max);
  const baseTransparency = options.backgroundTransparency ?? 0;
  const disabledTransparency = options.disabledTransparency ?? clamp(baseTransparency + 0.2, 0, 1);
  const baseImageTransparency = options.imageTransparency ?? 0;
  const disabledImageTransparency = options.disabledImageTransparency ?? clamp(baseImageTransparency + 0.35, 0, 1);
  const feedbackPalette: ButtonFeedbackPalette = options.feedbackPalette ?? {
    success: options.palette.pressed,
    failure: options.palette.disabled,
  };
  const soundVolume = options.sounds?.volume ?? 0.45;

  const button = new Instance("ImageButton");
  button.Name = options.name;
  button.Visible = options.visible;
  button.AnchorPoint = options.anchorPoint ?? DEFAULT_ANCHOR;
  button.Position = options.position;
  button.Size = options.size;
  button.BackgroundColor3 = options.palette.idle;
  button.BackgroundTransparency = baseTransparency;
  button.Image = options.image ?? "";
  button.ImageColor3 = options.imageColor ?? Color3.fromRGB(255, 255, 255);
  button.ImageTransparency = baseImageTransparency;
  button.ScaleType = options.scaleType ?? Enum.ScaleType.Fit;
  button.AutoButtonColor = false;
  button.Active = true;
  button.Selectable = false;
  button.ZIndex = zIndex;
  button.Parent = options.parent;

  ensureSizeConstraint(button, options.minSize ?? DEFAULT_MIN_SIZE);

  if (options.cornerRadius) {
    ensureCorner(button, options.cornerRadius);
  }
  if (options.stroke) {
    ensureStroke(
      button,
      options.stroke.thickness,
      options.stroke.color,
      options.stroke.transparency ?? 0
    );
  }

  let enabled = true;
  let pressed = false;
  let selected = false;
  let pending = false;
  let cooldownUntil = 0;
  const availabilityMode = options.availabilityMode ?? "disable";
  const stateHandlers: Array<(state: ButtonState) => void> = [];
  let flashToken = 0;

  const getState = (): ButtonState => {
    if (!enabled) {
      return "Disabled";
    }
    if (pending) {
      return "Pending";
    }
    if (pressed) {
      return "Pressed";
    }
    if (selected) {
      return "Selected";
    }
    return "Idle";
  };

  const resolveColor = (state: ButtonState) => {
    if (state === "Disabled") {
      return options.palette.disabled;
    }
    if (state === "Pressed") {
      return options.palette.pressed;
    }
    if (state === "Pending") {
      return options.palette.pending ?? options.palette.idle;
    }
    if (state === "Selected") {
      return options.palette.selected ?? options.palette.idle;
    }
    return options.palette.idle;
  };

  const applyState = () => {
    const state = getState();
    button.BackgroundColor3 = resolveColor(state);
    button.BackgroundTransparency = state === "Disabled" ? disabledTransparency : baseTransparency;
    button.ImageTransparency = state === "Disabled" ? disabledImageTransparency : baseImageTransparency;
    for (const handler of stateHandlers) {
      handler(state);
    }
  };

  const setPressed = (next: boolean) => {
    if (!enabled || pending) {
      pressed = false;
    } else {
      pressed = next;
    }
    applyState();
  };

  const setVisible = (visible: boolean) => {
    button.Visible = visible;
  };

  const setEnabled = (next: boolean, mode: AvailabilityMode = availabilityMode) => {
    enabled = next;
    if (!next) {
      pressed = false;
      pending = false;
      if (mode === "hide") {
        button.Visible = false;
      } else {
        button.Visible = true;
      }
    } else {
      button.Visible = true;
    }
    applyState();
  };

  const setSelected = (next: boolean) => {
    selected = next;
    applyState();
  };

  const setPending = (next: boolean) => {
    pending = next;
    if (pending) {
      pressed = false;
    }
    applyState();
  };

  const setState = (state: ButtonState) => {
    enabled = state !== "Disabled";
    pressed = state === "Pressed";
    pending = state === "Pending";
    selected = state === "Selected";
    if (!enabled && availabilityMode === "hide") {
      button.Visible = false;
    } else {
      button.Visible = true;
    }
    applyState();
  };

  const canActivate = () => enabled && !pending && os.clock() >= cooldownUntil;

  const startCooldown = () => {
    if (options.cooldownSeconds && options.cooldownSeconds > 0) {
      cooldownUntil = os.clock() + options.cooldownSeconds;
    }
  };

  const flash = (color: Color3, duration: number) => {
    flashToken += 1;
    const token = flashToken;
    button.BackgroundColor3 = color;
    task.delay(duration, () => {
      if (token !== flashToken) {
        return;
      }
      if (!button.Parent) {
        return;
      }
      applyState();
    });
  };

  const playPressFeedback = (strength: FeedbackStrength = "strong") => {
    const scale = ensureScale(button);
    const targetScale = strength === "strong" ? 0.95 : 0.98;
    const down = TweenService.Create(
      scale,
      new TweenInfo(0.07, Enum.EasingStyle.Quad, Enum.EasingDirection.Out),
      { Scale: targetScale }
    );
    const up = TweenService.Create(
      scale,
      new TweenInfo(0.09, Enum.EasingStyle.Quad, Enum.EasingDirection.Out),
      { Scale: 1 }
    );
    down.Completed.Connect(() => up.Play());
    down.Play();
    flash(options.palette.pressed, 0.08);
    playSound(button, "ClickSound", options.sounds?.click, soundVolume);
  };

  const playSuccessFeedback = () => {
    flash(feedbackPalette.success, 0.12);
    playSound(button, "SuccessSound", options.sounds?.success, soundVolume);
  };

  const playFailureFeedback = (strength: FeedbackStrength = "strong") => {
    flash(feedbackPalette.failure, 0.12);
    playSound(button, "FailureSound", options.sounds?.failure, soundVolume);
    const rotation = strength === "strong" ? 4 : 2;
    const originalRotation = button.Rotation;
    const left = TweenService.Create(
      button,
      new TweenInfo(0.05, Enum.EasingStyle.Quad, Enum.EasingDirection.Out),
      { Rotation: originalRotation - rotation }
    );
    const right = TweenService.Create(
      button,
      new TweenInfo(0.05, Enum.EasingStyle.Quad, Enum.EasingDirection.Out),
      { Rotation: originalRotation + rotation }
    );
    const reset = TweenService.Create(
      button,
      new TweenInfo(0.05, Enum.EasingStyle.Quad, Enum.EasingDirection.Out),
      { Rotation: originalRotation }
    );
    left.Completed.Connect(() => right.Play());
    right.Completed.Connect(() => reset.Play());
    left.Play();
  };

  const onStateChange = (handler: (state: ButtonState) => void) => {
    stateHandlers.push(handler);
    handler(getState());
  };

  applyState();

  return {
    button,
    getState,
    getChildZIndex: () => childZIndex,
    isSelected: () => selected,
    isPending: () => pending,
    setVisible,
    setEnabled,
    setSelected,
    setPending,
    setPressed,
    setState,
    canActivate,
    startCooldown,
    playPressFeedback,
    playSuccessFeedback,
    playFailureFeedback,
    onStateChange,
    destroy: () => button.Destroy(),
  };
};
