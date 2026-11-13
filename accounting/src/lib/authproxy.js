import { NextResponse } from "next/server";

const API = process.env.API_URL || "http://127.0.0.1:8000";

// Sends the form to FastAPI. If a token comes back, keep it in a private cookie.
export async function authProxy(req, path) {
  let res;
  try {
    res = await fetch(`${API}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: await req.text(), cache: "no-store" });
  } catch {
    return NextResponse.json({ detail: "Can’t reach the accounting server." }, { status: 502 });
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return NextResponse.json(data, { status: res.status });
  const { token, ...rest } = data;
  const out = NextResponse.json(rest);
  if (token) out.cookies.set("token", token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 7 });
  return out;
}