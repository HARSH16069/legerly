import { cookies } from "next/headers";

const API = process.env.API_URL || "http://127.0.0.1:8000";

// Reads the login cookie and asks the backend who it belongs to.
export async function getSession() {
  const token = (await cookies()).get("token")?.value;
  if (!token) return { signedIn: false, user: null };
  try {
    const res = await fetch(`${API}/auth/me`, { headers: { authorization: `Bearer ${token}` }, cache: "no-store" });
    if (!res.ok) return { signedIn: false, user: null };
    return { signedIn: true, user: await res.json() };
  } catch {
    return { signedIn: false, user: null };
  }
}
