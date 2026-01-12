import type { InventorySnapshotItem } from "shared/inventory-types";
import { createBaseButton } from "../../components/buttons";
import { bindStandardActivation } from "../../components/buttons/activations";
import { INVENTORY_PANEL_CLOSE_BUTTON_CONFIG } from "../button-config";

const PANELS_FOLDER_NAME = "Panels";
const PANEL_NAME = "InventoryPanel";
const PANEL_ASPECT_RATIO = 1.2;
const PANEL_WIDTH_SCALE = 0.95;
const PANEL_HEIGHT_SCALE = PANEL_WIDTH_SCALE / PANEL_ASPECT_RATIO;
const PANEL_BACKGROUND_COLOR = Color3.fromRGB(105, 105, 105);
const PANEL_STROKE_COLOR = Color3.fromRGB(66, 66, 66);

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

const getOrCreateScrollingFrame = (parent: Instance, name: string) => {
  const existing = parent.FindFirstChild(name);
  if (existing && existing.IsA("ScrollingFrame")) {
    return existing;
  }
  if (existing) {
    existing.Destroy();
  }

  const frame = new Instance("ScrollingFrame");
  frame.Name = name;
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

type InventoryPanelController = {
  panel: Frame;
  addItem: (entry: { id: string; name: string }) => void;
  setItems: (items: InventorySnapshotItem[]) => void;
};

let cachedController: InventoryPanelController | undefined;

export const mountInventoryPanel = (gui: ScreenGui) => {
  if (cachedController) {
    return cachedController;
  }

  const panelsFolder = getOrCreateFolder(gui, PANELS_FOLDER_NAME);
  const panel = getOrCreateFrame(panelsFolder, PANEL_NAME);
  panel.AnchorPoint = new Vector2(0.5, 0.5);
  panel.Position = new UDim2(0.5, 0, 0.5, 0);
  panel.Size = new UDim2(PANEL_WIDTH_SCALE, 0, PANEL_HEIGHT_SCALE, 0);
  panel.BackgroundColor3 = PANEL_BACKGROUND_COLOR;
  panel.BorderSizePixel = 0;
  panel.Visible = false;
  panel.Active = true;
  panel.BackgroundTransparency = 0;
  ensureAspect(panel, PANEL_ASPECT_RATIO);
  ensureCorner(panel);
  ensureStroke(panel, 3, PANEL_STROKE_COLOR, 0.2);

  const closeConfig = INVENTORY_PANEL_CLOSE_BUTTON_CONFIG;
  const existingClose = panel.FindFirstChild(closeConfig.name);
  if (existingClose) {
    existingClose.Destroy();
  }

  const closeController = createBaseButton({
    name: closeConfig.name,
    parent: panel,
    visible: closeConfig.visible,
    size: closeConfig.size,
    position: closeConfig.position,
    anchorPoint: closeConfig.anchorPoint,
    palette: closeConfig.palette,
    stroke: closeConfig.stroke,
    cornerRadius: closeConfig.cornerRadius,
    cooldownSeconds: closeConfig.cooldownSeconds,
  });

  const closeLabel = new Instance("TextLabel");
  closeLabel.Name = "Label";
  closeLabel.Size = new UDim2(1, 0, 1, 0);
  closeLabel.BackgroundTransparency = 1;
  closeLabel.Text = closeConfig.label.text;
  closeLabel.TextColor3 = closeConfig.label.color;
  closeLabel.TextScaled = true;
  closeLabel.ZIndex = closeController.getChildZIndex();
  closeLabel.Parent = closeController.button;

  closeController.onStateChange((state) => {
    closeLabel.TextTransparency = state === "Disabled" ? 0.4 : 0;
  });

  const gridFrame = getOrCreateScrollingFrame(panel, "InventoryGrid");
  gridFrame.Position = new UDim2(0, 16, 0, 56);
  gridFrame.Size = new UDim2(1, -32, 1, -72);
  gridFrame.BackgroundTransparency = 1;
  gridFrame.BorderSizePixel = 0;
  gridFrame.ScrollBarThickness = 6;
  gridFrame.ScrollingDirection = Enum.ScrollingDirection.Y;
  gridFrame.AutomaticCanvasSize = Enum.AutomaticSize.Y;
  gridFrame.CanvasSize = new UDim2(0, 0, 0, 0);
  gridFrame.Active = true;

  const existingLayout = gridFrame.FindFirstChildOfClass("UIGridLayout");
  const layout = existingLayout ?? new Instance("UIGridLayout");
  layout.CellSize = new UDim2(0, 96, 0, 96);
  layout.CellPadding = new UDim2(0, 12, 0, 12);
  layout.SortOrder = Enum.SortOrder.LayoutOrder;
  layout.Parent = gridFrame;

  const existingPadding = gridFrame.FindFirstChildOfClass("UIPadding");
  const padding = existingPadding ?? new Instance("UIPadding");
  padding.PaddingTop = new UDim(0, 6);
  padding.PaddingLeft = new UDim(0, 6);
  padding.PaddingRight = new UDim(0, 6);
  padding.PaddingBottom = new UDim(0, 6);
  padding.Parent = gridFrame;

  bindStandardActivation(closeController, () => {
    panel.Visible = false;
  }, { pressStrength: "weak" });

  const itemFrames = new Map<string, Frame>();
  const itemCounts = new Map<string, number>();
  let layoutCounter = 0;

  const createItemFrame = (entry: { id: string; name: string }) => {
    const frame = new Instance("Frame");
    frame.Name = `Item_${entry.id}`;
    frame.BackgroundColor3 = Color3.fromRGB(120, 120, 120);
    frame.BorderSizePixel = 0;
    frame.Parent = gridFrame;
    ensureCorner(frame);
    ensureStroke(frame, 2, Color3.fromRGB(255, 255, 255), 0.2);

    const nameLabel = new Instance("TextLabel");
    nameLabel.Name = "Name";
    nameLabel.Size = new UDim2(1, -8, 0.7, 0);
    nameLabel.Position = new UDim2(0, 4, 0, 4);
    nameLabel.BackgroundTransparency = 1;
    nameLabel.TextColor3 = Color3.fromRGB(255, 255, 255);
    nameLabel.TextScaled = true;
    nameLabel.Text = entry.name;
    nameLabel.TextWrapped = true;
    nameLabel.Parent = frame;

    const qtyLabel = new Instance("TextLabel");
    qtyLabel.Name = "Qty";
    qtyLabel.Size = new UDim2(1, -8, 0.3, 0);
    qtyLabel.Position = new UDim2(0, 4, 0.7, -4);
    qtyLabel.BackgroundTransparency = 1;
    qtyLabel.TextColor3 = Color3.fromRGB(255, 255, 255);
    qtyLabel.TextScaled = true;
    qtyLabel.Text = "x1";
    qtyLabel.TextXAlignment = Enum.TextXAlignment.Right;
    qtyLabel.Parent = frame;

    return frame;
  };

  const addItem = (entry: { id: string; name: string }) => {
    const current = itemCounts.get(entry.id) ?? 0;
    const nextCount = current + 1;
    itemCounts.set(entry.id, nextCount);

    let frame = itemFrames.get(entry.id);
    if (!frame) {
      frame = createItemFrame(entry);
      itemFrames.set(entry.id, frame);
    }

    const qtyLabel = frame.FindFirstChild("Qty") as TextLabel;
    qtyLabel.Text = `x${nextCount}`;
    layoutCounter -= 1;
    frame.LayoutOrder = layoutCounter;
  };

  const clearItems = () => {
    for (const child of gridFrame.GetChildren()) {
      if (child.IsA("Frame") && child.Name.sub(1, 5) === "Item_") {
        child.Destroy();
      }
    }
    itemFrames.clear();
    itemCounts.clear();
    layoutCounter = 0;
  };

  const setItems = (items: InventorySnapshotItem[]) => {
    clearItems();
    const sorted = items.sort((a, b) => a.updatedAt > b.updatedAt);
    for (const item of sorted) {
      const frame = createItemFrame(item);
      itemFrames.set(item.id, frame);
      itemCounts.set(item.id, item.qty);
      const qtyLabel = frame.FindFirstChild("Qty") as TextLabel;
      qtyLabel.Text = `x${item.qty}`;
      layoutCounter -= 1;
      frame.LayoutOrder = layoutCounter;
    }
  };

  cachedController = {
    panel,
    addItem,
    setItems,
  };

  return cachedController;
};
