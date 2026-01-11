import { Players, ReplicatedStorage, TweenService } from "@rbxts/services";
import type { BananaEntry } from "shared/banana-table";
import type {
  BananaSlot,
  BananaSlotClickRequest,
  BananaSlotClickResponse,
  BananaSlotsRequest,
  BananaSlotsResponse,
} from "shared/banana-slots";
import type { InventorySnapshotResponse } from "shared/inventory-types";
import {
  BANANA_SLOT_CLICK_REMOTE,
  BANANA_SLOTS_REMOTE,
  INVENTORY_SNAPSHOT_REMOTE,
  PULL_BANANA_REMOTE,
} from "shared/remotes";

const GUI_NAME = "ScreenGui";
const PANELS_FOLDER_NAME = "Panels";
const PANEL_NAME = "BananaSubmitPanel";
const PANEL_ASPECT_RATIO = 3;
const PANEL_WIDTH_SCALE = 0.5;
const PANEL_HEIGHT_SCALE = PANEL_WIDTH_SCALE / PANEL_ASPECT_RATIO;
const PANEL_BACKGROUND_COLOR = Color3.fromRGB(189, 189, 189);
const PANEL_STROKE_COLOR = Color3.fromRGB(66, 66, 66);
const SLOT_ACTIVE_COLOR = Color3.fromRGB(217, 217, 217);
const SLOT_INACTIVE_COLOR = Color3.fromRGB(69, 69, 69);
const SLOT_FLASH_COLOR = Color3.fromRGB(212, 182, 182);
const SLOT_OWNED_FLASH_COLOR = Color3.fromRGB(168, 205, 227);
const SLOT_OWNED_BORDER_COLOR = Color3.fromRGB(217, 213, 184);
const SLOT_UNOWNED_BORDER_COLOR = Color3.fromRGB(209, 177, 163);
const SLOT_STROKE_THICKNESS = 3;
const SLOT_COUNT = 3;
const REROLL_SLOT_NAME = "RerollSlot";
const REROLL_SLOT_SCALE = 0.8;
const REROLL_SLOT_COLOR = Color3.fromRGB(200, 200, 200);
const REROLL_SLOT_STROKE_COLOR = Color3.fromRGB(140, 140, 140);
const slotActiveFlags = new Map<number, boolean>();
const ownedBananaIds = new Set<string>();

type SlotInfo = {
  slot: TextButton;
  label: TextLabel;
  index: number;
};

let slotInfos: SlotInfo[] = [];

type BananaSubmitPanelOptions = {
  activeSlots?: boolean[];
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
  frame.Parent = parent;
  return frame;
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

const getOrCreateTextLabel = (parent: Instance, name: string) => {
  const existing = parent.FindFirstChild(name);
  if (existing && existing.IsA("TextLabel")) {
    return existing;
  }
  if (existing) {
    existing.Destroy();
  }

  const label = new Instance("TextLabel");
  label.Name = name;
  label.Parent = parent;
  return label;
};

const getSnapshotRemote = () => {
  const existing = ReplicatedStorage.FindFirstChild(INVENTORY_SNAPSHOT_REMOTE);
  if (existing && existing.IsA("RemoteFunction")) {
    return existing;
  }

  return ReplicatedStorage.WaitForChild(INVENTORY_SNAPSHOT_REMOTE) as RemoteFunction;
};

const getSlotsRemote = () => {
  const existing = ReplicatedStorage.FindFirstChild(BANANA_SLOTS_REMOTE);
  if (existing && existing.IsA("RemoteFunction")) {
    return existing;
  }

  return ReplicatedStorage.WaitForChild(BANANA_SLOTS_REMOTE) as RemoteFunction;
};

const getSlotClickRemote = () => {
  const existing = ReplicatedStorage.FindFirstChild(BANANA_SLOT_CLICK_REMOTE);
  if (existing && existing.IsA("RemoteFunction")) {
    return existing;
  }

  return ReplicatedStorage.WaitForChild(BANANA_SLOT_CLICK_REMOTE) as RemoteFunction;
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

const ensureStroke = (parent: GuiObject, thickness: number, color: Color3, transparency: number) => {
  const existing = parent.FindFirstChildOfClass("UIStroke");
  if (existing) {
    existing.Thickness = thickness;
    existing.Transparency = transparency;
    existing.Color = color;
    existing.ApplyStrokeMode = Enum.ApplyStrokeMode.Border;
    existing.LineJoinMode = Enum.LineJoinMode.Miter;
    return existing;
  }

  const stroke = new Instance("UIStroke");
  stroke.Thickness = thickness;
  stroke.Transparency = transparency;
  stroke.Color = color;
  stroke.ApplyStrokeMode = Enum.ApplyStrokeMode.Border;
  stroke.LineJoinMode = Enum.LineJoinMode.Miter;
  stroke.Parent = parent;
  return stroke;
};

const ensureScale = (parent: GuiObject) => {
  const existing = parent.FindFirstChildOfClass("UIScale");
  if (existing) {
    return existing;
  }

  const scale = new Instance("UIScale");
  scale.Parent = parent;
  return scale;
};

const getSlotActive = (index: number) => {
  const existing = slotActiveFlags.get(index);
  if (existing !== undefined) {
    return existing;
  }
  slotActiveFlags.set(index, true);
  return true;
};

const applyActiveSlots = (activeSlots?: boolean[]) => {
  if (!activeSlots) {
    return;
  }
  for (let i = 1; i <= SLOT_COUNT; i += 1) {
    const value = activeSlots[i - 1];
    if (value !== undefined) {
      slotActiveFlags.set(i, value);
    }
  }
};

const applySlotOwnership = (slot: TextButton, index: number) => {
  const stroke = ensureStroke(slot, SLOT_STROKE_THICKNESS, PANEL_STROKE_COLOR, 0.2);
  stroke.Thickness = SLOT_STROKE_THICKNESS;

  if (!getSlotActive(index)) {
    stroke.Color = PANEL_STROKE_COLOR;
    return;
  }

  const bananaId = slot.GetAttribute("BananaId");
  const owned = typeIs(bananaId, "string") && ownedBananaIds.has(bananaId);
  stroke.Color = owned ? SLOT_OWNED_BORDER_COLOR : SLOT_UNOWNED_BORDER_COLOR;
};

const applySlotState = (slot: TextButton, index: number) => {
  const isActive = getSlotActive(index);
  slot.Active = isActive;
  slot.AutoButtonColor = false;
  slot.BackgroundColor3 = isActive ? SLOT_ACTIVE_COLOR : SLOT_INACTIVE_COLOR;
  slot.SetAttribute("Active", isActive);
  return isActive;
};

const applyOwnedSlotStrokes = () => {
  for (const slotInfo of slotInfos) {
    applySlotOwnership(slotInfo.slot, slotInfo.index);
  }
};

const applySlots = (slots: BananaSlot[]) => {
  for (const slotInfo of slotInfos) {
    const slotData = slots.find((slot) => slot.index === slotInfo.index);
    if (!slotData) {
      slotInfo.slot.SetAttribute("BananaId", "");
      slotInfo.label.Text = "";
      applySlotOwnership(slotInfo.slot, slotInfo.index);
      continue;
    }
    slotInfo.slot.SetAttribute("BananaId", slotData.id);
    slotInfo.label.Text = slotData.name;
    applySlotOwnership(slotInfo.slot, slotInfo.index);
  }
};

const syncOwnedBananas = (items: InventorySnapshotResponse["items"]) => {
  ownedBananaIds.clear();
  for (const item of items) {
    if (item.qty > 0) {
      ownedBananaIds.add(item.id);
    }
  }
};

const applySlotLayout = (
  panel: Frame,
  slotsFrame: Frame,
  layout: UIGridLayout,
  rerollSlot: TextButton
) => {
  const padding = 6;
  const spacing = 4;
  const panelSize = panel.AbsoluteSize;
  const availableWidth = panelSize.X - padding * 2;
  const availableHeight = panelSize.Y - padding * 2;
  if (availableWidth <= 0 || availableHeight <= 0) {
    return;
  }

  const slotSizeByWidth = (availableWidth - spacing * 3) / (SLOT_COUNT + REROLL_SLOT_SCALE);
  const slotSize = math.floor(math.min(slotSizeByWidth, availableHeight));
  if (slotSize <= 0) {
    return;
  }
  const rerollSize = math.floor(slotSize * REROLL_SLOT_SCALE);
  const slotsWidth = slotSize * SLOT_COUNT + spacing * (SLOT_COUNT - 1);

  slotsFrame.AnchorPoint = new Vector2(0, 0.5);
  slotsFrame.Position = new UDim2(0, padding, 0.5, 0);
  slotsFrame.Size = new UDim2(0, slotsWidth, 0, slotSize);

  layout.CellSize = new UDim2(0, slotSize, 0, slotSize);
  layout.CellPadding = new UDim2(0, spacing, 0, 0);

  rerollSlot.AnchorPoint = new Vector2(1, 0.5);
  rerollSlot.Position = new UDim2(1, -padding, 0.5, 0);
  rerollSlot.Size = new UDim2(0, rerollSize, 0, rerollSize);
};

const playSlotClick = (slot: TextButton, baseColor: Color3, flashColor: Color3) => {
  const scale = ensureScale(slot);
  const down = TweenService.Create(
    scale,
    new TweenInfo(0.07, Enum.EasingStyle.Quad, Enum.EasingDirection.Out),
    { Scale: 0.95 }
  );
  const up = TweenService.Create(
    scale,
    new TweenInfo(0.09, Enum.EasingStyle.Quad, Enum.EasingDirection.Out),
    { Scale: 1 }
  );
  const flash = TweenService.Create(
    slot,
    new TweenInfo(0.07, Enum.EasingStyle.Quad, Enum.EasingDirection.Out),
    { BackgroundColor3: flashColor }
  );
  const unflash = TweenService.Create(
    slot,
    new TweenInfo(0.09, Enum.EasingStyle.Quad, Enum.EasingDirection.Out),
    { BackgroundColor3: baseColor }
  );

  down.Completed.Connect(() => {
    up.Play();
    unflash.Play();
  });
  flash.Play();
  down.Play();
};

const delaySeconds = (seconds: number, callback: () => void) => {
  if (seconds <= 0) {
    callback();
    return;
  }
  task.delay(seconds, callback);
};

export const mountBananaSubmitPanel = (options?: BananaSubmitPanelOptions) => {
  const player = Players.LocalPlayer;
  const playerGui = player.WaitForChild("PlayerGui") as PlayerGui;
  applyActiveSlots(options?.activeSlots);
  const gui = getOrCreateGui(playerGui);
  const panelsFolder = getOrCreateFolder(gui, PANELS_FOLDER_NAME);
  const panel = getOrCreateFrame(panelsFolder, PANEL_NAME);

  panel.AnchorPoint = new Vector2(1, 1);
  panel.Position = new UDim2(0.95, 0, 0.95, 0);
  panel.Size = new UDim2(PANEL_WIDTH_SCALE, 0, PANEL_HEIGHT_SCALE, 0);
  panel.BackgroundColor3 = PANEL_BACKGROUND_COLOR;
  panel.BorderSizePixel = 0;
  panel.Active = true;
  panel.Visible = true;
  ensureAspect(panel, PANEL_ASPECT_RATIO);
  ensureStroke(panel, 1, PANEL_STROKE_COLOR, 0.2);

  const slotsFrame = getOrCreateFrame(panel, "Slots");
  slotsFrame.BackgroundTransparency = 1;
  slotsFrame.BorderSizePixel = 0;

  const rerollSlot = getOrCreateTextButton(panel, REROLL_SLOT_NAME);
  rerollSlot.BackgroundColor3 = REROLL_SLOT_COLOR;
  rerollSlot.BorderSizePixel = 0;
  rerollSlot.Text = "";
  rerollSlot.TextTransparency = 1;
  rerollSlot.Active = true;
  rerollSlot.Modal = false;
  rerollSlot.AutoButtonColor = false;
  ensureStroke(rerollSlot, SLOT_STROKE_THICKNESS, REROLL_SLOT_STROKE_COLOR, 0.2);

  const existingLayout = slotsFrame.FindFirstChildOfClass("UIGridLayout");
  const layout = existingLayout ?? new Instance("UIGridLayout");
  layout.FillDirection = Enum.FillDirection.Horizontal;
  layout.HorizontalAlignment = Enum.HorizontalAlignment.Center;
  layout.VerticalAlignment = Enum.VerticalAlignment.Center;
  layout.SortOrder = Enum.SortOrder.LayoutOrder;
  layout.Parent = slotsFrame;

  slotInfos = [];

  for (let i = 1; i <= SLOT_COUNT; i += 1) {
    const slot = getOrCreateTextButton(slotsFrame, `Slot${i}`);
    slot.LayoutOrder = i;
    slot.BorderSizePixel = 0;
    slot.Text = "";
    slot.TextTransparency = 1;
    slot.Selectable = false;
    applySlotState(slot, i);
    ensureStroke(slot, SLOT_STROKE_THICKNESS, PANEL_STROKE_COLOR, 0.2);

    const nameLabel = getOrCreateFrame(slot, "NameLabel");
    nameLabel.BackgroundTransparency = 1;
    nameLabel.BorderSizePixel = 0;
    nameLabel.Size = new UDim2(1, -6, 1, -6);
    nameLabel.Position = new UDim2(0, 3, 0, 3);

    const text = getOrCreateTextLabel(nameLabel, "NameText");
    text.BackgroundTransparency = 1;
    text.Size = new UDim2(1, 0, 1, 0);
    text.TextColor3 = Color3.fromRGB(40, 40, 40);
    text.TextScaled = true;
    text.TextWrapped = true;
    const slotInfo: SlotInfo = { slot, label: text, index: i };
    slotInfos.push(slotInfo);

    slot.Activated.Connect(() => {
      if (!getSlotActive(i)) {
        return;
      }
      const bananaId = slot.GetAttribute("BananaId");
      if (!typeIs(bananaId, "string") || bananaId.size() === 0) {
        return;
      }
      const slotClickRemote = getSlotClickRemote();
      const request: BananaSlotClickRequest = { slotIndex: i, slotId: bananaId };
      const [ok, result] = pcall(() => slotClickRemote.InvokeServer(request));
      if (!ok || !typeIs(result, "table")) {
        return;
      }
      const response = result as BananaSlotClickResponse;
      const awarded = response.awarded === true;
      const baseColor = SLOT_ACTIVE_COLOR;
      const flashColor = awarded ? SLOT_OWNED_FLASH_COLOR : SLOT_FLASH_COLOR;
      playSlotClick(slot, baseColor, flashColor);
      print(`${i}번째 슬롯 클릭`);
      if (awarded) {
        delaySeconds(0.5, () => {
          fetchSlots({ reroll: true });
        });
      }
    });
  }

  const slotsRemote = getSlotsRemote();
  const fetchSlots = (request?: BananaSlotsRequest) => {
    const [ok, result] = pcall(() => slotsRemote.InvokeServer(request));
    if (!ok || !typeIs(result, "table")) {
      return;
    }
    const response = result as BananaSlotsResponse;
    applySlots(response.slots);
  };

  rerollSlot.Activated.Connect(() => {
    fetchSlots({ reroll: true });
  });

  const refreshLayout = () => applySlotLayout(panel, slotsFrame, layout, rerollSlot);
  refreshLayout();
  panel.GetPropertyChangedSignal("AbsoluteSize").Connect(refreshLayout);

  fetchSlots();

  const snapshotRemote = getSnapshotRemote();
  const tryLoadSnapshot = (attempt: number) => {
    const [ok, result] = pcall(() => snapshotRemote.InvokeServer());
    if (!ok || !typeIs(result, "table")) {
      return;
    }
    const response = result as InventorySnapshotResponse;
    if (response.loaded) {
      syncOwnedBananas(response.items);
      applyOwnedSlotStrokes();
      return;
    }
    if (attempt < 5) {
      task.delay(0.3, () => tryLoadSnapshot(attempt + 1));
    }
  };
  tryLoadSnapshot(0);

  const pullRemote = getPullBananaRemote();
  pullRemote.OnClientEvent.Connect((entry: BananaEntry) => {
    ownedBananaIds.add(entry.id);
    applyOwnedSlotStrokes();
  });
};
