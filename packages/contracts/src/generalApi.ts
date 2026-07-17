export interface GeneralApiSettings {
  enabled: boolean;
  baseUrl: string;
  runId: string;
  participantId: string;
  participantToken: string;
  subscribedSymbols: string[];
  timeoutMs: number;
}

export const DEFAULT_GENERAL_API_SETTINGS: GeneralApiSettings = {
  enabled: false,
  baseUrl: "http://127.0.0.1:9200/api/general",
  runId: "",
  participantId: "sentinel-nexus",
  participantToken: "",
  subscribedSymbols: [],
  timeoutMs: 5000,
};

export function normalizeGeneralApiSettings(input: Partial<Record<keyof GeneralApiSettings, unknown>> | null | undefined = {}): GeneralApiSettings {
  const value = input && typeof input === "object" ? input : {};
  const timeout = Number(value.timeoutMs);
  return {
    enabled: value.enabled === true,
    baseUrl: clean(value.baseUrl) || DEFAULT_GENERAL_API_SETTINGS.baseUrl,
    runId: clean(value.runId),
    participantId: clean(value.participantId) || DEFAULT_GENERAL_API_SETTINGS.participantId,
    participantToken: clean(value.participantToken),
    subscribedSymbols: Array.isArray(value.subscribedSymbols)
      ? [...new Set(value.subscribedSymbols.map(clean).filter(Boolean).map((symbol) => symbol.toUpperCase()))]
      : [],
    timeoutMs: Number.isFinite(timeout) && timeout >= 100 ? timeout : DEFAULT_GENERAL_API_SETTINGS.timeoutMs,
  };
}

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}
