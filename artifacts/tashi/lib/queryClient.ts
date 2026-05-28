import { QueryClient } from "@tanstack/react-query";

/** Default cache for most API reads — reduces repeat network calls on navigation. */
export const DEFAULT_QUERY_OPTIONS = {
  staleTime: 30_000,
  gcTime: 5 * 60_000,
  retry: 1,
  refetchOnWindowFocus: false,
} as const;

/** Ads, ticker, product catalog, WhatsApp contacts — change infrequently. */
export const STATIC_DATA_QUERY_OPTIONS = {
  staleTime: 2 * 60_000,
  gcTime: 10 * 60_000,
  retry: 1,
  refetchOnWindowFocus: false,
} as const;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: DEFAULT_QUERY_OPTIONS,
  },
});
