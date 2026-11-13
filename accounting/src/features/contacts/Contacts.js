"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Btn, CountUp, Field, Input, PageHeader, Pill, Side, useToast } from "@/components/ui";
import { useUser } from "@/components/Session";
import { useAsync } from "@/hooks/useAsync";
import { api, send } from "@/lib/api";
import { inr } from "@/lib/format";

const blank = { display_name: "", company_name: "", first_name: "", last_name: "", email: "", mobile: "", gstin: "", pan: "", city: "", state: "", pin_code: "", bank_name: "", account_number: "", ifsc: "" };

const UPPER = new Set(["gstin", "pan", "ifsc"]);

const MUTED = "text-[#132622]/55";
const TILE = "group relative rounded-xl border border-[#132622]/10 bg-[#132622]/[0.025] p-3 text-left transition duration-200 hover:-translate-y-0.5 hover:border-[#132622]/25 hover:bg-white hover:shadow-md";

// Customers owe you (Dr) when positive; vendors are the opposite (Cr).
const sideOf = (kind, bal) => ((Number(bal) >= 0) === (kind === "customers") ? "Dr" : "Cr");
const mask = (n) => (n ? `•••• ${String(n).slice(-4)}` : "—");
const abs = (n) => Math.abs(Number(n) || 0);

// Static class names so Tailwind can see them.
const KIND = {
  customers: { one: "customer", label: "Customer", owes: "Owes you", icon: "user", text: "text-emerald-700", bar: "bg-emerald-600", avatar: "bg-emerald-600", card: "border-emerald-600/25 from-emerald-50", chip: "bg-emerald-50 text-emerald-700", glow: "rgba(5,150,105,.16)" },
  vendors: { one: "vendor", label: "Vendor", owes: "You owe", icon: "truck", text: "text-amber-700", bar: "bg-amber-600", avatar: "bg-amber-600", card: "border-amber-600/25 from-amber-50", chip: "bg-amber-50 text-amber-700", glow: "rgba(217,119,6,.16)" },
};

const PALETTE = ["bg-emerald-600", "bg-sky-600", "bg-violet-600", "bg-amber-600", "bg-rose-600", "bg-teal-600", "bg-indigo-600"];
const tone = (s = "") => PALETTE[[...String(s)].reduce((a, ch) => a + ch.charCodeAt(0), 0) % PALETTE.length];

const ICONS = {
  user: "M12 12a4 4 0 100-8 4 4 0 000 8zm-7 8a7 7 0 0114 0",
  truck: "M3 6h11v10H3zM14 9h4l3 3v4h-7M7 19a2 2 0 100-4 2 2 0 000 4zm10 0a2 2 0 100-4 2 2 0 000 4z",
  search: "M21 21l-4.3-4.3M11 18a7 7 0 100-14 7 7 0 000 14z",
  plus: "M12 5v14M5 12h14",
  mail: "M4 6h16v12H4zM4 7l8 6 8-6",
  phone: "M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2",
  x: "M6 6l12 12M18 6L6 18",
  users: "M17 20v-1a4 4 0 00-4-4H7a4 4 0 00-4 4v1M10 11a4 4 0 100-8 4 4 0 000 8zM21 20v-1a4 4 0 00-3-3.9M16 3.1a4 4 0 010 7.8",
  trend: "M3 17l6-6 4 4 8-8M14 7h7v7",
  star: "M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z",
  chevron: "M9 6l6 6-6 6",
};

export const Icon = ({ n, size = 16, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d={ICONS[n]} />
  </svg>
);

export const CSS = `
@keyframes cp-up{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
@keyframes cp-fade{from{opacity:0}to{opacity:1}}
@keyframes cp-rise{from{opacity:0;transform:translateY(24px) scale(.97)}to{opacity:1;transform:none}}
@keyframes cp-pop{0%{opacity:.5;transform:scale(.94)}60%{transform:scale(1.025)}100%{opacity:1;transform:scale(1)}}
@keyframes cp-float{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(18px,-12px) scale(1.12)}}
@keyframes cp-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
@keyframes cp-shimmer{from{background-position:200% 0}to{background-position:-200% 0}}
@keyframes cp-sheen{from{transform:translateX(-120%)}to{transform:translateX(220%)}}
@keyframes cp-spin{to{transform:rotate(360deg)}}
@keyframes cp-swap{from{opacity:0;transform:translateX(14px)}to{opacity:1;transform:none}}
.cp-up{animation:cp-up .5s cubic-bezier(.2,.8,.2,1) both}
.cp-fade{animation:cp-fade .25s ease both}
.cp-rise{animation:cp-rise .4s cubic-bezier(.2,.8,.2,1) both}
.cp-pop{animation:cp-pop .4s cubic-bezier(.2,.8,.2,1) both}
.cp-swap{animation:cp-swap .35s cubic-bezier(.2,.8,.2,1) both}
.cp-float{animation:cp-float 9s ease-in-out infinite}
.cp-float2{animation:cp-float 12s ease-in-out infinite reverse}
.cp-bob{animation:cp-bob 3.2s ease-in-out infinite}
.cp-spin{animation:cp-spin .7s linear infinite}
.cp-skel{background:linear-gradient(100deg,rgba(19,38,34,.05) 30%,rgba(19,38,34,.11) 50%,rgba(19,38,34,.05) 70%);background-size:200% 100%;animation:cp-shimmer 1.4s linear infinite}
.cp-btn{position:relative;overflow:hidden}
.cp-btn::after{content:"";position:absolute;inset:0;width:40%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.35),transparent);transform:translateX(-120%)}
.cp-btn:hover::after{animation:cp-sheen .8s ease}
@media (prefers-reduced-motion:reduce){.cp-up,.cp-fade,.cp-rise,.cp-pop,.cp-swap,.cp-float,.cp-float2,.cp-bob,.cp-spin,.cp-skel{animation:none!important}.cp-btn::after{display:none}}
`;

export const d = (i) => ({ animationDelay: `${Math.min(i, 14) * 45}ms` });

// Animated number (counts from the previous value).
function Ticker({ value, money }) {
  const prev = useRef(0);
  const [n, setN] = useState(0);

  useEffect(() => {
    const from = prev.current, to = Number(value) || 0;
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce || from === to) { setN(to); prev.current = to; return; }
    let raf;
    const t0 = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / 800);
      setN(from + (to - from) * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick); else prev.current = to;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return <>{money ? inr(n) : Math.round(n)}</>;
}

const glow = (e) => {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
  e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
};

// --------------------------------------------------
// Popup shell (same look as the New account popup)
// --------------------------------------------------

export function Shell({ title, sub, onClose, busy, max = "max-w-3xl", children }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && !busy && onClose();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [busy, onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-6" role="dialog" aria-modal="true" aria-label={title}>
      <div className="cp-fade absolute inset-0 bg-[#0b1714]/55 backdrop-blur-sm" onClick={() => !busy && onClose()} />

      <div className={`cp-rise relative flex max-h-[92vh] w-full ${max} flex-col overflow-hidden rounded-3xl bg-[#FBFAF6] shadow-2xl ring-1 ring-black/5`}>
        <header className="relative shrink-0 overflow-hidden border-b border-[#132622]/10 px-6 py-5 sm:px-8">
          <span aria-hidden className="cp-float pointer-events-none absolute -left-10 -top-16 h-40 w-40 rounded-full bg-emerald-400/20 blur-3xl" />
          <span aria-hidden className="cp-float2 pointer-events-none absolute -right-8 -top-20 h-44 w-44 rounded-full bg-amber-300/25 blur-3xl" />

          <div className="relative flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="truncate font-serif text-2xl font-medium">{title}</h2>
              {sub && <p className={`mt-0.5 text-sm ${MUTED}`}>{sub}</p>}
            </div>

            <button type="button" aria-label="Close" onClick={onClose} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[#132622]/45 transition hover:rotate-90 hover:bg-[#132622]/[0.06] hover:text-[#132622]">
              <Icon n="x" size={18} />
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6 sm:px-8">{children}</div>
      </div>
    </div>
  );
}

// --------------------------------------------------
// Details popup – fetches the full record when opened
// --------------------------------------------------

function Details({ kind, p, onClose, onDeactivate, onActivate, readOnly }) {
  const sales = useUser().role === "sales", ro = readOnly || sales;   // sales people cannot see balances or change contacts; readOnly is used when this popup opens from a bill
  const toast = useToast();
  const { data, loading, error } = useAsync(() => api(`/${kind}/${p.id}`), [kind, p.id]);

  const K = KIND[kind];
  const dd = { ...p, ...(data || {}) };
  const customer = kind === "customers";
  const addresses = Array.isArray(dd.addresses) ? dd.addresses : [];
  const banks = Array.isArray(dd.bank_details) ? dd.bank_details : [];

  const info = [
    ["Email", dd.email, dd.email && `mailto:${dd.email}`],
    ["Mobile", dd.mobile, dd.mobile && `tel:${dd.mobile}`],
    ["Contact person", [dd.first_name, dd.last_name].filter(Boolean).join(" ")],
    ["GSTIN", dd.gstin],
    ["PAN", dd.pan],
    ["Status", dd.is_active === false ? "Inactive" : "Active"],
  ];

  async function copy(v) {
    try { await navigator.clipboard.writeText(v); toast("Copied."); } catch { toast("Couldn’t copy.", true); }
  }

  const section = (title, count, delay, children) => (
    <div className="cp-up mt-6" style={d(delay)}>
      <h4 className="mb-3 flex items-center gap-2 font-serif text-base font-medium">
        {title}
        {count > 0 && <span className="rounded-full bg-[#132622]/[0.06] px-2 py-0.5 font-sans text-xs">{count}</span>}
      </h4>
      {children}
    </div>
  );

  return (
    <Shell title={dd.display_name} sub={`${K.label} details`} onClose={onClose}>
      {/* Hero */}
      <div className="cp-up flex items-center gap-4" style={d(0)}>
        <span className={`cp-pop flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl font-serif text-2xl text-white shadow-md ${tone(dd.display_name)}`}>
          {dd.display_name?.[0]?.toUpperCase() || "?"}
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate font-serif text-xl font-medium">{dd.display_name}</p>
          <p className={`truncate text-sm ${MUTED}`}>{dd.company_name || "No company name"}</p>
        </div>

        <Pill>{K.label}</Pill>
      </div>

      {/* Balance */}
      <div onMouseMove={glow} className={`cp-up group relative mt-5 overflow-hidden rounded-2xl border bg-gradient-to-br to-white p-5 ${K.card} ${sales ? "hidden" : ""}`} style={d(1)}>
        <span aria-hidden className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{ background: `radial-gradient(260px circle at var(--mx,50%) var(--my,0%), ${K.glow}, transparent 70%)` }} />
        <div className="relative">
          <p className={`text-xs font-medium ${MUTED}`}>{K.owes}</p>
          <div className="big-bal mt-1">
            <CountUp value={abs(dd.balance)} /> <Side side={sideOf(kind, dd.balance)} />
          </div>
          <p className="mt-1 text-[13px] text-[#132622]/60">{customer ? "Amount this customer owes you" : "Amount you owe this vendor"}</p>
        </div>
      </div>

      {error && (
        <p className="cp-up mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">Couldn’t load the full record. Showing what is already on the list. ({error})</p>
      )}

      {/* Contact details */}
      {section("Contact details", 0, 2, (
        <div className="grid gap-3 sm:grid-cols-3">
          {info.map(([k, v, href], i) => (
            <div key={k} className="cp-up" style={d(i + 3)}>
              {href ? (
                <a href={href} className={`${TILE} block`}>
                  <p className={`text-xs ${MUTED}`}>{k}</p>
                  <p className="mt-1 break-all font-medium text-[#1F5D46]">{v}</p>
                </a>
              ) : (
                <button type="button" disabled={!v || k === "Status"} onClick={() => copy(v)} className={`${TILE} block w-full disabled:cursor-default`} title={v && k !== "Status" ? "Click to copy" : undefined}>
                  <p className={`text-xs ${MUTED}`}>{k}</p>
                  <p className="mt-1 break-all font-medium">
                    {k === "Status" && v ? (
                      <span className="inline-flex items-center gap-1.5">
                        <span className={`h-2 w-2 rounded-full ${v === "Active" ? "bg-emerald-500" : "bg-[#132622]/30"}`} />
                        {v}
                      </span>
                    ) : (
                      v || "—"
                    )}
                  </p>
                  {v && k !== "Status" && <span className="absolute right-2 top-2 text-[10px] font-semibold text-[#1F5D46] opacity-0 transition-opacity group-hover:opacity-100">Copy</span>}
                </button>
              )}
            </div>
          ))}
        </div>
      ))}

      {/* Addresses + bank accounts */}
      {loading ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {[0, 1].map((i) => <div key={i} className="cp-skel h-24 rounded-xl" />)}
        </div>
      ) : (
        <>
          {section("Addresses", addresses.length, 9, addresses.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {addresses.map((a, i) => (
                <div key={i} className={TILE}>
                  <p className="mb-1 text-xs font-semibold capitalize text-[#1F5D46]">{a.address_type || "Address"}</p>
                  <p className="text-sm leading-relaxed">{[a.address_line1 || a.address, a.address_line2, a.city, a.state, a.pin_code, a.country].filter(Boolean).join(", ") || "—"}</p>
                </div>
              ))}
            </div>
          ) : <p className={`text-sm ${MUTED}`}>No address added.</p>)}

          {section("Bank accounts", banks.length, 10, banks.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {banks.map((b, i) => (
                <div key={i} className={TILE}>
                  <p className="font-medium">{b.bank_name || "Bank"}</p>
                  <p className="num !text-left mt-1 text-sm tracking-wider">{mask(b.account_number)}</p>
                  <p className={`mt-1 text-xs ${MUTED}`}>IFSC {b.ifsc || "—"}</p>
                </div>
              ))}
            </div>
          ) : <p className={`text-sm ${MUTED}`}>No bank account added.</p>)}
        </>
      )}

      {/* Actions */}
      <div className="cp-up mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-[#132622]/10 pt-5" style={d(11)}>
        {dd.account_id && !sales ? (
          <Link href={`/ledger?account=${dd.account_id}`} className="group inline-flex items-center gap-1 font-medium text-[#1F5D46] underline decoration-[#B9852F] underline-offset-4">
            Open full ledger <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
          </Link>
        ) : <span />}

        <div className="flex gap-3">
          {!ro && (dd.is_active === false
            ? <Btn onClick={() => onActivate(p)}>Activate</Btn>
            : <Btn variant="danger" onClick={() => onDeactivate(p)}>Deactivate</Btn>)}
          <Btn onClick={onClose}>Close</Btn>
        </div>
      </div>
    </Shell>
  );
}

// --------------------------------------------------
// Small pieces
// --------------------------------------------------

// Read-only version for opening from a bill (Sales / Purchases pages).
export function PartyDetails({ kind, p, onClose }) {
  return (<><style>{CSS}</style><Details kind={kind} p={p} onClose={onClose} readOnly /></>);
}

function Stat({ icon, label, i, children, sub }) {
  return (
    <div className="cp-up group relative overflow-hidden rounded-2xl border border-[#132622]/10 bg-white/70 p-4 transition duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#132622]/5" style={d(i)}>
      <span aria-hidden className="pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full bg-[#1F5D46]/[0.07] blur-2xl transition-transform duration-500 group-hover:scale-150" />
      <div className="relative flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1F5D46]/10 text-[#1F5D46] transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">
          <Icon n={icon} size={18} />
        </span>
        <div className="min-w-0">
          <p className={`text-xs font-medium ${MUTED}`}>{label}</p>
          <p className="num !text-left truncate text-xl font-semibold">{children}</p>
          {sub && <p className={`truncate text-[11px] ${MUTED}`}>{sub}</p>}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ search, one, kind, onAdd, onClear }) {
  return (
    <div className="cp-up flex flex-col items-center rounded-3xl border border-dashed border-[#132622]/20 bg-white/50 px-6 py-14 text-center">
      <span className="cp-bob flex h-16 w-16 items-center justify-center rounded-2xl bg-[#1F5D46]/10 text-[#1F5D46] ring-8 ring-[#1F5D46]/5">
        <Icon n={search ? "search" : "users"} size={28} />
      </span>
      <p className="mt-5 font-serif text-xl font-medium">{search ? "No matches found" : `No ${kind} yet`}</p>
      <p className={`mt-1 max-w-xs text-sm ${MUTED}`}>{search ? "Try a different name, email, mobile or GSTIN." : `Add your first ${one} to start tracking what ${kind === "customers" ? "they owe you" : "you owe them"}.`}</p>
      <div className="mt-5">
        {search ? <Btn variant="line" onClick={onClear}>Clear search</Btn> : <Btn className="cp-btn" onClick={onAdd}>New {one}</Btn>}
      </div>
    </div>
  );
}

// --------------------------------------------------
// Page
// --------------------------------------------------

export default function Contacts() {
  const sales = useUser().role === "sales", toast = useToast(), [kind, setKind] = useState("customers"), [open, setOpen] = useState(false), [f, setF] = useState(blank), [busy, setBusy] = useState(false), [view, setView] = useState(null), [inactive, setInactive] = useState(false), [q, setQ] = useState("");
  const { data, error, loading, reload } = useAsync(() => api(`/${kind}${inactive ? "?active_only=false" : ""}`), [kind, inactive]);
  const K = KIND[kind];
  const one = K.one;
  const set = (k) => (e) => setF({ ...f, [k]: UPPER.has(k) ? e.target.value.toUpperCase() : e.target.value });

  const all = Array.isArray(data) ? data : [];
  const needle = q.trim().toLowerCase();
  const rows = needle ? all.filter((p) => [p.display_name, p.company_name, p.email, p.mobile, p.gstin, p.pan].some((x) => String(x || "").toLowerCase().includes(needle))) : all;

  const total = all.reduce((s, p) => s + Math.max(0, Number(p.balance) || 0), 0);
  const top = all.reduce((m, p) => ((Number(p.balance) || 0) > (Number(m?.balance) || 0) ? p : m), null);

  async function save(e) {
    e.preventDefault(); setBusy(true);
    const v = (x) => x.trim() || null;
    const body = {
      display_name: f.display_name.trim(), company_name: v(f.company_name), first_name: v(f.first_name), last_name: v(f.last_name),
      email: v(f.email), mobile: v(f.mobile), gstin: v(f.gstin), pan: v(f.pan),
      addresses: f.city || f.state || f.pin_code ? [{ address_type: "billing", city: v(f.city), state: v(f.state), pin_code: v(f.pin_code), country: "India" }] : [],
      bank_details: f.bank_name || f.account_number ? [{ bank_name: v(f.bank_name), account_number: v(f.account_number), ifsc: v(f.ifsc) }] : [],
    };
    try { await api(`/${kind}`, send("POST", body)); toast(`${one[0].toUpperCase() + one.slice(1)} added.`); setOpen(false); setF(blank); reload(); }
    catch (er) { toast(er.message, true); }
    setBusy(false);
  }

  async function deactivate(p) {
    if (!confirm(`Deactivate ${p.display_name}? Past entries are kept.`)) return;
    try { await api(`/${kind}/${p.id}`, { method: "DELETE" }); toast("Deactivated."); setView(null); reload(); } catch (er) { toast(er.message, true); }
  }

  async function activate(p) {
    try { await api(`/${kind}/${p.id}/activate`, { method: "PATCH" }); toast(`${p.display_name} activated.`); setView(null); reload(); } catch (er) { toast(er.message, true); }
  }

  const stop = (fn) => (e) => { e.stopPropagation(); fn(); };

  const field = (k, label, props = {}, span = "") => (
    <Field key={k} label={label} className={span}>
      <Input value={f[k]} onChange={set(k)} {...props} />
    </Field>
  );

  const heading = (t, i) => <p className="cp-up sm:col-span-2 -mb-1 mt-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#1F5D46]" style={d(i)}>{t}</p>;

  return (
    <>
      <style>{CSS}</style>

      <PageHeader eyebrow="Books" title="Customers and vendors">
        <Btn className="cp-btn" onClick={() => setOpen(true)}>
          <span className="inline-flex items-center gap-2"><Icon n="plus" size={16} />New {one}</span>
        </Btn>
      </PageHeader>

      {/* Toolbar */}
      <div className="cp-up mb-5 flex flex-wrap items-center gap-3" style={d(0)}>
        <div role="tablist" aria-label="Contact type" className={`relative grid w-full max-w-sm grid-cols-2 rounded-2xl bg-[#132622]/[0.06] p-1 ${sales ? "hidden" : ""}`}>
          <span
            aria-hidden
            className="absolute bottom-1 left-1 top-1 w-[calc((100%-0.5rem)/2)] rounded-xl bg-white shadow-md ring-1 ring-black/5 transition-transform duration-500 ease-[cubic-bezier(.2,.9,.25,1.1)]"
            style={{ transform: `translateX(${kind === "customers" ? 0 : 100}%)` }}
          />
          {["customers", "vendors"].map((x) => (
            <button key={x} type="button" role="tab" aria-selected={kind === x} onClick={() => { setKind(x); setQ(""); }} className={`relative z-10 flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors duration-300 ${kind === x ? KIND[x].text : "text-[#132622]/55 hover:text-[#132622]"}`}>
              <Icon n={KIND[x].icon} size={15} className={`transition-transform duration-300 ${kind === x ? "scale-110" : ""}`} />
              {x === "customers" ? "Customers" : "Vendors"} <span className="hidden font-normal opacity-60 sm:inline">({x === "customers" ? "sales" : "purchases"})</span>
            </button>
          ))}
        </div>

        <label className="group flex min-w-[220px] flex-1 items-center gap-2 rounded-2xl bg-white/70 px-3.5 py-2.5 ring-1 ring-[#132622]/10 transition focus-within:bg-white focus-within:ring-2 focus-within:ring-[#1F5D46]/40">
          <Icon n="search" size={16} className="text-[#132622]/40 transition-colors group-focus-within:text-[#1F5D46]" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${kind} by name, email, mobile or GSTIN`} aria-label="Search" className="w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-[#132622]/35" />
          {q && (
            <button type="button" aria-label="Clear search" onClick={() => setQ("")} className="cp-pop rounded-md p-0.5 text-[#132622]/40 hover:bg-[#132622]/[0.06] hover:text-[#132622]">
              <Icon n="x" size={14} />
            </button>
          )}
        </label>

        <button type="button" role="switch" aria-checked={inactive} onClick={() => setInactive((x) => !x)} className="flex items-center gap-2.5 rounded-2xl px-2 py-2 text-sm text-[#132622]/70 transition hover:text-[#132622]">
          <span className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-300 ${inactive ? "bg-[#1F5D46]" : "bg-[#132622]/20"}`}>
            <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-300 ${inactive ? "translate-x-5" : ""}`} />
          </span>
          Show inactive
        </button>
      </div>

      {/* Stats */}
      {!sales && !loading && !error && all.length > 0 && (
        <div key={kind} className="mb-5 grid gap-3 sm:grid-cols-3">
          <Stat i={1} icon="users" label={kind === "customers" ? "Customers" : "Vendors"} sub={needle ? `${rows.length} match your search` : inactive ? "Including inactive" : "Active"}>
            <Ticker value={all.length} />
          </Stat>
          <Stat i={2} icon="trend" label={kind === "customers" ? "Total receivable" : "Total payable"} sub={kind === "customers" ? "Across all customers" : "Across all vendors"}>
            <Ticker value={total} money />
          </Stat>
          <Stat i={3} icon="star" label="Largest balance" sub={top && Number(top.balance) > 0 ? top.display_name : "—"}>
            <Ticker value={top ? Math.max(0, Number(top.balance) || 0) : 0} money />
          </Stat>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-2.5">{[0, 1, 2, 3, 4].map((i) => <div key={i} className="cp-skel h-[74px] rounded-2xl" style={d(i)} />)}</div>
      ) : error ? (
        <div className="cp-up rounded-2xl bg-red-50 px-5 py-4 text-sm text-red-600">{error}</div>
      ) : rows.length ? (
        <ul key={`${kind}-${inactive}`} className="space-y-2.5">
          {rows.map((p, i) => {
            const off = p.is_active === false;
            return (
              <li
                key={p.id}
                onClick={() => setView(p)}
                title="Click to view details"
                style={d(i)}
                className={`cp-up group relative grid cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-4 overflow-hidden rounded-2xl border border-[#132622]/10 bg-white/70 px-4 py-3.5 transition duration-300 hover:-translate-y-0.5 hover:border-[#1F5D46]/30 hover:bg-white hover:shadow-lg hover:shadow-[#132622]/5 md:grid-cols-[auto_minmax(0,1.3fr)_minmax(0,1.2fr)_minmax(0,0.9fr)_auto_auto] ${off ? "opacity-70" : ""}`}
              >
                <span aria-hidden className={`absolute inset-y-0 left-0 w-1 origin-top scale-y-0 transition-transform duration-300 group-hover:scale-y-100 ${K.bar}`} />

                <span className={`flex h-11 w-11 items-center justify-center rounded-xl font-serif text-lg text-white shadow-sm transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3 ${tone(p.display_name)}`}>
                  {p.display_name?.[0]?.toUpperCase() || "?"}
                </span>

                <div className="min-w-0">
                  <p className="flex items-center gap-2 truncate font-semibold">
                    <span className="truncate">{p.display_name}</span>
                    {off && <span className="shrink-0 rounded-full bg-[#132622]/[0.08] px-2 py-0.5 text-[11px] font-medium text-[#132622]/60">Inactive</span>}
                  </p>
                  <p className={`truncate text-sm ${MUTED}`}>{p.company_name || "No company name"}</p>
                </div>

                <div className="hidden min-w-0 space-y-0.5 text-sm md:block">
                  <p className={`flex items-center gap-2 truncate ${p.email ? "" : "text-[#132622]/25"}`}><Icon n="mail" size={13} className="shrink-0 text-[#132622]/40" /><span className="truncate">{p.email || "—"}</span></p>
                  <p className={`flex items-center gap-2 truncate ${p.mobile ? "" : "text-[#132622]/25"}`}><Icon n="phone" size={13} className="shrink-0 text-[#132622]/40" /><span className="truncate">{p.mobile || "—"}</span></p>
                </div>

                <div className="hidden flex-wrap gap-1.5 md:flex">
                  {p.gstin && <span className={`rounded-md px-2 py-0.5 font-mono text-[11px] font-semibold ${K.chip}`}>{p.gstin}</span>}
                  {p.pan && <span className="rounded-md bg-[#132622]/[0.06] px-2 py-0.5 font-mono text-[11px] font-semibold">{p.pan}</span>}
                  {!p.gstin && !p.pan && <span className="text-sm text-[#132622]/25">—</span>}
                </div>

                <div className={`text-right ${sales ? "invisible" : ""}`}>
                  <p className={`text-[11px] ${MUTED}`}>{K.owes}</p>
                  <p className={`num font-semibold ${abs(p.balance) ? K.text : "text-[#132622]/40"}`}>
                    {inr(abs(p.balance))}<Side side={sideOf(kind, p.balance)} />
                  </p>
                </div>

                <div className="hidden justify-end gap-2 md:flex">
                  <Btn variant="line" className="btn-sm" onClick={stop(() => setView(p))}>View</Btn>
                  {!sales && (off
                    ? <Btn className="btn-sm" onClick={stop(() => activate(p))}>Activate</Btn>
                    : <Btn variant="danger" className="btn-sm" onClick={stop(() => deactivate(p))}>Deactivate</Btn>)}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState search={!!needle} one={one} kind={kind} onAdd={() => setOpen(true)} onClear={() => setQ("")} />
      )}

      {view && <Details key={view.id} kind={kind} p={view} onClose={() => setView(null)} onDeactivate={deactivate} onActivate={activate} />}

      {open && (
        <Shell title={`New ${one}`} sub="Core details now. More fields can be added later." onClose={() => setOpen(false)} busy={busy}>
          <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
            {heading("Basics", 0)}
            <Field label="Display name *" className="cp-up sm:col-span-2" style={d(1)}><Input autoFocus required value={f.display_name} onChange={set("display_name")} placeholder={kind === "customers" ? "e.g. Shah Traders" : "e.g. Patel Suppliers"} /></Field>
            {field("company_name", "Company name", {}, "sm:col-span-2")}
            {field("first_name", "First name")}
            {field("last_name", "Last name")}

            {heading("Contact and tax", 4)}
            {field("email", "Email", { type: "email", placeholder: "name@company.com" })}
            {field("mobile", "Mobile", { inputMode: "tel", placeholder: "98765 43210" })}
            {field("gstin", "GSTIN", { maxLength: 15, placeholder: "24ABCDE1234F1Z5" })}
            {field("pan", "PAN", { maxLength: 10, placeholder: "ABCDE1234F" })}

            {heading("Address", 6)}
            {field("city", "City")}
            {field("state", "State")}
            {field("pin_code", "PIN code", { maxLength: 6, inputMode: "numeric" })}

            {heading("Bank account", 8)}
            {field("bank_name", "Bank name")}
            {field("account_number", "Account number", { inputMode: "numeric" })}
            {field("ifsc", "IFSC", { maxLength: 11, placeholder: "HDFC0001234" })}

            <div className="cp-up flex flex-wrap gap-3 pt-2 sm:col-span-2" style={d(10)}>
              <Btn type="submit" className="cp-btn min-w-44" disabled={busy}>
                {busy ? (
                  <span className="inline-flex items-center gap-2"><span className="cp-spin h-4 w-4 rounded-full border-2 border-white/40 border-t-white" />Saving…</span>
                ) : `Save ${one}`}
              </Btn>
              <Btn type="button" variant="line" onClick={() => setOpen(false)}>Cancel</Btn>
            </div>
          </form>
        </Shell>
      )}
    </>
  );
}