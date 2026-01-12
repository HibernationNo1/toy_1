export type BananaSlot = {
  index: number;
  id: string;
  name: string;
  bananaMoney: number;
};

export type BananaSlotsRequest = {
  reroll?: boolean;
};

export type BananaSlotsResponse = {
  slots: BananaSlot[];
};

export type BananaSlotClickRequest = {
  slotIndex: number;
  slotId: string;
};

export type BananaSlotClickResponse = {
  awarded: boolean;
  bananaMoneyDelta?: number;
  totalBananaMoney?: number;
  reason?: string;
};
