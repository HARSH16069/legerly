import { NextResponse } from "next/server";
const API = process.env.API_URL || "http://127.0.0.1:8000";
export const maxDuration = 60;
export async function GET() {
  try {
    const r = await fetch(`${API}/auth/setup-status`, { cache: "no-store" });
    return NextResponse.json(await r.json());
  } catch {
    return NextResponse.json({ first_user: false });
  }
}