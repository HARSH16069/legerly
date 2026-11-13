"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { homeFor } from "@/lib/roles";

const ROWS = [["Customer invoices", "+ 4,82,000.00"], ["Payroll run", "− 1,96,400.00"], ["Supplier payments", "− 61,154.00"]];
const input = "w-full rounded-sm border border-[#132622]/25 bg-white px-3.5 py-3 text-[15px] outline-none transition focus:border-[#1F5D46] focus:shadow-[0_0_0_4px_rgba(31,93,70,.14)]";

export default function AuthForm({ mode }) {
  const up = mode === "register";
  const [error, setError] = useState(""), [busy, setBusy] = useState(false), [show, setShow] = useState(false), [needCode, setNeedCode] = useState(false);

  // The server says whether sign-up needs an invite code (REGISTRATION_CODE on the backend).
  useEffect(() => {
    if (up) fetch("/api/auth/setup-status").then((r) => r.json()).then((d) => setNeedCode(!!d.invite_code_required)).catch(() => {});
  }, [up]);

  async function submit(e) {
    e.preventDefault(); setError("");
    const { confirm, ...body } = Object.fromEntries(new FormData(e.target));
    if (up && body.password !== confirm) return setError("The two passwords don’t match.");
    setBusy(true);
    try {
      const res = await fetch(`/api/auth/${up ? "register" : "login"}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.detail === "string" ? data.detail : Array.isArray(data.detail) ? data.detail.map((d) => d.msg).join("; ") : "Something went wrong.");
      window.location.href = homeFor(data.user.role);
    } catch (er) { setError(er.message); setBusy(false); }
  }

  return (
    <main className="grid min-h-screen bg-[#F6F3EA] text-[#132622] md:grid-cols-2">
      <aside className="hidden flex-col justify-between gap-10 bg-[#132622] p-12 text-[#d7e3dc] md:flex">
        <Link href="/" className="font-serif text-2xl font-semibold text-white">Ledgerly</Link>
        <div>
          <p className="mb-3 text-[#B9852F]">For accountants and the businesses they run</p>
          <h2 className="mb-9 font-serif text-5xl font-medium leading-[1.08] tracking-tight text-white">Books that close on time. Every time.</h2>
          <div className="max-w-md rounded-sm border border-white/10 bg-white/5 px-6 py-2">
            {ROWS.map(([a, b]) => <div key={a} className="flex justify-between gap-4 border-b border-white/10 py-3.5"><span>{a}</span><span className="font-mono">{b}</span></div>)}
            <div className="mt-1 flex justify-between border-t-2 border-white py-4 font-serif text-lg text-white"><span>Ending balance</span><span className="font-mono text-[#B9852F]">₹1,84,446.00</span></div>
          </div>
        </div>
        <p className="text-sm opacity-60">© 2026 Ledgerly</p>
      </aside>

      <section className="grid place-items-center px-6 py-12">
        <div className="w-full max-w-md">
          <Link href="/" className="mb-8 block font-serif text-2xl font-semibold md:hidden">Ledgerly</Link>
          <form onSubmit={submit} className="grid gap-4">
            <h1 className="font-serif text-4xl font-medium tracking-tight">{up ? "Create your business" : "Welcome back"}</h1>
            <p className="-mt-2 text-[#132622]/65">
              {up ? "This sets up a new, private set of books for your business. You become its owner and can add your team afterwards." : "Sign in to open your books."}
            </p>
            {up && <label className="grid gap-1.5 text-[15px] font-medium">Your name<input name="name" autoComplete="name" required className={input} /></label>}
            {up && <label className="grid gap-1.5 text-[15px] font-medium">Business name<input name="business_name" autoComplete="organization" required className={input} /></label>}
            {up && needCode && <label className="grid gap-1.5 text-[15px] font-medium">Invite code<input name="invite_code" autoComplete="off" required className={input} /></label>}
            <label className="grid gap-1.5 text-[15px] font-medium">Email<input name="email" type="email" autoComplete="email" required className={input} /></label>
            <label className="grid gap-1.5 text-[15px] font-medium">Password
              <span className="relative block">
                <input name="password" type={show ? "text" : "password"} minLength={up ? 8 : 1} maxLength={72} autoComplete={up ? "new-password" : "current-password"} required className={`${input} pr-16`} />
                <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-[#1F5D46]">{show ? "Hide" : "Show"}</button>
              </span>
            </label>
            {up && <label className="grid gap-1.5 text-[15px] font-medium">Confirm password<input name="confirm" type={show ? "text" : "password"} maxLength={72} autoComplete="new-password" required className={input} /></label>}
            {error && <p role="alert" className="text-sm text-[#B3261E]">{error}</p>}
            <button disabled={busy} className="rounded-sm bg-[#1F5D46] px-5 py-3.5 font-medium text-[#F6F3EA] transition hover:-translate-y-0.5 hover:bg-[#17493A] disabled:opacity-60">{busy ? "Please wait…" : up ? "Create business" : "Sign in"}</button>
            <p className="text-center text-sm text-[#132622]/65">
              {up ? <>Already have an account? <Link href="/signin" className="font-semibold text-[#1F5D46]">Sign in</Link></> : <>New here? <Link href="/register" className="font-semibold text-[#1F5D46]">Create your business</Link></>}
            </p>
          </form>
        </div>
      </section>
    </main>
  );
}