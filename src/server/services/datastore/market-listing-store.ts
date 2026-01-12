import { DataStoreService, HttpService, Players } from "@rbxts/services";
import { BANANA_TABLE } from "shared/banana-table";
import {
  DATASTORE_KEYS,
  DATASTORE_NAMES,
  DEFAULT_SCHEMA_VERSION,
  MARKET_PRICE_MAX,
  MARKET_PRICE_MIN,
  MARKET_QTY_MIN,
} from "./constants";
import { logEconomyEvent } from "./audit-store";
import { runDataStoreOperation } from "./datastore-utils";
import { addBanana, addMoney, flushPlayer, removeBanana, spendMoney } from "./player-store";
import type { ListingRecord } from "./types";

const listingStore = DataStoreService.GetDataStore(DATASTORE_NAMES.marketListing);
const validBananaIds = new Set<string>(BANANA_TABLE.map((entry) => entry.id));
let openListingCount = 0;

type ListingResult =
  | { ok: true; listingId: string }
  | { ok: false; reason: string };

type ListingActionResult =
  | { ok: true; listing: ListingRecord }
  | { ok: false; reason: string };

const clampPrice = (price: number) => math.clamp(math.floor(price), MARKET_PRICE_MIN, MARKET_PRICE_MAX);

export const getOpenListingCount = () => openListingCount;

export const createListing = (
  player: Player,
  bananaId: string,
  quantity: number,
  price: number
): ListingResult => {
  if (!validBananaIds.has(bananaId)) {
    return { ok: false, reason: "invalid_banana" };
  }
  if (!typeIs(quantity, "number")) {
    return { ok: false, reason: "invalid_quantity" };
  }
  const quantityValue = math.floor(quantity);
  if (quantityValue < MARKET_QTY_MIN) {
    return { ok: false, reason: "invalid_quantity" };
  }
  if (!typeIs(price, "number")) {
    return { ok: false, reason: "invalid_price" };
  }
  const priceValue = math.floor(price);
  if (priceValue < MARKET_PRICE_MIN || priceValue > MARKET_PRICE_MAX) {
    return { ok: false, reason: "invalid_price" };
  }

  const reserveResult = removeBanana(player, bananaId, quantityValue, "LIST_CREATE");
  if (!reserveResult.ok) {
    return { ok: false, reason: reserveResult.reason };
  }

  const listingId = HttpService.GenerateGUID(false);
  const key = DATASTORE_KEYS.listing(listingId);
  const now = os.time();
  const listing: ListingRecord = {
    listingId,
    sellerUserId: player.UserId,
    bananaId,
    quantity: quantityValue,
    price: clampPrice(priceValue),
    status: "OPEN",
    createdAt: now,
    updatedAt: now,
    meta: {
      schemaVersion: DEFAULT_SCHEMA_VERSION,
    },
  };

  let created = false;
  const result = runDataStoreOperation({
    storeName: DATASTORE_NAMES.marketListing,
    key,
    op: "Update",
    requestType: Enum.DataStoreRequestType.UpdateAsync,
    reason: "LIST_CREATE",
  }, () =>
    listingStore.UpdateAsync(key, (old) => {
      if (old !== undefined) {
        return $tuple(old as ListingRecord);
      }
      created = true;
      return $tuple(listing);
    })
  );

  if (!result.ok) {
    addBanana(player, bananaId, quantityValue, "LIST_CREATE_ROLLBACK");
    return { ok: false, reason: "save_failed" };
  }

  if (!created) {
    addBanana(player, bananaId, quantityValue, "LIST_CREATE_ROLLBACK");
    return { ok: false, reason: "listing_exists" };
  }

  openListingCount += 1;
  logEconomyEvent(player.UserId, "LIST_CREATE", "LIST_CREATE", {
    listingId,
    bananaId,
    quantity: quantityValue,
    price: listing.price,
  });
  flushPlayer(player, "LIST_CREATE");

  return { ok: true, listingId };
};

export const cancelListing = (player: Player, listingId: string): ListingActionResult => {
  const key = DATASTORE_KEYS.listing(listingId);
  let cancelled = false;
  let cancelledListing: ListingRecord | undefined;

  const result = runDataStoreOperation({
    storeName: DATASTORE_NAMES.marketListing,
    key,
    op: "Update",
    requestType: Enum.DataStoreRequestType.UpdateAsync,
    reason: "LIST_CANCEL",
  }, () =>
    listingStore.UpdateAsync(key, (old) => {
      if (!typeIs(old, "table")) {
        return $tuple(old as ListingRecord | undefined);
      }
      const current = old as ListingRecord;
      if (current.status !== "OPEN" || current.sellerUserId !== player.UserId) {
        return $tuple(current);
      }

      cancelled = true;
      cancelledListing = {
        ...current,
        status: "CANCELLED",
        updatedAt: os.time(),
      };
      return $tuple(cancelledListing);
    })
  );

  if (!result.ok || !cancelled || !cancelledListing) {
    return { ok: false, reason: "cannot_cancel" };
  }

  addBanana(player, cancelledListing.bananaId, cancelledListing.quantity, "LIST_CANCEL");
  if (openListingCount > 0) {
    openListingCount -= 1;
  }
  logEconomyEvent(player.UserId, "LIST_CANCEL", "LIST_CANCEL", {
    listingId,
    bananaId: cancelledListing.bananaId,
    quantity: cancelledListing.quantity,
  });
  flushPlayer(player, "LIST_CANCEL");

  return { ok: true, listing: cancelledListing };
};

export const buyListing = (buyer: Player, listingId: string): ListingActionResult => {
  const key = DATASTORE_KEYS.listing(listingId);
  let soldListing: ListingRecord | undefined;

  const result = runDataStoreOperation({
    storeName: DATASTORE_NAMES.marketListing,
    key,
    op: "Update",
    requestType: Enum.DataStoreRequestType.UpdateAsync,
    reason: "MARKET_BUY",
  }, () =>
    listingStore.UpdateAsync(key, (old) => {
      if (!typeIs(old, "table")) {
        return $tuple(old as ListingRecord | undefined);
      }

      const current = old as ListingRecord;
      if (current.status !== "OPEN") {
        return $tuple(current);
      }

      soldListing = {
        ...current,
        status: "SOLD",
        buyerUserId: buyer.UserId,
        updatedAt: os.time(),
        soldAt: os.time(),
      };
      return $tuple(soldListing);
    })
  );

  if (!result.ok || !soldListing) {
    return { ok: false, reason: "cannot_buy" };
  }

  const spendResult = spendMoney(buyer, soldListing.price, "MARKET_BUY");
  if (!spendResult.ok) {
    logEconomyEvent(buyer.UserId, "MARKET_BUY_FAIL", "MARKET_BUY", {
      listingId,
      reason: spendResult.reason,
    });
    return { ok: false, reason: "insufficient_funds" };
  }

  addBanana(buyer, soldListing.bananaId, soldListing.quantity, "MARKET_BUY");

  const seller = Players.GetPlayerByUserId(soldListing.sellerUserId);
  if (seller) {
    addMoney(seller, soldListing.price, "MARKET_BUY");
    flushPlayer(seller, "MARKET_BUY");
  } else {
    logEconomyEvent(soldListing.sellerUserId, "MARKET_BUY_PENDING", "MARKET_BUY", {
      listingId,
      price: soldListing.price,
    });
  }

  if (openListingCount > 0) {
    openListingCount -= 1;
  }

  logEconomyEvent(buyer.UserId, "MARKET_BUY", "MARKET_BUY", {
    listingId,
    sellerUserId: soldListing.sellerUserId,
    bananaId: soldListing.bananaId,
    quantity: soldListing.quantity,
    price: soldListing.price,
  });

  flushPlayer(buyer, "MARKET_BUY");

  return { ok: true, listing: soldListing };
};
