import { Players, ReplicatedStorage } from "@rbxts/services";
import type { InventorySnapshotResponse } from "shared/inventory-types";
import { INVENTORY_SNAPSHOT_REMOTE } from "shared/remotes";
import { createBaseButton } from "../../components/buttons";
import { bindStandardActivation } from "../../components/buttons/activations";
import { mountInventoryPanel } from "../Panels/inventory-panel";
import { BUTTONS_FOLDER_NAME, INVENTORY_BUTTON_CONFIG, SCREEN_GUI_NAME } from "../button-config";

const getSnapshotRemote = () => {
  const existing = ReplicatedStorage.FindFirstChild(INVENTORY_SNAPSHOT_REMOTE);
  if (existing && existing.IsA("RemoteFunction")) {
    return existing;
  }

  return ReplicatedStorage.WaitForChild(INVENTORY_SNAPSHOT_REMOTE) as RemoteFunction;
};

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

const getOrCreateFrame = (parent: Instance, name: string) => {
  const existing = parent.FindFirstChild(name);
  if (existing && existing.IsA("Frame")) {
    return existing;
  }
  if (existing) {
    existing.Destroy();
  }

  const frame = new Instance("Frame");
  frame.Name = name;
  frame.BackgroundTransparency = 1;
  frame.BorderSizePixel = 0;
  frame.Parent = parent;
  return frame;
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

export const mountInventoryButton = () => {
  const player = Players.LocalPlayer;
  const playerGui = player.WaitForChild("PlayerGui") as PlayerGui;

  const gui = getOrCreateGui(playerGui);
  const buttonsFolder = getOrCreateFolder(gui, BUTTONS_FOLDER_NAME);

  const config = INVENTORY_BUTTON_CONFIG;
  const inventoryContainer = getOrCreateFrame(buttonsFolder, config.containerName);
  inventoryContainer.AnchorPoint = config.containerAnchorPoint;
  inventoryContainer.Position = config.containerPosition;
  inventoryContainer.Size = config.containerSize;
  ensureAspect(inventoryContainer, config.aspectRatio);

  const existingButton = inventoryContainer.FindFirstChild(config.buttonName);
  if (existingButton) {
    existingButton.Destroy();
  }

  const controller = createBaseButton({
    name: config.buttonName,
    parent: inventoryContainer,
    visible: config.visible,
    size: config.buttonSize,
    position: config.buttonPosition,
    anchorPoint: config.buttonAnchorPoint,
    palette: config.palette,
    stroke: config.stroke,
    cornerRadius: config.cornerRadius,
  });
  controller.button.Modal = false;

  const panelController = mountInventoryPanel(gui);
  const snapshotRemote = getSnapshotRemote();
  const tryLoadSnapshot = (attempt: number) => {
    const [ok, result] = pcall(() => snapshotRemote.InvokeServer());
    if (!ok || !typeIs(result, "table")) {
      return;
    }
    const response = result as InventorySnapshotResponse;
    if (response.loaded) {
      panelController.setItems(response.items);
      return;
    }
    if (attempt < 5) {
      task.delay(0.3, () => tryLoadSnapshot(attempt + 1));
    }
  };

  bindStandardActivation(controller, () => {
    const nextVisible = !panelController.panel.Visible;
    panelController.panel.Visible = nextVisible;
    if (nextVisible) {
      tryLoadSnapshot(0);
    }
  });
};
