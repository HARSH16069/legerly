import { cookies } from "next/headers";
import { NextResponse } from "next/server";
export const maxDuration = 60;
const API = process.env.API_URL || "http://127.0.0.1:8000";

async function handler(req, { params }) {
  const { path } = await params;
  const url = `${API}/${path.join("/")}${new URL(req.url).search}`;
  const token = (await cookies()).get("token")?.value;

  const headers = new Headers();
  const type = req.headers.get("content-type");
  if (type) headers.set("content-type", type);
  if (token) headers.set("authorization", `Bearer ${token}`);

  const init = { method: req.method, headers, cache: "no-store" };
  if (!["GET", "HEAD"].includes(req.method)) { init.body = req.body; init.duplex = "half"; }

  let res;
  try { res = await fetch(url, init); }
  catch { return NextResponse.json({ detail: "Can’t reach the accounting server." }, { status: 502 }); }

  const out = new NextResponse(res.body, { status: res.status, headers: { "content-type": res.headers.get("content-type") || "application/json" } });
  if (res.status === 401) out.cookies.delete("token");
  return out;
}

export { handler as GET, handler as POST, handler as PUT, handler as PATCH, handler as DELETE };
