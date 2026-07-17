import type { GeneralApiSettings } from "@sentinel-nexus/contracts";
import { normalizeGeneralApiSettings } from "@sentinel-nexus/contracts";
import type { FetchLike } from "./remoteHttp";

export interface GeneralApiClientConfig extends GeneralApiSettings {
  fetchImpl?: FetchLike;
}

export class GeneralApiClient {
  readonly settings: GeneralApiSettings;
  readonly fetchImpl: FetchLike;

  constructor(config: GeneralApiClientConfig) {
    this.settings = normalizeGeneralApiSettings(config);
    const fetchImpl = config.fetchImpl ?? globalThis.fetch?.bind(globalThis);
    if (!fetchImpl) throw new Error("Fetch is not available.");
    this.fetchImpl = fetchImpl;
  }

  spec() { return this.request("GET", "spec"); }

  async register() {
    if (!this.settings.runId) throw new Error("Replay run ID is required.");
    return this.request("POST", `runs/${encodeURIComponent(this.settings.runId)}/participants`, {
      participant_id: this.settings.participantId,
      bot_id: "sentinel-nexus",
      display_name: "Sentinel Nexus",
      roles: ["observer", "risk_controller"],
      subscribed_symbols: this.settings.subscribedSymbols,
      starting_cash: 100000,
      commission_per_order: 0,
      slippage_bps: 0,
    });
  }

  async test() {
    const spec = await this.spec() as Record<string, unknown>;
    let account: unknown = null;
    if (this.settings.runId && this.settings.participantToken) account = await this.account();
    return {
      ok: true,
      contract: spec.contract_version || "archive.general.v1",
      archiveReachable: true,
      participantAuthenticated: account !== null,
      account,
    };
  }

  account() { return this.participantRequest("GET", "account"); }
  latestMarket() { return this.participantRequest("GET", "market/latest"); }
  directives() { return this.participantRequest("GET", "directives"); }
  publishObservation(observation: Record<string, unknown>) { return this.participantRequest("POST", "observations", observation); }

  private participantRequest(method: "GET" | "POST", suffix: string, body?: unknown) {
    if (!this.settings.runId || !this.settings.participantToken) throw new Error("A registered run and participant token are required.");
    return this.request(method, `runs/${encodeURIComponent(this.settings.runId)}/participants/${encodeURIComponent(this.settings.participantId)}/${suffix}`, body, true);
  }

  private async request(method: "GET" | "POST", endpoint: string, body?: unknown, authenticated = false) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.settings.timeoutMs);
    try {
      const request: RequestInit = {
        method,
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          ...(body === undefined ? {} : { "Content-Type": "application/json" }),
          ...(authenticated ? { "X-Archive-Bot-Token": this.settings.participantToken } : {}),
        },
      };
      if (body !== undefined) request.body = JSON.stringify(body);
      const response = await this.fetchImpl(`${this.settings.baseUrl.replace(/\/+$/, "")}/${endpoint.replace(/^\/+/, "")}`, request);
      const payload = await response.json() as unknown;
      if (!response.ok) {
        const detail = payload && typeof payload === "object" ? (payload as Record<string, unknown>).detail : undefined;
        throw new Error(typeof detail === "string" ? detail : `HTTP ${response.status}`);
      }
      return payload;
    } finally {
      clearTimeout(timeout);
    }
  }
}
