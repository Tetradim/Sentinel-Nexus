import {
  DEFAULT_DISCORD_INGESTION_SETTINGS,
  DEFAULT_FAILOVER_SETTINGS,
  DEFAULT_GENERAL_API_SETTINGS,
  buildDiscordIngestionAuditDigest,
  type DiscordIngestionSettings,
  type DiscordIngestionAuditDigest,
  type FailoverSettings,
  type GeneralApiSettings,
  buildDiscordIngestionPriorityLabel,
  buildEnginePriorityLabel,
  buildTransportLabel,
  normalizeDiscordIngestionSettings,
  normalizeFailoverSettings,
  normalizeGeneralApiSettings,
} from "@sentinel-nexus/contracts";
import { create } from "zustand";
import {
  loadDiscordIngestionSettings,
  loadFailoverSettings,
  loadGeneralApiSettings,
  saveDiscordIngestionSettings,
  saveFailoverSettings,
  saveGeneralApiSettings,
  type SecureSettingsStorage,
} from "./secureSettingsPersistence";
import type { DiscordWebViewHealthSnapshot } from "./discordWebViewState";
import type { PhoneEngineRuntimeSnapshot } from "./phoneEngineRuntimeState";

export interface MobileSettingsSnapshot {
  failoverSettings: FailoverSettings;
  discordIngestionSettings: DiscordIngestionSettings;
  generalApiSettings: GeneralApiSettings;
}

export interface SettingsSummary {
  engineLabel: string;
  transportLabel: string;
  discordIngestionLabel: string;
  notificationsLabel: string;
}

export function getDefaultMobileSettingsSnapshot(): MobileSettingsSnapshot {
  return {
    failoverSettings: DEFAULT_FAILOVER_SETTINGS,
    discordIngestionSettings: DEFAULT_DISCORD_INGESTION_SETTINGS,
    generalApiSettings: DEFAULT_GENERAL_API_SETTINGS,
  };
}

export function createNextSettings(
  current: FailoverSettings,
  patch: Partial<FailoverSettings>,
): FailoverSettings {
  return normalizeFailoverSettings({
    ...current,
    ...patch,
  });
}

export function createNextDiscordIngestionSettings(
  current: DiscordIngestionSettings,
  patch: Partial<DiscordIngestionSettings>,
): DiscordIngestionSettings {
  return normalizeDiscordIngestionSettings({
    ...current,
    ...patch,
  });
}

export function buildSettingsSummary(
  settings: FailoverSettings,
  discordIngestionSettings: DiscordIngestionSettings = DEFAULT_DISCORD_INGESTION_SETTINGS,
): SettingsSummary {
  const notificationsLabel =
    settings.notifyOnFailover && settings.notifyWhenOffline
      ? "Failover and offline alerts on"
      : settings.notifyOnFailover
        ? "Failover alerts on"
        : settings.notifyWhenOffline
          ? "Offline alerts on"
          : "Phone alerts off";

  return {
    engineLabel: buildEnginePriorityLabel(settings),
    transportLabel: buildTransportLabel(settings),
    discordIngestionLabel: buildDiscordIngestionPriorityLabel(discordIngestionSettings),
    notificationsLabel,
  };
}

export function buildMobileDiscordIngestionRouteDigest(
  discordIngestionSettings: DiscordIngestionSettings,
  phoneRuntime: PhoneEngineRuntimeSnapshot,
  webView: DiscordWebViewHealthSnapshot,
): DiscordIngestionAuditDigest {
  const webViewLoaded =
    webView.lastLoadedAt.length > 0 &&
    !webView.lastError &&
    !webView.lastTimedOutAt &&
    !webView.loading;

  return buildDiscordIngestionAuditDigest(discordIngestionSettings, {
    botGatewayReady:
      phoneRuntime.discordEngineReady &&
      phoneRuntime.discordGatewayConnected &&
      phoneRuntime.discordIngestionEvidenceReady,
    webViewSessionReady: webViewLoaded,
    foregroundServiceActive: phoneRuntime.foregroundServiceActive,
  });
}

interface SettingsState {
  snapshot: MobileSettingsSnapshot;
  updateFailoverSettings: (patch: Partial<FailoverSettings>) => void;
  updateDiscordIngestionSettings: (patch: Partial<DiscordIngestionSettings>) => void;
  updateGeneralApiSettings: (patch: Partial<GeneralApiSettings>) => void;
  hydrateFailoverSettings: (storage: SecureSettingsStorage) => Promise<void>;
  hydrateDiscordIngestionSettings: (storage: SecureSettingsStorage) => Promise<void>;
  persistFailoverSettings: (storage: SecureSettingsStorage) => Promise<void>;
  persistDiscordIngestionSettings: (storage: SecureSettingsStorage) => Promise<void>;
  hydrateGeneralApiSettings: (storage: SecureSettingsStorage) => Promise<void>;
  persistGeneralApiSettings: (storage: SecureSettingsStorage) => Promise<void>;
}

export const useSettingsState = create<SettingsState>((set, get) => ({
  snapshot: getDefaultMobileSettingsSnapshot(),
  updateFailoverSettings: (patch) =>
    set((state) => ({
      snapshot: {
        ...state.snapshot,
        failoverSettings: createNextSettings(state.snapshot.failoverSettings, patch),
      },
    })),
  updateDiscordIngestionSettings: (patch) =>
    set((state) => ({
      snapshot: {
        ...state.snapshot,
        discordIngestionSettings: createNextDiscordIngestionSettings(
          state.snapshot.discordIngestionSettings,
          patch,
        ),
      },
    })),
  updateGeneralApiSettings: (patch) =>
    set((state) => ({
      snapshot: {
        ...state.snapshot,
        generalApiSettings: normalizeGeneralApiSettings({ ...state.snapshot.generalApiSettings, ...patch }),
      },
    })),
  hydrateFailoverSettings: async (storage) => {
    const settings = await loadFailoverSettings(storage);
    if (!settings) {
      return;
    }
    set({
      snapshot: {
        ...get().snapshot,
        failoverSettings: settings,
      },
    });
  },
  hydrateDiscordIngestionSettings: async (storage) => {
    const settings = await loadDiscordIngestionSettings(storage);
    if (!settings) {
      return;
    }
    set({
      snapshot: {
        ...get().snapshot,
        discordIngestionSettings: settings,
      },
    });
  },
  persistFailoverSettings: async (storage) => {
    await saveFailoverSettings(storage, get().snapshot.failoverSettings);
  },
  persistDiscordIngestionSettings: async (storage) => {
    await saveDiscordIngestionSettings(storage, get().snapshot.discordIngestionSettings);
  },
  hydrateGeneralApiSettings: async (storage) => {
    const settings = await loadGeneralApiSettings(storage);
    if (settings) set({ snapshot: { ...get().snapshot, generalApiSettings: settings } });
  },
  persistGeneralApiSettings: async (storage) => {
    await saveGeneralApiSettings(storage, get().snapshot.generalApiSettings);
  },
}));
