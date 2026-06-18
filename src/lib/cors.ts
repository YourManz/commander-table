// Moxfield/Archidekt APIs do not send permissive CORS headers, so a static site
// reaches them through a public CORS proxy. Scryfall is open CORS and should be
// fetched directly. We try a direct fetch first, then fall back to the proxy.

const PROXY = "https://corsproxy.io/?url=";

export async function fetchJSON<T>(url: string, useProxy = false): Promise<T> {
  const target = useProxy ? PROXY + encodeURIComponent(url) : url;
  const res = await fetch(target, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return (await res.json()) as T;
}

// Try direct, fall back to proxy on any network/CORS error.
export async function fetchJSONWithFallback<T>(url: string): Promise<T> {
  try {
    return await fetchJSON<T>(url, false);
  } catch {
    return await fetchJSON<T>(url, true);
  }
}
