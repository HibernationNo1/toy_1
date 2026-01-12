import { Players, ReplicatedStorage } from "@rbxts/services";
import { BANANA_TABLE } from "shared/banana-table";
import type {
  BananaSlot,
  BananaSlotClickRequest,
  BananaSlotClickResponse,
  BananaSlotsRequest,
  BananaSlotsResponse,
} from "shared/banana-slots";
import { BANANA_SLOT_CLICK_REMOTE, BANANA_SLOTS_REMOTE } from "shared/remotes";
import { addBananaMoney, hasBanana } from "./datastore/data-service";

const SLOT_COUNT = 3;
const CLICK_COOLDOWN_SECONDS = 1;

type SlotState = {
  slots: BananaSlot[];
  lastRollAt: number;
  lastClickAt: number;
};

const slotAssignments = new Map<number, SlotState>();

const pickRandomSlot = (index: number): BananaSlot => {
  const entryIndex = math.random(1, BANANA_TABLE.size()) - 1;
  const entry = BANANA_TABLE[entryIndex];
  return {
    index,
    id: entry.id,
    name: entry.name,
    bananaMoney: entry.bananaMoney,
  };
};

const buildSlots = (): BananaSlot[] => {
  const slots: BananaSlot[] = [];
  for (let i = 1; i <= SLOT_COUNT; i += 1) {
    slots.push(pickRandomSlot(i));
  }
  return slots;
};

const getOrCreateSlotState = (userId: number, reroll: boolean) => {
  const existing = slotAssignments.get(userId);
  if (existing && !reroll) {
    return existing;
  }

  const state: SlotState = {
    slots: buildSlots(),
    lastRollAt: os.time(),
    lastClickAt: 0,
  };
  slotAssignments.set(userId, state);
  return state;
};

const getOrCreateSlotsRemote = () => {
  const existing = ReplicatedStorage.FindFirstChild(BANANA_SLOTS_REMOTE);
  if (existing && existing.IsA("RemoteFunction")) {
    return existing;
  }
  if (existing) {
    existing.Destroy();
  }

  const remote = new Instance("RemoteFunction");
  remote.Name = BANANA_SLOTS_REMOTE;
  remote.Parent = ReplicatedStorage;
  return remote;
};

const getOrCreateSlotClickRemote = () => {
  const existing = ReplicatedStorage.FindFirstChild(BANANA_SLOT_CLICK_REMOTE);
  if (existing && existing.IsA("RemoteFunction")) {
    return existing;
  }
  if (existing) {
    existing.Destroy();
  }

  const remote = new Instance("RemoteFunction");
  remote.Name = BANANA_SLOT_CLICK_REMOTE;
  remote.Parent = ReplicatedStorage;
  return remote;
};

export const initBananaSlotService = () => {
  const slotsRemote = getOrCreateSlotsRemote();
  slotsRemote.OnServerInvoke = (player, ...args: unknown[]) => {
    const request = args[0];
    const reroll = typeIs(request, "table") && (request as BananaSlotsRequest).reroll === true;
    const state = getOrCreateSlotState(player.UserId, reroll);
    const response: BananaSlotsResponse = {
      slots: state.slots,
    };
    return response;
  };

  const slotClickRemote = getOrCreateSlotClickRemote();
  slotClickRemote.OnServerInvoke = (player, ...args: unknown[]) => {
    const request = args[0];
    if (!typeIs(request, "table")) {
      const response: BananaSlotClickResponse = { awarded: false, reason: "bad_request" };
      return response;
    }

    const typedRequest = request as BananaSlotClickRequest;
    const state = slotAssignments.get(player.UserId);
    if (!state) {
      const response: BananaSlotClickResponse = { awarded: false, reason: "no_slots" };
      return response;
    }

    const now = os.time();
    if (now - state.lastClickAt < CLICK_COOLDOWN_SECONDS) {
      const response: BananaSlotClickResponse = { awarded: false, reason: "cooldown" };
      return response;
    }

    const slotIndex = typedRequest.slotIndex;
    if (slotIndex < 1 || slotIndex > state.slots.size()) {
      const response: BananaSlotClickResponse = { awarded: false, reason: "invalid_slot" };
      return response;
    }

    const slot = state.slots[slotIndex - 1];
    if (slot.id !== typedRequest.slotId) {
      const response: BananaSlotClickResponse = { awarded: false, reason: "slot_mismatch" };
      return response;
    }

    if (!hasBanana(player, slot.id)) {
      const response: BananaSlotClickResponse = { awarded: false, reason: "not_owned" };
      return response;
    }

    state.lastClickAt = now;
    const newBananaMoney = addBananaMoney(player, slot.bananaMoney);
    const response: BananaSlotClickResponse = {
      awarded: true,
      bananaMoneyDelta: slot.bananaMoney,
      totalBananaMoney: newBananaMoney,
    };
    return response;
  };

  Players.PlayerRemoving.Connect((player) => {
    slotAssignments.delete(player.UserId);
  });
};
