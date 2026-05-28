import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { getApiUrl } from "@/constants/api";
import { useAuth } from "./AuthContext";

/** Mobile admin: tabs + dashboard cards (QR, commission, config, WhatsApp are in tashi-admin-electron). */
export type AdminSettings = {
  tab_dashboard: boolean;
  tab_products: boolean;
  tab_users: boolean;
  tab_payments: boolean;
  card_orders: boolean;
  card_claims: boolean;
  card_create_ads: boolean;
  card_create_text: boolean;
  card_payments: boolean;
};

export const DEFAULT_SETTINGS: AdminSettings = {
  tab_dashboard: true,
  tab_products: true,
  tab_users: true,
  tab_payments: true,
  card_orders: true,
  card_claims: true,
  card_create_ads: true,
  card_create_text: true,
  card_payments: true,
};

function normalizeSettings(raw: Record<string, unknown>): AdminSettings {
  const merged = { ...DEFAULT_SETTINGS, ...raw };
  return {
    tab_dashboard: Boolean(merged.tab_dashboard),
    tab_products: Boolean(merged.tab_products),
    tab_users: Boolean(merged.tab_users),
    tab_payments: Boolean(merged.tab_payments),
    card_orders: Boolean(merged.card_orders),
    card_claims: Boolean(merged.card_claims),
    card_create_ads: Boolean(merged.card_create_ads),
    card_create_text: Boolean(merged.card_create_text),
    card_payments: Boolean(merged.card_payments),
  };
}

interface AdminSettingsContextType {
  settings: AdminSettings;
  isLoading: boolean;
  settingsLoaded: boolean;
  fetchSettings: () => Promise<void>;
}

const AdminSettingsContext = createContext<AdminSettingsContextType | null>(null);

const BASE = getApiUrl();

const POLL_INTERVAL_MS = 30_000;

export function AdminSettingsProvider({ children }: { children: React.ReactNode }) {
  const { user, token, isLoading: authLoading } = useAuth();
  const [settings, setSettings] = useState<AdminSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  const isSuperAdmin = user?.role === "super_admin";
  const isAdmin = user?.role === "admin" || isSuperAdmin;

  const lastLoadedTokenRef = useRef<string | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const fetchSettings = useCallback(async () => {
    if (!token) return;
    if (lastLoadedTokenRef.current !== token) {
      setSettingsLoaded(false);
    }
    setIsLoading(true);
    try {
      const url = isSuperAdmin
        ? `${BASE}/admin-settings`
        : `${BASE}/admin-user-settings/me`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      });
      if (res.ok) {
        const data = (await res.json()) as Record<string, unknown>;
        setSettings(normalizeSettings(data));
      }
    } catch {
      // Network error — keep current settings
    } finally {
      setIsLoading(false);
      lastLoadedTokenRef.current = token;
      setSettingsLoaded(true);
    }
  }, [token, isSuperAdmin]);

  const schedulePoll = useCallback(() => {
    if (appStateRef.current !== "active") return;
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    pollTimerRef.current = setTimeout(async () => {
      if (appStateRef.current !== "active") return;
      await fetchSettings();
      schedulePoll();
    }, POLL_INTERVAL_MS);
  }, [fetchSettings]);

  const stopPoll = useCallback(() => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;

    if (isAdmin && token) {
      fetchSettings().then(() => schedulePoll());
    } else {
      setSettings(DEFAULT_SETTINGS);
      setSettingsLoaded(true);
      stopPoll();
    }

    return () => stopPoll();
  }, [isAdmin, token, fetchSettings, authLoading, schedulePoll, stopPoll]);

  useEffect(() => {
    if (!isAdmin || !token) return;

    const handleAppStateChange = (nextState: AppStateStatus) => {
      appStateRef.current = nextState;
      if (nextState === "active") {
        fetchSettings().then(() => schedulePoll());
      } else {
        stopPoll();
      }
    };

    const sub = AppState.addEventListener("change", handleAppStateChange);
    return () => sub.remove();
  }, [isAdmin, token, fetchSettings, schedulePoll, stopPoll]);

  const contextValue = useMemo(
    () => ({ settings, isLoading, settingsLoaded, fetchSettings }),
    [settings, isLoading, settingsLoaded, fetchSettings],
  );

  return (
    <AdminSettingsContext.Provider value={contextValue}>
      {children}
    </AdminSettingsContext.Provider>
  );
}

export function useAdminSettings() {
  const ctx = useContext(AdminSettingsContext);
  if (!ctx) throw new Error("useAdminSettings must be used within AdminSettingsProvider");
  return ctx;
}
