import assert from "node:assert/strict";
import test from "node:test";

import { GeneralApiClient } from "./generalApiClient.js";
import type { FetchLike } from "./remoteHttp.js";

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

test("General API registration identifies Nexus as an observer and risk controller", async () => {
  let requestedUrl = "";
  let requestedBody: Record<string, unknown> = {};
  const fetchImpl: FetchLike = async (url, init) => {
    requestedUrl = String(url);
    requestedBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
    return jsonResponse({
      participant: { participant_id: "nexus-1" },
      api_token: "participant-secret",
    }, 201);
  };
  const client = new GeneralApiClient({
    enabled: true,
    baseUrl: "http://127.0.0.1:9200/api/general/",
    runId: "recorded-run",
    participantId: "nexus-1",
    participantToken: "",
    subscribedSymbols: ["SPY"],
    timeoutMs: 5000,
    fetchImpl,
  });

  const registration = await client.register() as Record<string, unknown>;

  assert.equal(requestedUrl, "http://127.0.0.1:9200/api/general/runs/recorded-run/participants");
  assert.equal(requestedBody.bot_id, "sentinel-nexus");
  assert.deepEqual(requestedBody.roles, ["observer", "risk_controller"]);
  assert.equal(registration.api_token, "participant-secret");
});

test("General API authenticated calls send the Archive participant token", async () => {
  let token = "";
  const fetchImpl: FetchLike = async (_url, init) => {
    token = String((init?.headers as Record<string, string>)["X-Archive-Bot-Token"] || "");
    return jsonResponse({ cash: 100000 });
  };
  const client = new GeneralApiClient({
    enabled: true,
    baseUrl: "http://127.0.0.1:9200/api/general",
    runId: "recorded-run",
    participantId: "nexus-1",
    participantToken: "participant-secret",
    subscribedSymbols: [],
    timeoutMs: 5000,
    fetchImpl,
  });

  await client.account();
  assert.equal(token, "participant-secret");
});

