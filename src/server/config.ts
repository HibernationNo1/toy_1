import { RunService } from "@rbxts/services";
import * as dev from "./config.dev";
import * as prod from "./config.prod";

const active = RunService.IsStudio() ? dev : prod;

export const EXTERNAL_LOG_ENABLED = active.EXTERNAL_LOG_ENABLED;
export const EXTERNAL_LOG_ENDPOINT = active.EXTERNAL_LOG_ENDPOINT;
