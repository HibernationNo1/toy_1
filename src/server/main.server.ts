import { Players } from "@rbxts/services";
import { makeHello } from "shared/module";
import { logInfo } from "./logger";
import { initBananaDrawService } from "./services/banana-draw-service";
import { initBananaSlotService } from "./services/banana-slot-service";
import { initPlayerInventoryService } from "./services/player/datastore/inventory-service";
import { initPlayerScoreService } from "./services/player/datastore/score-service";

logInfo(makeHello("main.server.ts"));
initPlayerInventoryService();
initPlayerScoreService();
initBananaDrawService();
initBananaSlotService();

Players.PlayerAdded.Connect((player) => {
	logInfo(`Player joined: ${player.Name} (${player.UserId})`);
});

Players.PlayerRemoving.Connect((player) => {
	logInfo(`Player left: ${player.Name} (${player.UserId})`);
});
