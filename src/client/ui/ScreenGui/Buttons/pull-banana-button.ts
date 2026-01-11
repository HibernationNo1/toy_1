import { Players, ReplicatedStorage, TweenService } from "@rbxts/services";
import { mountInventoryPanel } from "../Panels/inventory-panel";
import type { BananaEntry } from "shared/banana-table";
import { PULL_BANANA_REMOTE } from "shared/remotes";

const GUI_NAME = "ScreenGui";
const BUTTONS_FOLDER_NAME = "Buttons";
const BUTTON_NAME = "PullBanana";
const BUTTON_ASPECT_RATIO = 1.58;
const BUTTON_WIDTH_SCALE = 0.18;
const BUTTON_HEIGHT_SCALE = BUTTON_WIDTH_SCALE / BUTTON_ASPECT_RATIO;
const BUTTON_BASE_COLOR = Color3.fromRGB(212, 80, 80);
const BUTTON_FLASH_COLOR = Color3.fromRGB(184, 53, 53);

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

const getOrCreateTextButton = (parent: Instance, name: string) => {
  const existing = parent.FindFirstChild(name);
  if (existing && existing.IsA("TextButton")) {
    return existing;
  }
  if (existing) {
    existing.Destroy();
  }

  const button = new Instance("TextButton");
  button.Name = name;
  button.Parent = parent;
  return button;
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

const ensureStroke = (parent: GuiObject, thickness: number, transparency: number) => {
  const existing = parent.FindFirstChildOfClass("UIStroke");
  if (existing) {
    existing.Thickness = thickness;
    existing.Transparency = transparency;
    existing.Color = Color3.fromRGB(255, 255, 255);
    existing.ApplyStrokeMode = Enum.ApplyStrokeMode.Border;
    existing.LineJoinMode = Enum.LineJoinMode.Round;
    return existing;
  }

  const stroke = new Instance("UIStroke");
  stroke.Thickness = thickness;
  stroke.Transparency = transparency;
  stroke.Color = Color3.fromRGB(255, 255, 255);
  stroke.ApplyStrokeMode = Enum.ApplyStrokeMode.Border;
  stroke.LineJoinMode = Enum.LineJoinMode.Round;
  stroke.Parent = parent;
  return stroke;
};

export const mountPullBananaButton = () => {
  const player = Players.LocalPlayer;
  const playerGui = player.WaitForChild("PlayerGui") as PlayerGui;

  const gui = getOrCreateGui(playerGui);
  const buttonsFolder = getOrCreateFolder(gui, BUTTONS_FOLDER_NAME);
  const button = getOrCreateTextButton(buttonsFolder, BUTTON_NAME);
  const remote = getPullBananaRemote();
  const panelController = mountInventoryPanel(gui);

  button.AnchorPoint = new Vector2(0, 1);
  button.Position = new UDim2(0.03, 0, 0.95, 0);
  button.Size = new UDim2(BUTTON_WIDTH_SCALE, 0, BUTTON_HEIGHT_SCALE, 0);
  button.BackgroundColor3 = BUTTON_BASE_COLOR;
  button.BorderSizePixel = 0;
  button.Text = "";
  button.TextTransparency = 1;
  button.Active = true;
  button.Modal = true;
  button.AutoButtonColor = false;

  ensureAspect(button, BUTTON_ASPECT_RATIO);
  ensureCorner(button);
  ensureStroke(button, 2, 0.2);

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
    print("pull버튼 클릭");
    remote.FireServer();
    tweenClick();
  });

  remote.OnClientEvent.Connect((entry: BananaEntry) => {
    panelController.addItem(entry);
  });
};
