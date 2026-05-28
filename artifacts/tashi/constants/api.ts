/** Production API (see eas.json). Used when EXPO_PUBLIC_* is not set in local Expo Go. */
const DEFAULT_DOMAIN = "tashi-9512b.as.r.appspot.com";
const DEFAULT_RAILWAY_URL = `https://${DEFAULT_DOMAIN}`;

export function getApiDomain(): string {
  const domain = process.env.EXPO_PUBLIC_DOMAIN?.trim();
  if (domain) return domain.replace(/^https?:\/\//, "").replace(/\/+$/, "");
  return DEFAULT_DOMAIN;
}

/** Base URL without trailing slash, e.g. https://tashi-9512b.as.r.appspot.com */
export function getApiBaseUrl(): string {
  const railway = process.env.EXPO_PUBLIC_RAILWAY_URL?.trim();
  if (railway) {
    return railway.startsWith("http") ? railway.replace(/\/+$/, "") : `https://${railway.replace(/\/+$/, "")}`;
  }
  return `https://${getApiDomain()}`;
}

/** API prefix, e.g. https://host/api */
export function getApiUrl(): string {
  return `${getApiBaseUrl()}/api`;
}
