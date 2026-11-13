"use client";

import { useEffect, useState } from "react";

import { Btn, Field, Input, useToast } from "@/components/ui";
import { api, send } from "@/lib/api";
import { inr } from "@/lib/format";

const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const mask = (n) => (n ? `•••• ${String(n).slice(-4)}` : "");

// Static class names so Tailwind can see them.
const TYPES = [
  { v: "asset", label: "Asset", nature: "Dr", hint: "Cash, bank, stock, money customers owe you.", dot: "bg-emerald-500", text: "text-emerald-700", sel: "border-emerald-600/50 bg-emerald-50 ring-2 ring-emerald-600/20", card: "border-emerald-600/25 from-emerald-50" },
  { v: "liability", label: "Liability", nature: "Cr", hint: "Loans, money you owe vendors, taxes payable.", dot: "bg-amber-500", text: "text-amber-700", sel: "border-amber-600/50 bg-amber-50 ring-2 ring-amber-600/20", card: "border-amber-600/25 from-amber-50" },
  { v: "equity", label: "Equity", nature: "Cr", hint: "Owner’s capital, drawings, retained earnings.", dot: "bg-violet-500", text: "text-violet-700", sel: "border-violet-600/50 bg-violet-50 ring-2 ring-violet-600/20", card: "border-violet-600/25 from-violet-50" },
  { v: "income", label: "Income", nature: "Cr", hint: "Sales, service fees, interest earned.", dot: "bg-sky-500", text: "text-sky-700", sel: "border-sky-600/50 bg-sky-50 ring-2 ring-sky-600/20", card: "border-sky-600/25 from-sky-50" },
  { v: "expense", label: "Expense", nature: "Dr", hint: "Rent, salaries, purchases, bank charges.", dot: "bg-rose-500", text: "text-rose-700", sel: "border-rose-600/50 bg-rose-50 ring-2 ring-rose-600/20", card: "border-rose-600/25 from-rose-50" },
];

// The three things this popup can create.
const KINDS = [
  { v: "account", label: "Ledger", one: "account", icon: "book", card: "border-[#132622]/15 from-[#132622]/[0.04]", glow: "rgba(31,93,70,.14)", avatar: "bg-[#1F5D46]", text: "text-[#1F5D46]" },
  { v: "customers", label: "Customer", one: "customer", icon: "user", card: "border-emerald-600/25 from-emerald-50", glow: "rgba(5,150,105,.16)", avatar: "bg-emerald-600", text: "text-emerald-700", side: "Dr", owes: "Owes you" },
  { v: "vendors", label: "Supplier", one: "supplier", icon: "truck", card: "border-amber-600/25 from-amber-50", glow: "rgba(217,119,6,.16)", avatar: "bg-amber-600", text: "text-amber-700", side: "Cr", owes: "You owe" },
];

const ICONS = {
  book: "M4 5a2 2 0 012-2h12v16H6a2 2 0 00-2 2V5zm2 14h12M8 7h6",
  user: "M12 12a4 4 0 100-8 4 4 0 000 8zm-7 8a7 7 0 0114 0",
  truck: "M3 6h11v10H3zM14 9h4l3 3v4h-7M7 19a2 2 0 100-4 2 2 0 000 4zm10 0a2 2 0 100-4 2 2 0 000 4z",
  chevron: "M6 9l6 6 6-6",
};

const Icon = ({ n, size = 16, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d={ICONS[n]} />
  </svg>
);

const CSS = `
@keyframes na-up{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
@keyframes na-pop{0%{opacity:.5;transform:scale(.94)}60%{transform:scale(1.025)}100%{opacity:1;transform:scale(1)}}
@keyframes na-shake{10%,90%{transform:translateX(-1px)}20%,80%{transform:translateX(2px)}30%,50%,70%{transform:translateX(-5px)}40%,60%{transform:translateX(5px)}}
@keyframes na-draw{to{stroke-dashoffset:0}}
@keyframes na-burst{0%{opacity:0;transform:scale(.5)}60%{opacity:1;transform:scale(1.08)}100%{opacity:1;transform:scale(1)}}
@keyframes na-fade{from{opacity:0}to{opacity:1}}
@keyframes na-rise{from{opacity:0;transform:translateY(24px) scale(.97)}to{opacity:1;transform:none}}
@keyframes na-spin{to{transform:rotate(360deg)}}
@keyframes na-swap{from{opacity:0;transform:translateX(18px) scale(.99)}to{opacity:1;transform:none}}
@keyframes na-float{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(18px,-12px) scale(1.12)}}
@keyframes na-confetti{0%{opacity:0;transform:translate(0,0) scale(.4)}15%{opacity:1}100%{opacity:0;transform:translate(var(--x),var(--y)) scale(1)}}
@keyframes na-sheen{from{transform:translateX(-120%)}to{transform:translateX(220%)}}
.na-up{animation:na-up .45s cubic-bezier(.2,.8,.2,1) both}
.na-pop{animation:na-pop .4s cubic-bezier(.2,.8,.2,1) both}
.na-shake{animation:na-shake .45s ease}
.na-burst{animation:na-burst .5s cubic-bezier(.2,.8,.2,1) both}
.na-check{stroke-dasharray:48;stroke-dashoffset:48;animation:na-draw .5s .3s ease forwards}
.na-spin{animation:na-spin .7s linear infinite}
.na-fade{animation:na-fade .25s ease both}
.na-rise{animation:na-rise .4s cubic-bezier(.2,.8,.2,1) both}
.na-swap{animation:na-swap .38s cubic-bezier(.2,.8,.2,1) both}
.na-float{animation:na-float 9s ease-in-out infinite}
.na-float2{animation:na-float 12s ease-in-out infinite reverse}
.na-dot{position:absolute;left:50%;top:50%;height:8px;width:8px;border-radius:9999px;animation:na-confetti .9s cubic-bezier(.2,.8,.2,1) both}
.na-btn{position:relative;overflow:hidden}
.na-btn::after{content:"";position:absolute;inset:0;width:40%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.35),transparent);transform:translateX(-120%)}
.na-btn:hover::after{animation:na-sheen .8s ease}
@media (prefers-reduced-motion:reduce){.na-up,.na-pop,.na-shake,.na-burst,.na-spin,.na-fade,.na-rise,.na-swap,.na-float,.na-float2,.na-dot{animation:none!important}.na-check{animation:none!important;stroke-dashoffset:0}.na-btn::after{display:none}}
`;

const MUTED = "text-[#132622]/55";

const blankAcc = { name: "", type: "", opening: "", neg: true };
const blankContact = { display_name: "", company_name: "", first_name: "", last_name: "", email: "", mobile: "", gstin: "", pan: "", city: "", state: "", pin_code: "", bank_name: "", account_number: "", ifsc: "" };

// Fields stored uppercase.
const UPPER = new Set(["gstin", "pan", "ifsc"]);

const RX = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  mobile: /^(\+?91)?[6-9]\d{9}$/,
  gstin: /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/,
  pan: /^[A-Z]{5}\d{4}[A-Z]$/,
  pin_code: /^\d{6}$/,
  ifsc: /^[A-Z]{4}0[A-Z0-9]{6}$/,
};

const MSG = {
  email: "Enter a valid email address.",
  mobile: "Enter a valid 10-digit mobile number.",
  gstin: "GSTIN must be 15 characters, e.g. 24ABCDE1234F1Z5.",
  pan: "PAN looks like ABCDE1234F.",
  pin_code: "PIN code must be 6 digits.",
  ifsc: "IFSC looks like HDFC0001234.",
};

// Collapsible block with smooth height animation.
function Collapse({ title, hint, open, onToggle, filled, children }) {
  return (
    <div className={`rounded-xl border transition-colors duration-300 ${open ? "border-[#1F5D46]/30 bg-white/80" : "border-[#132622]/10 bg-white/50 hover:border-[#132622]/25"}`}>
      <button type="button" aria-expanded={open} onClick={onToggle} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left">
        <span>
          <span className="flex items-center gap-2 text-sm font-semibold">
            {title}
            {filled && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
          </span>
          <span className={`text-xs ${MUTED}`}>{hint}</span>
        </span>
        <Icon n="chevron" className={`shrink-0 text-[#132622]/50 transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
      </button>

      <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div className="overflow-hidden">
          <div className={`grid gap-4 px-4 pb-4 pt-1 transition-opacity duration-300 sm:grid-cols-2 ${open ? "opacity-100" : "opacity-0"}`}>{children}</div>
        </div>
      </div>
    </div>
  );
}

export default function NewAccountModal({ names = [], onClose, onCreated }) {
  const toast = useToast();

  const [kind, setKind] = useState("account");
  const [f, setF] = useState(blankAcc);
  const [c, setC] = useState(blankContact);
  const [openAddr, setOpenAddr] = useState(false);
  const [openBank, setOpenBank] = useState(false);
  const [err, setErr] = useState({});
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(false);
  const [done, setDone] = useState(null);

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

  const K = KINDS.find((x) => x.v === kind);
  const kIndex = KINDS.indexOf(K);
  const isContact = kind !== "account";
  const t = TYPES.find((x) => x.v === f.type);

  const clear = (key) =>
    setErr((s) => {
      const n = { ...s };
      delete n[key];
      delete n.form;
      return n;
    });

  const edit = (patch) => {
    setF((s) => ({ ...s, ...patch }));
    setErr({});
  };

  const setField = (k) => (e) => {
    const val = UPPER.has(k) ? e.target.value.toUpperCase() : e.target.value;
    setC((s) => ({ ...s, [k]: val }));
    clear(k);
  };

  const pick = (v) => {
    if (busy || v === kind) return;
    setKind(v);
    setErr({});
  };

  function fail(e) {
    setErr(e);
    setShake(true);
    setTimeout(() => setShake(false), 500);
  }

  const taken = (name) => names.some((n) => n.toLowerCase() === name.toLowerCase());

  async function saveAccount() {
    const name = f.name.trim();
    const e = {};

    if (!name) e.name = "Enter an account name.";
    else if (taken(name)) e.name = "An account with this name already exists.";
    if (!t) e.type = "Choose what kind of account this is.";
    if (Object.keys(e).length) return fail(e);

    await submit("/accounts", { name, account_type: t.v, opening_balance: r2(f.opening), allow_negative: f.neg }, name);
  }

  async function saveContact() {
    const name = c.display_name.trim();
    const e = {};

    if (!name) e.display_name = `Enter the ${K.one}’s name.`;
    else if (taken(name)) e.display_name = "An account with this name already exists.";

    for (const k of Object.keys(RX)) {
      let val = c[k].trim();
      if (!val) continue;
      if (k === "mobile") val = val.replace(/[\s-]/g, "");
      if (!RX[k].test(val)) e[k] = MSG[k];
    }

    if (Object.keys(e).length) {
      if (e.city || e.state || e.pin_code) setOpenAddr(true);
      if (e.ifsc || e.bank_name || e.account_number) setOpenBank(true);
      return fail(e);
    }

    const v = (x) => x.trim() || null;
    const body = {
      display_name: name,
      company_name: v(c.company_name),
      first_name: v(c.first_name),
      last_name: v(c.last_name),
      email: v(c.email),
      mobile: v(c.mobile),
      gstin: v(c.gstin),
      pan: v(c.pan),
      addresses: c.city || c.state || c.pin_code ? [{ address_type: "billing", city: v(c.city), state: v(c.state), pin_code: v(c.pin_code), country: "India" }] : [],
      bank_details: c.bank_name || c.account_number ? [{ bank_name: v(c.bank_name), account_number: v(c.account_number), ifsc: v(c.ifsc) }] : [],
    };

    await submit(`/${kind}`, body, name);
  }

  async function submit(path, body, name) {
    setBusy(true);

    try {
      await api(path, send("POST", body));
      setDone({ name, kind });
      setTimeout(() => onCreated(name, kind), 1300);
    } catch (er) {
      const message = er.message || `Unable to create ${K.one}.`;
      fail({ form: message });
      toast(message, true);
    }

    setBusy(false);
  }

  function save(ev) {
    ev.preventDefault();
    return isContact ? saveContact() : saveAccount();
  }

  // Delay helper for staggered entrance
  const d = (i) => ({ animationDelay: `${i * 55}ms` });

  const E = ({ k }) => (err[k] ? <p className="na-up mt-1.5 text-xs font-medium text-red-600">{err[k]}</p> : null);

  const cf = (k, label, props = {}, span = "") => (
    <div key={k} className={span}>
      <Field label={label}>
        <Input value={c[k]} onChange={setField(k)} {...props} />
      </Field>
      <E k={k} />
    </div>
  );

  const glow = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
  };

  const dots = ["#10b981", "#f59e0b", "#0ea5e9", "#8b5cf6", "#f43f5e", "#1F5D46", "#B9852F", "#10b981", "#0ea5e9", "#f59e0b", "#8b5cf6", "#f43f5e"];

  const doneKind = done ? KINDS.find((x) => x.v === done.kind) : null;
  const submitLabel = isContact ? `Add ${K.one}` : "Create account";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-6" role="dialog" aria-modal="true" aria-label="New account">
      <div className="na-fade absolute inset-0 bg-[#0b1714]/55 backdrop-blur-sm" onClick={() => !busy && onClose()} />

      <div className="na-rise relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-[#FBFAF6] shadow-2xl ring-1 ring-black/5">
        <style>{CSS}</style>

        {/* Header with soft floating orbs */}
        <header className="relative shrink-0 overflow-hidden border-b border-[#132622]/10 px-6 pb-5 pt-5 sm:px-8">
          <span aria-hidden className="na-float pointer-events-none absolute -left-10 -top-16 h-40 w-40 rounded-full bg-emerald-400/20 blur-3xl" />
          <span aria-hidden className="na-float2 pointer-events-none absolute -right-8 -top-20 h-44 w-44 rounded-full bg-amber-300/25 blur-3xl" />

          <div className="relative flex items-start justify-between gap-4">
            <div>
              <h2 className="font-serif text-2xl font-medium">{isContact ? `New ${K.one}` : "New account"}</h2>
              <p className={`mt-0.5 text-sm ${MUTED}`}>
                {isContact ? `Add a ${K.one} with GST, address and bank details.` : "Add an account to your chart of accounts."}
              </p>
            </div>

            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xl text-[#132622]/45 transition hover:rotate-90 hover:bg-[#132622]/[0.06] hover:text-[#132622]"
            >
              ×
            </button>
          </div>

          {/* Kind toggle with sliding pill */}
          {!done && (
            <div role="tablist" aria-label="What do you want to add?" className="relative mt-5 grid max-w-md grid-cols-3 rounded-2xl bg-[#132622]/[0.06] p-1">
              <span
                aria-hidden
                className="absolute bottom-1 left-1 top-1 w-[calc((100%-0.5rem)/3)] rounded-xl bg-white shadow-md ring-1 ring-black/5 transition-transform duration-500 ease-[cubic-bezier(.2,.9,.25,1.1)]"
                style={{ transform: `translateX(${kIndex * 100}%)` }}
              />
              {KINDS.map((x) => (
                <button
                  key={x.v}
                  type="button"
                  role="tab"
                  aria-selected={kind === x.v}
                  onClick={() => pick(x.v)}
                  className={`relative z-10 flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition-colors duration-300 ${kind === x.v ? x.text : "text-[#132622]/55 hover:text-[#132622]"}`}
                >
                  <Icon n={x.icon} size={15} className={`transition-transform duration-300 ${kind === x.v ? "scale-110" : ""}`} />
                  {x.label}
                </button>
              ))}
            </div>
          )}
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6 sm:px-8">
          {done ? (
            // ---------------- Success ----------------
            <div className="relative flex flex-col items-center py-10 text-center">
              <span className="relative">
                {dots.map((col, i) => {
                  const a = (i / dots.length) * Math.PI * 2;
                  const r = 70 + (i % 3) * 14;
                  return <span key={i} className="na-dot" style={{ background: col, "--x": `${Math.cos(a) * r}px`, "--y": `${Math.sin(a) * r}px`, animationDelay: `${0.25 + (i % 4) * 30}ms` }} />;
                })}
                <span className="na-burst relative flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10 ring-8 ring-emerald-500/10">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path className="na-check" d="M5 12.5l4.5 4.5L19 7.5" />
                  </svg>
                </span>
              </span>

              <p className="na-up mt-5 font-serif text-xl font-medium" style={d(4)}>
                {doneKind.v === "account" ? "Account created" : `${doneKind.label} added`}
              </p>
              <p className={`na-up mt-1 text-sm ${MUTED}`} style={d(5)}>
                {doneKind.v === "account" ? `“${done.name}” is ready to use in your journal entries.` : `“${done.name}” is now in your ${doneKind.v === "customers" ? "customers" : "suppliers"} and ready for invoices.`}
              </p>
            </div>
          ) : (
            <form onSubmit={save} className={`grid gap-6 lg:grid-cols-[1.5fr_1fr] lg:gap-8 ${shake ? "na-shake" : ""}`}>
              {/* ---------------- Form ---------------- */}
              <div key={kind} className="na-swap space-y-5">
                {!isContact ? (
                  <>
                    <div className="na-up" style={d(0)}>
                      <Field label="Account name">
                        <Input autoFocus value={f.name} onChange={(e) => edit({ name: e.target.value })} placeholder="e.g. HDFC Current Account" maxLength={80} />
                      </Field>
                      {err.name && <p className="na-up mt-1.5 text-xs font-medium text-red-600">{err.name}</p>}
                    </div>

                    {/* Type picker */}
                    <div className="na-up" style={d(1)}>
                      <p className="mb-2 text-sm font-semibold">Account type</p>

                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                        {TYPES.map((x, i) => {
                          const on = f.type === x.v;

                          return (
                            <button
                              key={x.v}
                              type="button"
                              aria-pressed={on}
                              onClick={() => edit({ type: x.v })}
                              style={d(i + 2)}
                              className={`na-up rounded-xl border p-3 text-left transition duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                                on ? `${x.sel} -translate-y-0.5 shadow-md` : "border-[#132622]/10 bg-white/70 hover:border-[#132622]/25"
                              }`}
                            >
                              <span className={`block h-2.5 w-2.5 rounded-full transition-transform duration-300 ${x.dot} ${on ? "scale-150" : ""}`} />
                              <span className="mt-2 block text-sm font-semibold">{x.label}</span>
                              <span className={`text-[11px] ${MUTED}`}>Normal: {x.nature}</span>
                            </button>
                          );
                        })}
                      </div>

                      <p key={f.type} className={`na-up mt-2 min-h-[1.25rem] text-xs ${err.type ? "font-medium text-red-600" : MUTED}`}>
                        {err.type || t?.hint || "Pick the group this account belongs to."}
                      </p>
                    </div>

                    {/* Opening balance */}
                    <div className="na-up" style={d(2)}>
                      <p className="mb-2 text-sm font-semibold">Opening balance</p>

                      <label
                        className={`flex items-center gap-2 rounded-xl px-3 py-2.5 ring-1 transition focus-within:ring-2 ${
                          t ? (t.nature === "Dr" ? "bg-emerald-50/60 ring-emerald-600/30 focus-within:ring-emerald-600/60" : "bg-sky-50/60 ring-sky-600/30 focus-within:ring-sky-600/60") : "bg-[#132622]/[0.03] ring-[#132622]/10 focus-within:ring-[#1F5D46]/50"
                        }`}
                      >
                        <span className="text-sm text-[#132622]/40">₹</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          inputMode="decimal"
                          placeholder="0.00"
                          aria-label="Opening balance"
                          value={f.opening}
                          onChange={(e) => edit({ opening: e.target.value })}
                          className="w-full min-w-0 bg-transparent text-right text-base font-semibold tabular-nums outline-none placeholder:font-normal placeholder:text-[#132622]/25 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        />
                        <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold transition-colors ${t ? (t.nature === "Dr" ? "bg-emerald-600 text-white" : "bg-sky-600 text-white") : "bg-[#132622]/10 text-[#132622]/55"}`}>
                          {t?.nature || "Dr/Cr"}
                        </span>
                      </label>

                      <p className={`mt-1.5 text-xs ${MUTED}`}>Entered on the account’s normal side. Leave empty to start at zero.</p>
                    </div>

                    {/* Negative balance switch */}
                    <button
                      type="button"
                      role="switch"
                      aria-checked={f.neg}
                      onClick={() => edit({ neg: !f.neg })}
                      style={d(4)}
                      className="na-up flex w-full items-center justify-between gap-4 rounded-xl border border-[#132622]/10 bg-white/70 p-3 text-left transition hover:border-[#132622]/25"
                    >
                      <span>
                        <span className="block text-sm font-semibold">Allow negative balance</span>
                        <span className={`text-xs ${MUTED}`}>{f.neg ? "Entries can take this account below zero." : "You’ll be warned before an entry takes it below zero."}</span>
                      </span>

                      <span className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-300 ${f.neg ? "bg-[#1F5D46]" : "bg-[#132622]/20"}`}>
                        <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-300 ${f.neg ? "translate-x-5" : ""}`} />
                      </span>
                    </button>
                  </>
                ) : (
                  <>
                    {/* Identity */}
                    <div className="na-up" style={d(0)}>
                      <Field label={`${K.label} name *`}>
                        <Input autoFocus value={c.display_name} onChange={setField("display_name")} placeholder={kind === "customers" ? "e.g. Shah Traders" : "e.g. Patel Suppliers"} maxLength={80} />
                      </Field>
                      <E k="display_name" />
                    </div>

                    <div className="na-up grid gap-4 sm:grid-cols-2" style={d(1)}>
                      {cf("company_name", "Company name", {}, "sm:col-span-2")}
                      {cf("first_name", "First name")}
                      {cf("last_name", "Last name")}
                    </div>

                    {/* Contact */}
                    <div className="na-up grid gap-4 sm:grid-cols-2" style={d(2)}>
                      {cf("email", "Email", { type: "email", placeholder: "name@company.com" })}
                      {cf("mobile", "Mobile", { inputMode: "tel", placeholder: "98765 43210", maxLength: 14 })}
                    </div>

                    {/* Tax */}
                    <div className="na-up grid gap-4 sm:grid-cols-2" style={d(3)}>
                      {cf("gstin", "GSTIN", { maxLength: 15, placeholder: "24ABCDE1234F1Z5" })}
                      {cf("pan", "PAN", { maxLength: 10, placeholder: "ABCDE1234F" })}
                    </div>

                    {/* Collapsibles */}
                    <div className="na-up space-y-3" style={d(4)}>
                      <Collapse title="Billing address" hint="City, state and PIN code" open={openAddr} onToggle={() => setOpenAddr((o) => !o)} filled={!!(c.city || c.state || c.pin_code)}>
                        {cf("city", "City")}
                        {cf("state", "State")}
                        {cf("pin_code", "PIN code", { maxLength: 6, inputMode: "numeric" })}
                      </Collapse>

                      <Collapse title="Bank account" hint="For payments and receipts" open={openBank} onToggle={() => setOpenBank((o) => !o)} filled={!!(c.bank_name || c.account_number)}>
                        {cf("bank_name", "Bank name", {}, "sm:col-span-2")}
                        {cf("account_number", "Account number", { inputMode: "numeric" })}
                        {cf("ifsc", "IFSC", { maxLength: 11, placeholder: "HDFC0001234" })}
                      </Collapse>
                    </div>
                  </>
                )}

                {err.form && <p className="na-up rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{err.form}</p>}

                <div className="flex flex-wrap gap-3 pt-1">
                  <Btn type="submit" className="na-btn min-w-44" disabled={busy}>
                    {busy ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="na-spin h-4 w-4 rounded-full border-2 border-white/40 border-t-white" />
                        {isContact ? "Saving…" : "Creating…"}
                      </span>
                    ) : (
                      submitLabel
                    )}
                  </Btn>
                  <Btn type="button" variant="line" onClick={onClose}>
                    Cancel
                  </Btn>
                </div>
              </div>

              {/* ---------------- Live preview ---------------- */}
              <div className="lg:sticky lg:top-0 lg:self-start">
                <p className={`mb-2 text-xs font-medium ${MUTED}`}>Live preview</p>

                {!isContact ? (
                  <div
                    key={`a-${f.type}`}
                    onMouseMove={glow}
                    className={`na-pop group relative overflow-hidden rounded-2xl border bg-gradient-to-br to-white p-5 shadow-sm ${t ? t.card : "border-dashed border-[#132622]/20 from-[#132622]/[0.03]"}`}
                  >
                    <span aria-hidden className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{ background: `radial-gradient(240px circle at var(--mx,50%) var(--my,0%), ${K.glow}, transparent 70%)` }} />

                    <div className="relative">
                      <div className="flex items-center justify-between gap-3">
                        <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold ring-1 ring-[#132622]/10">
                          <span className={`h-2 w-2 rounded-full ${t ? t.dot : "bg-[#132622]/25"}`} />
                          {t ? t.label : "No type yet"}
                        </span>
                        <span className={`text-xs font-bold ${t ? t.text : MUTED}`}>{t?.nature || ""}</span>
                      </div>

                      <p className={`mt-5 truncate font-serif text-xl font-medium ${f.name.trim() ? "" : "text-[#132622]/30"}`}>{f.name.trim() || "Account name"}</p>

                      <p className={`num mt-1 text-2xl font-semibold ${t ? t.text : "text-[#132622]/40"}`}>
                        {inr(r2(f.opening))} <span className="text-sm font-bold">{t?.nature}</span>
                      </p>
                      <p className={`text-xs ${MUTED}`}>Opening balance</p>

                      <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 border-t border-[#132622]/10 pt-4 text-xs">
                        <dt className={MUTED}>Normal side</dt>
                        <dd className="text-right font-medium">{t ? (t.nature === "Dr" ? "Debit" : "Credit") : "—"}</dd>
                        <dt className={MUTED}>Negative balance</dt>
                        <dd className="text-right font-medium">{f.neg ? "Allowed" : "Warns first"}</dd>
                      </dl>
                    </div>
                  </div>
                ) : (
                  <div key={`c-${kind}`} onMouseMove={glow} className={`na-pop group relative overflow-hidden rounded-2xl border bg-gradient-to-br to-white p-5 shadow-sm ${K.card}`}>
                    <span aria-hidden className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{ background: `radial-gradient(240px circle at var(--mx,50%) var(--my,0%), ${K.glow}, transparent 70%)` }} />

                    <div className="relative">
                      <div className="flex items-center gap-3">
                        <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl font-serif text-xl text-white shadow-sm transition-colors duration-300 ${K.avatar}`}>
                          <span key={c.display_name.trim()[0] || "?"} className="na-pop">
                            {c.display_name.trim()[0]?.toUpperCase() || <Icon n={K.icon} size={20} />}
                          </span>
                        </span>

                        <div className="min-w-0 flex-1">
                          <p className={`truncate font-serif text-lg font-medium ${c.display_name.trim() ? "" : "text-[#132622]/30"}`}>{c.display_name.trim() || `${K.label} name`}</p>
                          <p className={`truncate text-xs ${MUTED}`}>{c.company_name.trim() || "No company name"}</p>
                        </div>

                        <span className="rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-semibold ring-1 ring-[#132622]/10">{K.label}</span>
                      </div>

                      <div className="mt-4 rounded-xl bg-white/70 p-3 ring-1 ring-[#132622]/10">
                        <p className={`text-[11px] font-medium ${MUTED}`}>{K.owes}</p>
                        <p className={`num text-xl font-semibold ${K.text}`}>
                          {inr(0)} <span className="text-xs font-bold">{K.side}</span>
                        </p>
                      </div>

                      <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 border-t border-[#132622]/10 pt-4 text-xs">
                        {[
                          ["Email", c.email.trim()],
                          ["Mobile", c.mobile.trim()],
                          ["GSTIN", c.gstin],
                          ["PAN", c.pan],
                          ["City", [c.city.trim(), c.state.trim()].filter(Boolean).join(", ")],
                          ["Bank", c.bank_name.trim() ? `${c.bank_name.trim()} ${mask(c.account_number)}`.trim() : mask(c.account_number)],
                        ].map(([k, v]) => (
                          <div key={k} className="contents">
                            <dt className={MUTED}>{k}</dt>
                            <dd className={`truncate text-right font-medium ${v ? "" : "text-[#132622]/25"}`}>{v || "—"}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  </div>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}