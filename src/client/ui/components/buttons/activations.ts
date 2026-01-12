import type { BaseButtonController, FeedbackStrength } from "./types";
import { PRESS_RESET_DELAY } from "./constants";

export type ActivationOptions = {
  autoPending?: boolean;
  blockedStrength?: FeedbackStrength;
  pressStrength?: FeedbackStrength;
};

const isPointerInput = (input: InputObject) =>
  input.UserInputType === Enum.UserInputType.MouseButton1 || input.UserInputType === Enum.UserInputType.Touch;

export const bindStandardActivation = (
  controller: BaseButtonController,
  handler: () => void,
  options?: ActivationOptions
) => {
  const button = controller.button;
  const blockedStrength = options?.blockedStrength ?? "weak";
  const pressStrength = options?.pressStrength ?? "strong";

  button.InputBegan.Connect((input) => {
    if (!isPointerInput(input)) {
      return;
    }
    if (!controller.canActivate()) {
      controller.playFailureFeedback(blockedStrength);
      return;
    }
    controller.setPressed(true);
    controller.playPressFeedback(pressStrength);
  });

  button.InputEnded.Connect((input) => {
    if (!isPointerInput(input)) {
      return;
    }
    controller.setPressed(false);
  });

  button.Activated.Connect(() => {
    if (!controller.canActivate()) {
      controller.playFailureFeedback(blockedStrength);
      return;
    }
    if (options?.autoPending && !controller.isPending()) {
      controller.setPending(true);
    }
    handler();
    controller.startCooldown();
    task.delay(PRESS_RESET_DELAY, () => controller.setPressed(false));
  });
};

export const bindTabActivation = (
  controller: BaseButtonController,
  handler: () => void,
  options?: ActivationOptions
) => {
  const button = controller.button;
  const blockedStrength = options?.blockedStrength ?? "weak";

  button.InputBegan.Connect((input) => {
    if (!isPointerInput(input)) {
      return;
    }
    if (!controller.canActivate()) {
      controller.playFailureFeedback(blockedStrength);
      return;
    }
    if (controller.isSelected()) {
      controller.playPressFeedback("weak");
      return;
    }
    controller.setPressed(true);
    controller.playPressFeedback("strong");
  });

  button.InputEnded.Connect((input) => {
    if (!isPointerInput(input)) {
      return;
    }
    controller.setPressed(false);
  });

  button.Activated.Connect(() => {
    if (!controller.canActivate()) {
      controller.playFailureFeedback(blockedStrength);
      return;
    }
    if (controller.isSelected()) {
      controller.playPressFeedback("weak");
      return;
    }
    handler();
    controller.startCooldown();
    task.delay(PRESS_RESET_DELAY, () => controller.setPressed(false));
  });
};
