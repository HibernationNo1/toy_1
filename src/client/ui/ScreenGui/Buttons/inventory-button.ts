import { Players, ReplicatedStorage, TweenService } from "@rbxts/services";
import type { InventorySnapshotResponse } from "shared/inventory-types";
import { INVENTORY_SNAPSHOT_REMOTE } from "shared/remotes";
import { mountInventoryPanel } from "../Panels/inventory-panel";

const GUI_NAME = "ScreenGui";
const BUTTONS_FOLDER_NAME = "Buttons";
const INVENTORY_CONTAINER_NAME = "Inventory";
const BUTTON_NAME = "InventoryButton";
const BUTTON_ASPECT_RATIO = 1.58;
const BUTTON_WIDTH_SCALE = 0.18;
const BUTTON_HEIGHT_SCALE = BUTTON_WIDTH_SCALE / BUTTON_ASPECT_RATIO;
const BUTTON_BASE_COLOR = Color3.fromRGB(0, 120, 255);
const BUTTON_FLASH_COLOR = Color3.fromRGB(255, 230, 0);

const getSnapshotRemote = () => {
  const existing = ReplicatedStorage.FindFirstChild(INVENTORY_SNAPSHOT_REMOTE);
  if (existing && existing.IsA("RemoteFunction")) {
    return existing;
  }

  return ReplicatedStorage.WaitForChild(INVENTORY_SNAPSHOT_REMOTE) as RemoteFunction;
};

const getOrCreateGui = (playerGui: PlayerGui) => {
  const existing = playerGui.FindFirstChild(GUI_NAME);
  if (existing && existing.IsA("ScreenGui")) {
    return existing;
  }

  const gui = new Instance("ScreenGui");
  gui.Name = GUI_NAME;
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

const ensureCorner = (parent: GuiObject) => {
  const existing = parent.FindFirstChildOfClass("UICorner");
  if (existing) {
    existing.CornerRadius = new UDim(0.1, 0);
    return existing;
  }

  const corner = new Instance("UICorner");
  corner.CornerRadius = new UDim(0.1, 0);
  corner.Parent = parent;
  return corner;
};

const ensureStroke = (parent: GuiObject, thickness: number, color: Color3, transparency: number) => {
  const existing = parent.FindFirstChildOfClass("UIStroke");
  if (existing) {
    existing.Thickness = thickness;
    existing.Transparency = transparency;
    existing.Color = color;
    existing.ApplyStrokeMode = Enum.ApplyStrokeMode.Border;
    existing.LineJoinMode = Enum.LineJoinMode.Round;
    return existing;
  }

  const stroke = new Instance("UIStroke");
  stroke.Thickness = thickness;
  stroke.Transparency = transparency;
  stroke.Color = color;
  stroke.ApplyStrokeMode = Enum.ApplyStrokeMode.Border;
  stroke.LineJoinMode = Enum.LineJoinMode.Round;
  stroke.Parent = parent;
  return stroke;
};

const createInventoryButton = (parent: GuiObject) => {
  const button = new Instance("TextButton");
  button.Name = BUTTON_NAME;
  button.Size = new UDim2(1, 0, 1, 0);
  button.BackgroundColor3 = BUTTON_BASE_COLOR;
  button.BorderSizePixel = 0;
  button.Text = "";
  button.TextTransparency = 1;
  button.Active = true;
  button.Modal = false;
  button.AutoButtonColor = false;
  button.Parent = parent;

  ensureCorner(button);
  ensureStroke(button, 2, Color3.fromRGB(255, 255, 255), 0.2);

  return button;
};

export const mountInventoryButton = () => {
  const player = Players.LocalPlayer;
  const playerGui = player.WaitForChild("PlayerGui") as PlayerGui;

  const gui = getOrCreateGui(playerGui);
  const buttonsFolder = getOrCreateFolder(gui, BUTTONS_FOLDER_NAME);
  const inventoryContainer = getOrCreateFrame(buttonsFolder, INVENTORY_CONTAINER_NAME);
  inventoryContainer.AnchorPoint = new Vector2(1, 0);
  inventoryContainer.Position = new UDim2(0.97, 0, 0.05, 0);
  inventoryContainer.Size = new UDim2(BUTTON_WIDTH_SCALE, 0, BUTTON_HEIGHT_SCALE, 0);
  ensureAspect(inventoryContainer, BUTTON_ASPECT_RATIO);

  const button =
    (inventoryContainer.FindFirstChild(BUTTON_NAME) as TextButton) ??
    createInventoryButton(inventoryContainer);

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

  const tweenClick = () => {
    const originalSize = button.Size;
    const shrunk = new UDim2(
      originalSize.X.Scale * 0.95,
      math.floor(originalSize.X.Offset * 0.95),
      originalSize.Y.Scale * 0.95,
      math.floor(originalSize.Y.Offset * 0.95)
    );

    const down = TweenService.Create(
      button,
      new TweenInfo(0.07, Enum.EasingStyle.Quad, Enum.EasingDirection.Out),
      { Size: shrunk, BackgroundColor3: BUTTON_FLASH_COLOR }
    );
    const up = TweenService.Create(
      button,
      new TweenInfo(0.09, Enum.EasingStyle.Quad, Enum.EasingDirection.Out),
      { Size: originalSize, BackgroundColor3: BUTTON_BASE_COLOR }
    );

    down.Completed.Connect(() => up.Play());
    down.Play();
  };

  button.Activated.Connect(() => {
    const nextVisible = !panelController.panel.Visible;
    panelController.panel.Visible = nextVisible;
    if (nextVisible) {
      tryLoadSnapshot(0);
    }
    tweenClick();
  });
};
