import { Players, ReplicatedStorage } from "@rbxts/services";
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
import { createBaseButton } from "../../components/buttons";
import { bindStandardActivation } from "../../components/buttons/activations";
import { createSlotItem, type SlotItemController } from "../../components/slots";
import {
  BANANA_SUBMIT_LAYOUT,
  BANANA_SUBMIT_REROLL_BUTTON_CONFIG,
  BANANA_SUBMIT_SLOT_CONFIG,
} from "../banana-submit-config";

const GUI_NAME = "ScreenGui";
const PANELS_FOLDER_NAME = "Panels";
const PANEL_NAME = "BananaSubmitPanel";
const PANEL_ASPECT_RATIO = 3;
const PANEL_WIDTH_SCALE = 0.5;
const PANEL_HEIGHT_SCALE = PANEL_WIDTH_SCALE / PANEL_ASPECT_RATIO;
const PANEL_BACKGROUND_COLOR = Color3.fromRGB(189, 189, 189);
const PANEL_STROKE_COLOR = Color3.fromRGB(66, 66, 66);

const slotActiveFlags = new Map<number, boolean>();
const ownedBananaIds = new Set<string>();

type SlotInfo = {
  slot: SlotItemController;
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
  for (let i = 1; i <= BANANA_SUBMIT_SLOT_CONFIG.count; i += 1) {
    const value = activeSlots[i - 1];
    if (value !== undefined) {
      slotActiveFlags.set(i, value);
    }
  }
};

const applySlotOwnership = (slot: SlotItemController, index: number) => {
  if (!getSlotActive(index)) {
    slot.setBorderColor(BANANA_SUBMIT_SLOT_CONFIG.borderColors.inactive);
    return;
  }

  const bananaId = slot.getData().id;
  const owned = typeIs(bananaId, "string") && bananaId.size() > 0 && ownedBananaIds.has(bananaId);
  slot.setBorderColor(
    owned ? BANANA_SUBMIT_SLOT_CONFIG.borderColors.owned : BANANA_SUBMIT_SLOT_CONFIG.borderColors.unowned
  );
};

const applySlotState = (slot: SlotItemController, index: number) => {
  const isActive = getSlotActive(index);
  slot.setLocked(!isActive);
  slot.setClickable(isActive, "disable");
  slot.slot.SetAttribute("Active", isActive);
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
      slotInfo.slot.setItem({ id: "", name: "" });
      applySlotOwnership(slotInfo.slot, slotInfo.index);
      continue;
    }
    slotInfo.slot.setItem({ id: slotData.id, name: slotData.name });
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

const applySlotLayout = (panel: Frame, slotsFrame: Frame, layout: UIGridLayout, rerollButton: GuiObject) => {
  const { padding, spacing, rerollScale } = BANANA_SUBMIT_LAYOUT;
  const panelSize = panel.AbsoluteSize;
  const availableWidth = panelSize.X - padding * 2;
  const availableHeight = panelSize.Y - padding * 2;
  if (availableWidth <= 0 || availableHeight <= 0) {
    return;
  }

  const slotCount = BANANA_SUBMIT_SLOT_CONFIG.count;
  const slotSizeByWidth = (availableWidth - spacing * slotCount) / (slotCount + rerollScale);
  const slotSize = math.floor(math.min(slotSizeByWidth, availableHeight));
  if (slotSize <= 0) {
    return;
  }
  const rerollSize = math.floor(slotSize * rerollScale);
  const slotsWidth = slotSize * slotCount + spacing * (slotCount - 1);

  slotsFrame.AnchorPoint = new Vector2(0, 0.5);
  slotsFrame.Position = new UDim2(0, padding, 0.5, 0);
  slotsFrame.Size = new UDim2(0, slotsWidth, 0, slotSize);

  layout.CellSize = new UDim2(0, slotSize, 0, slotSize);
  layout.CellPadding = new UDim2(0, spacing, 0, 0);

  rerollButton.AnchorPoint = new Vector2(1, 0.5);
  rerollButton.Position = new UDim2(1, -padding, 0.5, 0);
  rerollButton.Size = new UDim2(0, rerollSize, 0, rerollSize);
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

  const rerollConfig = BANANA_SUBMIT_REROLL_BUTTON_CONFIG;
  const existingReroll = panel.FindFirstChild(rerollConfig.name);
  if (existingReroll) {
    existingReroll.Destroy();
  }

  const rerollController = createBaseButton({
    name: rerollConfig.name,
    parent: panel,
    visible: rerollConfig.visible,
    size: new UDim2(0, 0, 0, 0),
    position: new UDim2(0, 0, 0, 0),
    anchorPoint: new Vector2(1, 0.5),
    layer: "panel",
    palette: rerollConfig.palette,
    stroke: rerollConfig.stroke,
    cornerRadius: rerollConfig.cornerRadius,
  });
  rerollController.button.Modal = false;

  const existingLayout = slotsFrame.FindFirstChildOfClass("UIGridLayout");
  const layout = existingLayout ?? new Instance("UIGridLayout");
  layout.FillDirection = Enum.FillDirection.Horizontal;
  layout.HorizontalAlignment = Enum.HorizontalAlignment.Center;
  layout.VerticalAlignment = Enum.VerticalAlignment.Center;
  layout.SortOrder = Enum.SortOrder.LayoutOrder;
  layout.Parent = slotsFrame;

  const slotsRemote = getSlotsRemote();
  const fetchSlots = (request?: BananaSlotsRequest) => {
    const [ok, result] = pcall(() => slotsRemote.InvokeServer(request));
    if (!ok || !typeIs(result, "table")) {
      return;
    }
    const response = result as BananaSlotsResponse;
    applySlots(response.slots);
  };

  slotInfos = [];

  for (let i = 1; i <= BANANA_SUBMIT_SLOT_CONFIG.count; i += 1) {
    const slotName = `Slot${i}`;
    const existingSlot = slotsFrame.FindFirstChild(slotName);
    if (existingSlot) {
      existingSlot.Destroy();
    }

    const slotController = createSlotItem({
      name: slotName,
      parent: slotsFrame,
      visible: true,
      position: new UDim2(0, 0, 0, 0),
      size: new UDim2(0, 0, 0, 0),
      anchorPoint: new Vector2(0.5, 0.5),
      layer: "panel",
      palette: BANANA_SUBMIT_SLOT_CONFIG.palette,
      feedbackPalette: BANANA_SUBMIT_SLOT_CONFIG.feedbackPalette,
      textStyle: BANANA_SUBMIT_SLOT_CONFIG.textStyle,
      stroke: BANANA_SUBMIT_SLOT_CONFIG.stroke,
      cornerRadius: BANANA_SUBMIT_SLOT_CONFIG.cornerRadius,
      showRarityBar: BANANA_SUBMIT_SLOT_CONFIG.showRarityBar,
      lockedOverlayTransparency: BANANA_SUBMIT_SLOT_CONFIG.lockedOverlayTransparency,
      autoSuccessFeedback: false,
    });
    slotController.slot.LayoutOrder = i;
    applySlotState(slotController, i);

    const slotInfo: SlotInfo = { slot: slotController, index: i };
    slotInfos.push(slotInfo);

    slotController.onActivated(() => {
      const bananaId = slotController.getData().id;
      if (!typeIs(bananaId, "string") || bananaId.size() === 0) {
        slotController.playFailureFeedback("weak");
        return;
      }
      const slotClickRemote = getSlotClickRemote();
      const request: BananaSlotClickRequest = { slotIndex: i, slotId: bananaId };
      const [ok, result] = pcall(() => slotClickRemote.InvokeServer(request));
      if (!ok || !typeIs(result, "table")) {
        slotController.playFailureFeedback("weak");
        return;
      }
      const response = result as BananaSlotClickResponse;
      const awarded = response.awarded === true;
      if (awarded) {
        slotController.playSuccessFeedback();
      } else {
        slotController.playFailureFeedback("weak");
      }
      print(`${i}번째 슬롯 클릭`);
      if (awarded) {
        delaySeconds(0.5, () => {
          fetchSlots({ reroll: true });
        });
      }
    });
  }

  bindStandardActivation(
    rerollController,
    () => {
      fetchSlots({ reroll: true });
    },
    { pressStrength: "weak" }
  );

  const refreshLayout = () => applySlotLayout(panel, slotsFrame, layout, rerollController.button);
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
