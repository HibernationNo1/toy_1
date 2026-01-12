import { Players } from "@rbxts/services";
import { makeHello } from "shared/module";
import { logInfo } from "./logger";
import { initBananaDrawService } from "./services/banana-draw-service";
import { initBananaSlotService } from "./services/banana-slot-service";
import { initDataService } from "./services/datastore/data-service";

logInfo(makeHello("main.server.ts"));
initDataService();
initBananaDrawService();
initBananaSlotService();

Players.PlayerAdded.Connect((player) => {
	logInfo(`Player joined: ${player.Name} (${player.UserId})`);
});

Players.PlayerRemoving.Connect((player) => {
	logInfo(`Player left: ${player.Name} (${player.UserId})`);
});
