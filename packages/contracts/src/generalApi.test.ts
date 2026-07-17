import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_GENERAL_API_SETTINGS,
  normalizeGeneralApiSettings,
} from "./generalApi.js";

test("General API settings normalize symbols and fail closed to disabled", () => {
  const settings = normalizeGeneralApiSettings({
    enabled: "yes",
    baseUrl: " http://127.0.0.1:9200/api/general ",
    participantId: " nexus-observer ",
    subscribedSymbols: ["spy", "SPY", " tsla "],
    timeoutMs: 2500,
  } as never);

  assert.equal(settings.enabled, false);
  assert.equal(settings.baseUrl, DEFAULT_GENERAL_API_SETTINGS.baseUrl);
  assert.equal(settings.participantId, "nexus-observer");
  assert.deepEqual(settings.subscribedSymbols, ["SPY", "TSLA"]);
  assert.equal(settings.timeoutMs, 2500);
});

