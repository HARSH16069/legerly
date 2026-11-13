export const API_URL = "/api/proxy";

export async function api(path, opts = {}) {
  let res;
  try {
    res = await fetch(API_URL + path, opts);
  } catch {
    throw new Error("Can’t reach the server. Check that the app and uvicorn are running.");
  }
  let data = null;
  try { data = await res.json(); } catch {}
  if (res.status === 401 && typeof window !== "undefined") {
    window.location.href = "/signin";
    throw new Error("Please sign in.");
  }
  if (!res.ok) {
    const d = data && data.detail;
    throw new Error(Array.isArray(d) ? d.map((e) => (e.loc ? e.loc.slice(1).join(".") + ": " : "") + e.msg).join("; ") : d || res.statusText);
  }
  return data;
}

export const send = (method, body) => ({ method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });