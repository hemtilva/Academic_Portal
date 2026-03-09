export const API_BASE = "http://localhost:3001";

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
