import { mountInventoryButton } from "./ui/ScreenGui/Buttons/inventory-button";
import { mountPullBananaButton } from "./ui/ScreenGui/Buttons/pull-banana-button";
import { mountBananaSubmitPanel } from "./ui/ScreenGui/Panels/banana-submit-panel";

mountInventoryButton();
mountPullBananaButton();
mountBananaSubmitPanel({ activeSlots: [true, false, false] });
