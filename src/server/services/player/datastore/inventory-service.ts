import type { BananaEntry } from "shared/banana-table";
import { initDataService, recordBananaPull } from "../../datastore/data-service";

export const initPlayerInventoryService = () => {
  initDataService();
};

export { recordBananaPull };
export type { BananaEntry };
