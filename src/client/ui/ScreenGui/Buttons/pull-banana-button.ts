import { Players, ReplicatedStorage } from "@rbxts/services";
import { mountInventoryPanel } from "../Panels/inventory-panel";
import type { BananaEntry } from "shared/banana-table";
import { PULL_BANANA_REMOTE } from "shared/remotes";
import { createBaseButton } from "../../components/buttons";
import { bindStandardActivation } from "../../components/buttons/activations";
import { BUTTONS_FOLDER_NAME, PULL_BANANA_BUTTON_CONFIG, SCREEN_GUI_NAME } from "../button-config";

const getOrCreateGui = (playerGui: PlayerGui) => {
  const existing = playerGui.FindFirstChild(SCREEN_GUI_NAME);
  if (existing && existing.IsA("ScreenGui")) {
    return existing;
  }

  const gui = new Instance("ScreenGui");
  gui.Name = SCREEN_GUI_NAME;
  gui.ResetOnSpawn = false;
  gui.Parent = playerGui;
  return gui;
};

const getOrCreateFolder = (parent: Instance, name: string) => {
  const existing = parent.FindFirstChild(name);
  if (existing && existing.IsA("Folder")) {
    return existing;
  }
  if (existing) {
    existing.Destroy();
  }

  const folder = new Instance("Folder");
  folder.Name = name;
  folder.Parent = parent;
  return folder;
};

const getPullBananaRemote = () => {
  const existing = ReplicatedStorage.FindFirstChild(PULL_BANANA_REMOTE);
  if (existing && existing.IsA("RemoteEvent")) {
    return existing;
  }

  return ReplicatedStorage.WaitForChild(PULL_BANANA_REMOTE) as RemoteEvent;
};

const ensureAspect = (parent: GuiObject, ratio: number) => {
  const existing = parent.FindFirstChildOfClass("UIAspectRatioConstraint");
  if (existing) {
    existing.AspectRatio = ratio;
    existing.DominantAxis = Enum.DominantAxis.Width;
    return existing;
  }

  const constraint = new Instance("UIAspectRatioConstraint");
  constraint.AspectRatio = ratio;
  constraint.DominantAxis = Enum.DominantAxis.Width;
  constraint.Parent = parent;
  return constraint;
};

export const mountPullBananaButton = () => {
  const player = Players.LocalPlayer;
  const playerGui = player.WaitForChild("PlayerGui") as PlayerGui;

  const gui = getOrCreateGui(playerGui);
  const buttonsFolder = getOrCreateFolder(gui, BUTTONS_FOLDER_NAME);
  const config = PULL_BANANA_BUTTON_CONFIG;

  const existingButton = buttonsFolder.FindFirstChild(config.buttonName);
  if (existingButton) {
    existingButton.Destroy();
  }

  const controller = createBaseButton({
    name: config.buttonName,
    parent: buttonsFolder,
    visible: config.visible,
    size: config.buttonSize,
    position: config.buttonPosition,
    anchorPoint: config.buttonAnchorPoint,
    palette: config.palette,
    stroke: config.stroke,
    cornerRadius: config.cornerRadius,
  });
  controller.button.Modal = config.modal;
  ensureAspect(controller.button, config.aspectRatio);

  const remote = getPullBananaRemote();
  const panelController = mountInventoryPanel(gui);

  bindStandardActivation(controller, () => {
    print("pull버튼 클릭");
    remote.FireServer();
  });

  remote.OnClientEvent.Connect((entry: BananaEntry) => {
    panelController.addItem(entry);
  });
};
