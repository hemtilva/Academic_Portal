const fallbackApiBase =
  typeof window !== "undefined"
    ? `http://${window.location.hostname}:3001`
    : "http://localhost:3001";

// In Vite dev, route through the dev server proxy so LAN clients only need port 5173.
const devProxyApiBase = "/api";

export const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? devProxyApiBase : fallbackApiBase);

export async function apiFetch(path, { method = "GET", body } = {}) {
  const token = localStorage.getItem("ap_token");

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  // If the token is expired/invalid, force re-login
  if (res.status === 401) {
    localStorage.removeItem("ap_token");
    localStorage.removeItem("ap_user");
    throw new Error("Unauthorized");
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const message = data?.error || `Request failed (${res.status})`;
    throw new Error(message);
  }

  return data;
}
