import { HttpService } from "@rbxts/services";
import { EXTERNAL_LOG_ENABLED, EXTERNAL_LOG_ENDPOINT } from "../../config";

export const sendExternalLog = (payload: Record<string, unknown>) => {
  if (!EXTERNAL_LOG_ENABLED) {
    return;
  }
  if (!HttpService.HttpEnabled) {
    return;
  }

  task.spawn(() => {
    const [ok, err] = pcall(() => {
      const body = HttpService.JSONEncode({
        ...payload,
        timestamp: os.time(),
      });
      HttpService.PostAsync(EXTERNAL_LOG_ENDPOINT, body, Enum.HttpContentType.ApplicationJson);
    });

    if (!ok) {
      warn(`[ExternalLog] Failed to send log: ${tostring(err)}`);
    }
  });
};
