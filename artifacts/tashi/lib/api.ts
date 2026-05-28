import AsyncStorage from "@react-native-async-storage/async-storage";
import { customFetch, ApiError } from "../../../lib/api-client-react/src/custom-fetch";

export { ApiError };

export function apiErrorData(err: unknown): Record<string, unknown> | null {
  if (err instanceof ApiError && err.data && typeof err.data === "object") {
    return err.data as Record<string, unknown>;
  }
  return null;
}

export function apiErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    const body = err.data as { error?: string } | null;
    return body?.error || err.message || fallback;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

export async function getToken(): Promise<string> {
  return (await AsyncStorage.getItem("tashi_token")) || "";
}

/** Authenticated JSON API call; uses in-memory token from AuthContext (no AsyncStorage per request). */
export async function apiFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return customFetch<T>(`/api${normalized}`, opts);
}
