import { cookies } from "next/headers";
import { NextResponse } from "next/server";
export const maxDuration = 60;
const API = process.env.API_URL || "http://127.0.0.1:8000";

// Changing a password invalidates the old login token, so the backend sends back a fresh one.
// This route forwards the request with the current cookie and stores the new token in the cookie.
export async function POST(req) {
  const token = (await cookies()).get("token")?.value;
  if (!token) return NextResponse.json({ detail: "Please sign in." }, { status: 401 });
  let res;
  try {
    res = await fetch(`${API}/auth/change-password`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: await req.text(),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ detail: "Can’t reach the accounting server." }, { status: 502 });
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return NextResponse.json(data, { status: res.status });
  const { token: fresh, ...rest } = data;
  const out = NextResponse.json(rest);
  if (fresh) out.cookies.set("token", fresh, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 7 });
  return out;
}