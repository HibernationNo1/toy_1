import { ReplicatedStorage } from "@rbxts/services";
import { BANANA_TABLE } from "shared/banana-table";
import { PULL_BANANA_REMOTE } from "shared/remotes";
import { logInfo } from "../logger";
import { sendExternalLog } from "./external/log-service";
import { recordBananaPull } from "./player/datastore/inventory-service";

const pickWeightedBanana = () => {
  let totalWeight = 0;
  for (const entry of BANANA_TABLE) {
    totalWeight += entry.weight;
  }

  if (totalWeight <= 0) {
    return BANANA_TABLE[0];
  }

  const roll = math.random() * totalWeight;
  let cumulative = 0;
  for (const entry of BANANA_TABLE) {
    cumulative += entry.weight;
    if (roll <= cumulative) {
      return entry;
    }
  }

  return BANANA_TABLE[BANANA_TABLE.size() - 1];
};

const getOrCreateRemote = () => {
  const existing = ReplicatedStorage.FindFirstChild(PULL_BANANA_REMOTE);
  if (existing && existing.IsA("RemoteEvent")) {
    return existing;
  }
  if (existing) {
    existing.Destroy();
  }

  const remote = new Instance("RemoteEvent");
  remote.Name = PULL_BANANA_REMOTE;
  remote.Parent = ReplicatedStorage;
  return remote;
};

export const initBananaDrawService = () => {
  const remote = getOrCreateRemote();

  remote.OnServerEvent.Connect((player) => {
    const entry = pickWeightedBanana();
    recordBananaPull(player, entry);
    logInfo(`Pull banana: ${player.Name} -> ${entry.name} (${entry.score})`);
    sendExternalLog({
      event: "pull_banana",
      userId: player.UserId,
      userName: player.Name,
      bananaId: entry.id,
      bananaName: entry.name,
      score: entry.score,
    });
    remote.FireClient(player, entry);
  });
};
