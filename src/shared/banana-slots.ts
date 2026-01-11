export type BananaSlot = {
  index: number;
  id: string;
  name: string;
  score: number;
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
  scoreDelta?: number;
  totalScore?: number;
  reason?: string;
};
