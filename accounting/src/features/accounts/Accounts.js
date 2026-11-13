"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Btn, Field, Input, PageHeader, Side, useToast } from "@/components/ui";
import { useAsync } from "@/hooks/useAsync";
import { loadBalances } from "@/lib/balances";
import { api, send } from "@/lib/api";
import { drcr, inr } from "@/lib/format";

// --------------------------------------------------
// CONSTANTS
// --------------------------------------------------

const STANDARD = [
  ["Sales", "income"],
  ["GST Payable", "liability"],
  ["Purchases", "expense"],
  ["GST Input", "asset"],
  ["Cash", "asset"],
  ["Bank", "asset"],
];

const blank = {
  name: "",
  account_type: "asset",
  party_type: "",
  opening_balance: "",
  allow_negative: "",
  description: "",
};

const MUTED = "text-[#132622]/55";

const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const num = (n) => Number(n) || 0;

async function load() {
  // Two requests in total (accounts + all balances), whatever the number of accounts.
  const [accts, map] = await Promise.all([api("/accounts"), loadBalances().catch(() => ({}))]);

  return accts.map((a) => ({
    ...a,
    b: map[a.id] || {},
  }));
}

// --------------------------------------------------
// ACCOUNT TYPES
// --------------------------------------------------

const TYPES = [
  {
    v: "asset",
    label: "Asset",
    nature: "Dr",
    hint: "Cash, bank, stock, money customers owe you.",
    dot: "bg-emerald-500",
    avatar: "bg-emerald-600",
    bar: "bg-emerald-500",
    text: "text-emerald-700",
    chip: "bg-emerald-50 text-emerald-700",
    sel: "border-emerald-600/50 bg-emerald-50 ring-2 ring-emerald-600/20",
    card: "border-emerald-600/25 from-emerald-50",
    glow: "rgba(5,150,105,.16)",
  },
  {
    v: "liability",
    label: "Liability",
    nature: "Cr",
    hint: "Loans, money you owe vendors, taxes payable.",
    dot: "bg-amber-500",
    avatar: "bg-amber-600",
    bar: "bg-amber-500",
    text: "text-amber-700",
    chip: "bg-amber-50 text-amber-700",
    sel: "border-amber-600/50 bg-amber-50 ring-2 ring-amber-600/20",
    card: "border-amber-600/25 from-amber-50",
    glow: "rgba(217,119,6,.16)",
  },
  {
    v: "equity",
    label: "Equity",
    nature: "Cr",
    hint: "Owner's capital, drawings, retained earnings.",
    dot: "bg-violet-500",
    avatar: "bg-violet-600",
    bar: "bg-violet-500",
    text: "text-violet-700",
    chip: "bg-violet-50 text-violet-700",
    sel: "border-violet-600/50 bg-violet-50 ring-2 ring-violet-600/20",
    card: "border-violet-600/25 from-violet-50",
    glow: "rgba(124,58,237,.16)",
  },
  {
    v: "income",
    label: "Income",
    nature: "Cr",
    hint: "Sales, service fees, interest earned.",
    dot: "bg-sky-500",
    avatar: "bg-sky-600",
    bar: "bg-sky-500",
    text: "text-sky-700",
    chip: "bg-sky-50 text-sky-700",
    sel: "border-sky-600/50 bg-sky-50 ring-2 ring-sky-600/20",
    card: "border-sky-600/25 from-sky-50",
    glow: "rgba(2,132,199,.16)",
  },
  {
    v: "expense",
    label: "Expense",
    nature: "Dr",
    hint: "Rent, salaries, purchases, bank charges.",
    dot: "bg-rose-500",
    avatar: "bg-rose-600",
    bar: "bg-rose-500",
    text: "text-rose-700",
    chip: "bg-rose-50 text-rose-700",
    sel: "border-rose-600/50 bg-rose-50 ring-2 ring-rose-600/20",
    card: "border-rose-600/25 from-rose-50",
    glow: "rgba(225,29,72,.16)",
  },
];

const typeOf = (v) =>
  TYPES.find((t) => t.v === v) || TYPES[0];

const PARTY = {
  customer: {
    label: "Customer",
    chip: "bg-emerald-50 text-emerald-700",
  },
  supplier: {
    label: "Supplier",
    chip: "bg-amber-50 text-amber-700",
  },
  both: {
    label: "Customer + Supplier",
    chip: "bg-violet-50 text-violet-700",
  },
};

// --------------------------------------------------
// ICONS
// --------------------------------------------------

const ICONS = {
  book: "M4 5a2 2 0 012-2h12v16H6a2 2 0 00-2 2V5zm2 14h12M8 7h6",
  plus: "M12 5v14M5 12h14",
  search: "M21 21l-4.3-4.3M11 18a7 7 0 100-14 7 7 0 000 14z",
  x: "M6 6l12 12M18 6L6 18",
  layers: "M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5",
  down: "M17 7L7 17M7 17h8M7 17V9",
  up: "M7 17L17 7M17 7H9M17 7v8",
  bolt: "M13 2L4 14h7l-1 8 9-12h-7l1-8z",
  check: "M5 12.5l4.5 4.5L19 7.5",
  arrow: "M5 12h14m-7-7 7 7-7 7",
  wallet: "M3 6.5A2.5 2.5 0 015.5 4H20v16H5.5A2.5 2.5 0 013 17.5zM3 8h17m-4 5h.01",
  filter: "M4 5h16M7 12h10m-7 7h4",
  refresh: "M20 7v5h-5M4 17v-5h5M5.6 9a7 7 0 0112-2L20 12M4 12l2.4 5a7 7 0 0012-2",
};

const Icon = ({ n, size = 16, className = "" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d={ICONS[n]} />
  </svg>
);

// --------------------------------------------------
// ANIMATIONS
// --------------------------------------------------

const CSS = `
@keyframes ac-up {
  from { opacity:0; transform:translateY(14px) }
  to { opacity:1; transform:translateY(0) }
}

@keyframes ac-fade {
  from { opacity:0 }
  to { opacity:1 }
}

@keyframes ac-rise {
  from { opacity:0; transform:translateY(24px) scale(.97) }
  to { opacity:1; transform:none }
}

@keyframes ac-pop {
  0% { opacity:.5; transform:scale(.94) }
  60% { transform:scale(1.025) }
  100% { opacity:1; transform:scale(1) }
}

@keyframes ac-float {
  0%,100% { transform:translate(0,0) scale(1) }
  50% { transform:translate(18px,-12px) scale(1.12) }
}

@keyframes ac-shimmer {
  from { background-position:200% 0 }
  to { background-position:-200% 0 }
}

@keyframes ac-sheen {
  from { transform:translateX(-120%) }
  to { transform:translateX(220%) }
}

@keyframes ac-spin {
  to { transform:rotate(360deg) }
}

@keyframes ac-shake {
  10%,90% { transform:translateX(-1px) }
  20%,80% { transform:translateX(2px) }
  30%,50%,70% { transform:translateX(-5px) }
  40%,60% { transform:translateX(5px) }
}

@keyframes ac-draw {
  to { stroke-dashoffset:0 }
}

@keyframes ac-burst {
  0% { opacity:0; transform:scale(.5) }
  60% { opacity:1; transform:scale(1.08) }
  100% { opacity:1; transform:scale(1) }
}

.ac-up {
  animation:ac-up .5s cubic-bezier(.2,.8,.2,1) both;
}

.ac-fade { animation:ac-fade .25s ease both; }
.ac-rise { animation:ac-rise .4s cubic-bezier(.2,.8,.2,1) both; }
.ac-pop { animation:ac-pop .4s cubic-bezier(.2,.8,.2,1) both; }
.ac-float { animation:ac-float 9s ease-in-out infinite; }
.ac-spin { animation:ac-spin .7s linear infinite; }
.ac-shake { animation:ac-shake .45s ease; }
.ac-burst { animation:ac-burst .5s cubic-bezier(.2,.8,.2,1) both; }

.ac-check {
  stroke-dasharray:48;
  stroke-dashoffset:48;
  animation:ac-draw .5s .3s ease forwards;
}

.ac-skel {
  background:linear-gradient(
    100deg,
    rgba(19,38,34,.05) 30%,
    rgba(19,38,34,.11) 50%,
    rgba(19,38,34,.05) 70%
  );
  background-size:200% 100%;
  animation:ac-shimmer 1.4s linear infinite;
}

.ac-btn {
  position:relative;
  overflow:hidden;
}

.ac-btn::after {
  content:"";
  position:absolute;
  inset:0;
  width:40%;
  background:linear-gradient(
    100deg,
    transparent,
    rgba(255,255,255,.35),
    transparent
  );
  transform:translateX(-120%);
}

.ac-btn:hover::after {
  animation:ac-sheen .8s ease;
}

.ac-card {
  transition:
    transform .3s cubic-bezier(.2,.8,.2,1),
    box-shadow .3s ease,
    border-color .3s ease,
    background .3s ease;
}

.ac-card:hover {
  transform:translateY(-3px);
  box-shadow:0 14px 35px rgba(19,38,34,.07);
  border-color:rgba(31,93,70,.25);
}

.ac-row {
  transition:background .2s ease, box-shadow .2s ease;
}

.ac-row:hover {
  background:#fff;
  box-shadow:0 7px 22px rgba(19,38,34,.055);
}

@media(prefers-reduced-motion:reduce) {
  .ac-up,.ac-fade,.ac-rise,.ac-pop,.ac-float,.ac-spin,
  .ac-shake,.ac-burst,.ac-skel {
    animation:none!important;
  }

  .ac-check {
    animation:none!important;
    stroke-dashoffset:0;
  }

  .ac-btn::after { display:none; }
}
`;

const d = (i) => ({
  animationDelay: `${Math.min(i, 14) * 45}ms`,
});

const glow = (e) => {
  const r = e.currentTarget.getBoundingClientRect();

  e.currentTarget.style.setProperty(
    "--mx",
    `${e.clientX - r.left}px`
  );

  e.currentTarget.style.setProperty(
    "--my",
    `${e.clientY - r.top}px`
  );
};

// --------------------------------------------------
// ANIMATED NUMBER
// --------------------------------------------------

function Ticker({ value, money }) {
  const prev = useRef(0);
  const [n, setN] = useState(0);

  useEffect(() => {
    const from = prev.current;
    const to = Number(value) || 0;

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.(
        "(prefers-reduced-motion: reduce)"
      ).matches;

    if (reduce || from === to) {
      setN(to);
      prev.current = to;
      return;
    }

    let raf;
    const t0 = performance.now();

    const tick = (t) => {
      const p = Math.min(1, (t - t0) / 800);

      setN(
        from + (to - from) * (1 - Math.pow(1 - p, 3))
      );

      if (p < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        prev.current = to;
      }
    };

    raf = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(raf);
  }, [value]);

  return <>{money ? inr(n) : Math.round(n)}</>;
}

// --------------------------------------------------
// ANIMATED BAR
// --------------------------------------------------

function Seg({ pct, className, label }) {
  const [on, setOn] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() =>
      requestAnimationFrame(() => setOn(true))
    );

    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <span
      title={label}
      className={`h-full transition-[width] duration-[900ms] ease-[cubic-bezier(.2,.8,.2,1)] ${className}`}
      style={{
        width: on ? `${pct}%` : "0%",
      }}
    />
  );
}

// --------------------------------------------------
// SLIDING CHOICE
// --------------------------------------------------

function Choice({ options, value, onChange, label }) {
  const i = Math.max(
    0,
    options.findIndex((o) => o.v === value)
  );

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="relative grid rounded-2xl bg-[#132622]/[0.06] p-1"
      style={{
        gridTemplateColumns: `repeat(${options.length}, minmax(0,1fr))`,
      }}
    >
      <span
        aria-hidden
        className="absolute bottom-1 left-1 top-1 rounded-xl bg-white shadow-md ring-1 ring-black/5 transition-transform duration-500 ease-[cubic-bezier(.2,.9,.25,1.1)]"
        style={{
          width: `calc((100% - 0.5rem) / ${options.length})`,
          transform: `translateX(${i * 100}%)`,
        }}
      />

      {options.map((o) => (
        <button
          key={o.v}
          type="button"
          role="radio"
          aria-checked={value === o.v}
          onClick={() => onChange(o.v)}
          className={`relative z-10 rounded-xl px-2 py-2 text-[13px] font-semibold transition-colors duration-300 ${
            value === o.v
              ? "text-[#1F5D46]"
              : "text-[#132622]/55 hover:text-[#132622]"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// --------------------------------------------------
// POPUP SHELL
// --------------------------------------------------

function Shell({
  title,
  sub,
  onClose,
  busy,
  max = "max-w-3xl",
  children,
}) {
  useEffect(() => {
    const onKey = (e) =>
      e.key === "Escape" && !busy && onClose();

    const prev = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [busy, onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="ac-fade absolute inset-0 bg-[#0b1714]/55 backdrop-blur-sm"
        onClick={() => !busy && onClose()}
      />

      <div
        className={`ac-rise relative flex max-h-[92vh] w-full ${max} flex-col overflow-hidden rounded-3xl bg-[#FBFAF6] shadow-2xl ring-1 ring-black/5`}
      >
        <header className="relative shrink-0 overflow-hidden border-b border-[#132622]/10 px-6 py-5 sm:px-8">
          <span className="ac-float pointer-events-none absolute -left-10 -top-16 h-40 w-40 rounded-full bg-emerald-400/20 blur-3xl" />

          <div className="relative flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="truncate font-serif text-2xl font-medium">
                {title}
              </h2>

              {sub && (
                <p className={`mt-0.5 text-sm ${MUTED}`}>
                  {sub}
                </p>
              )}
            </div>

            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[#132622]/45 transition hover:rotate-90 hover:bg-[#132622]/[0.06] hover:text-[#132622]"
            >
              <Icon n="x" size={18} />
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6 sm:px-8">
          {children}
        </div>
      </div>
    </div>
  );
}

// --------------------------------------------------
// NEW ACCOUNT POPUP
// --------------------------------------------------

function NewAccount({ names, onClose, onCreated }) {
  const toast = useToast();

  const [f, setF] = useState(blank);
  const [err, setErr] = useState({});
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(false);
  const [done, setDone] = useState(null);

  const t = typeOf(f.account_type);

  const edit = (patch) => {
    setF((s) => ({ ...s, ...patch }));
    setErr({});
  };

  function fail(e) {
    setErr(e);
    setShake(true);
    setTimeout(() => setShake(false), 500);
  }

  async function save(ev) {
    ev.preventDefault();

    const name = f.name.trim();
    const e = {};

    if (!name) {
      e.name = "Enter an account name.";
    } else if (
      names.some(
        (n) => n.toLowerCase() === name.toLowerCase()
      )
    ) {
      e.name = "An account with this name already exists.";
    }

    if (Object.keys(e).length) return fail(e);

    setBusy(true);

    try {
      const body = {
        name,
        account_type: f.account_type,
        party_type: f.party_type || null,
        opening_balance: r2(f.opening_balance),
        description: f.description.trim() || null,
      };

      if (f.allow_negative) {
        body.allow_negative = f.allow_negative === "true";
      }

      await api("/accounts", send("POST", body));

      setDone(name);

      setTimeout(() => onCreated(name), 1200);
    } catch (er) {
      const message =
        er.message || "Unable to create account.";

      fail({ form: message });
      toast(message, true);
    }

    setBusy(false);
  }

  const dots = [
    "#10b981",
    "#f59e0b",
    "#0ea5e9",
    "#8b5cf6",
    "#f43f5e",
    "#1F5D46",
    "#B9852F",
    "#10b981",
    "#0ea5e9",
    "#f59e0b",
    "#8b5cf6",
    "#f43f5e",
  ];

  return (
    <Shell
      title="New account"
      sub="Add an account to your chart of accounts."
      onClose={onClose}
      busy={busy}
      max="max-w-5xl"
    >
      {done ? (
        <div className="relative flex flex-col items-center py-10 text-center">
          <span className="ac-burst relative flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10 ring-8 ring-emerald-500/10">
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#059669"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path
                className="ac-check"
                d="M5 12.5l4.5 4.5L19 7.5"
              />
            </svg>
          </span>

          <p className="ac-up mt-5 font-serif text-xl font-medium">
            Account created
          </p>

          <p className={`ac-up mt-1 text-sm ${MUTED}`}>
            "{done}" is ready to use in your journal entries.
          </p>
        </div>
      ) : (
        <form
          onSubmit={save}
          className={`grid gap-6 lg:grid-cols-[1.5fr_1fr] lg:gap-8 ${
            shake ? "ac-shake" : ""
          }`}
        >
          <div className="space-y-5">
            <div className="ac-up">
              <Field label="Account name">
                <Input
                  autoFocus
                  value={f.name}
                  onChange={(e) =>
                    edit({ name: e.target.value })
                  }
                  placeholder="e.g. HDFC Current Account"
                  maxLength={80}
                />
              </Field>

              {err.name && (
                <p className="ac-up mt-1.5 text-xs font-medium text-red-600">
                  {err.name}
                </p>
              )}
            </div>

            <div className="ac-up">
              <p className="mb-2 text-sm font-semibold">
                Account type
              </p>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {TYPES.map((x) => {
                  const on = f.account_type === x.v;

                  return (
                    <button
                      key={x.v}
                      type="button"
                      aria-pressed={on}
                      onClick={() =>
                        edit({ account_type: x.v })
                      }
                      className={`rounded-xl border p-3 text-left transition duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                        on
                          ? `${x.sel} -translate-y-0.5 shadow-md`
                          : "border-[#132622]/10 bg-white/70 hover:border-[#132622]/25"
                      }`}
                    >
                      <span
                        className={`block h-2.5 w-2.5 rounded-full ${x.dot}`}
                      />

                      <span className="mt-2 block text-sm font-semibold">
                        {x.label}
                      </span>

                      <span className={`text-[11px] ${MUTED}`}>
                        Normal: {x.nature}
                      </span>
                    </button>
                  );
                })}
              </div>

              <p
                key={f.account_type}
                className={`ac-up mt-2 text-xs ${MUTED}`}
              >
                {t.hint}
              </p>
            </div>

            <div className="ac-up">
              <p className="mb-2 text-sm font-semibold">
                Party type
              </p>

              <Choice
                label="Party type"
                value={f.party_type}
                onChange={(v) => edit({ party_type: v })}
                options={[
                  { v: "", label: "None" },
                  { v: "customer", label: "Customer" },
                  { v: "supplier", label: "Supplier" },
                  { v: "both", label: "Both" },
                ]}
              />

              <p className={`mt-1.5 text-xs ${MUTED}`}>
                {f.party_type
                  ? "This account will be treated as a contact."
                  : "Not a contact — a regular ledger account."}
              </p>
            </div>

            <div className="ac-up">
              <p className="mb-2 text-sm font-semibold">
                Opening balance
              </p>

              <label
                className={`flex items-center gap-2 rounded-xl px-3 py-2.5 ring-1 transition focus-within:ring-2 ${
                  t.nature === "Dr"
                    ? "bg-emerald-50/60 ring-emerald-600/30 focus-within:ring-emerald-600/60"
                    : "bg-sky-50/60 ring-sky-600/30 focus-within:ring-sky-600/60"
                }`}
              >
                <span className="text-sm text-[#132622]/40">
                  ₹
                </span>

                <input
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  placeholder="0.00"
                  aria-label="Opening balance"
                  value={f.opening_balance}
                  onChange={(e) =>
                    edit({ opening_balance: e.target.value })
                  }
                  className="w-full min-w-0 bg-transparent text-right text-base font-semibold tabular-nums outline-none placeholder:font-normal placeholder:text-[#132622]/25"
                />

                <span
                  className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold text-white ${
                    t.nature === "Dr"
                      ? "bg-emerald-600"
                      : "bg-sky-600"
                  }`}
                >
                  {t.nature}
                </span>
              </label>

              <p className={`mt-1.5 text-xs ${MUTED}`}>
                Entered on the account's normal side. Leave
                empty to start at zero.
              </p>
            </div>

            <div className="ac-up">
              <p className="mb-2 text-sm font-semibold">
                Allow negative balance
              </p>

              <Choice
                label="Allow negative balance"
                value={f.allow_negative}
                onChange={(v) =>
                  edit({ allow_negative: v })
                }
                options={[
                  { v: "", label: "Automatic" },
                  { v: "true", label: "Yes" },
                  { v: "false", label: "No" },
                ]}
              />

              <p className={`mt-1.5 text-xs ${MUTED}`}>
                {f.allow_negative === "true"
                  ? "Entries can take this account below zero."
                  : f.allow_negative === "false"
                    ? "You'll be warned before an entry takes it below zero."
                    : "We'll decide based on the account type."}
              </p>
            </div>

            <div className="ac-up">
              <Field label="Description (optional)">
                <Input
                  value={f.description}
                  onChange={(e) =>
                    edit({ description: e.target.value })
                  }
                  placeholder="What is this account used for?"
                  maxLength={160}
                />
              </Field>
            </div>

            {err.form && (
              <p className="ac-up rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                {err.form}
              </p>
            )}

            <div className="flex flex-wrap gap-3 pt-1">
              <Btn
                type="submit"
                className="ac-btn min-w-44"
                disabled={busy}
              >
                {busy ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="ac-spin h-4 w-4 rounded-full border-2 border-white/40 border-t-white" />
                    Creating...
                  </span>
                ) : (
                  "Create account"
                )}
              </Btn>

              <Btn
                type="button"
                variant="line"
                onClick={onClose}
              >
                Cancel
              </Btn>
            </div>
          </div>

          {/* LIVE PREVIEW */}

          <div className="lg:sticky lg:top-0 lg:self-start">
            <p className={`mb-2 text-xs font-medium ${MUTED}`}>
              Live preview
            </p>

            <div
              key={f.account_type}
              onMouseMove={glow}
              className={`group relative overflow-hidden rounded-2xl border bg-gradient-to-br to-white p-5 shadow-sm ${t.card}`}
            >
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                style={{
                  background: `radial-gradient(240px circle at var(--mx,50%) var(--my,0%), ${t.glow}, transparent 70%)`,
                }}
              />

              <div className="relative">
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold ring-1 ring-[#132622]/10">
                    <span className={`h-2 w-2 rounded-full ${t.dot}`} />
                    {t.label}
                  </span>

                  {f.party_type && (
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${PARTY[f.party_type].chip}`}
                    >
                      {PARTY[f.party_type].label}
                    </span>
                  )}
                </div>

                <p className="mt-5 truncate font-serif text-xl font-medium">
                  {f.name.trim() || "Account name"}
                </p>

                <p className={`num mt-1 text-2xl font-semibold ${t.text}`}>
                  {inr(r2(f.opening_balance))}
                  <span className="text-sm font-bold">
                    {" "}{t.nature}
                  </span>
                </p>

                <p className={`text-xs ${MUTED}`}>
                  Opening balance
                </p>

                <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 border-t border-[#132622]/10 pt-4 text-xs">
                  <dt className={MUTED}>Normal side</dt>
                  <dd className="text-right font-medium">
                    {t.nature === "Dr" ? "Debit" : "Credit"}
                  </dd>

                  <dt className={MUTED}>Negative balance</dt>
                  <dd className="text-right font-medium">
                    {f.allow_negative === "true"
                      ? "Allowed"
                      : f.allow_negative === "false"
                        ? "Warns first"
                        : "Automatic"}
                  </dd>

                  <dt className={MUTED}>Description</dt>
                  <dd className="truncate text-right font-medium">
                    {f.description.trim() || "—"}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </form>
      )}
    </Shell>
  );
}

// --------------------------------------------------
// ACCOUNT DETAILS POPUP
// --------------------------------------------------

// --------------------------------------------------
// EDIT ACCOUNT
// --------------------------------------------------

const SYSTEM_NAMES = ["Cash", "Sales", "Purchases", "GST Payable", "GST Input"];

function EditAccount({ a, names, onClose, onSaved }) {
  const toast = useToast();
  const locked = SYSTEM_NAMES.includes(a.name) || !!a.party_type;
  const [f, setF] = useState({
    name: a.name || "",
    account_type: a.account_type,
    opening_balance: String(a.opening_balance ?? 0),
    description: a.description || "",
    allow_negative: !!a.allow_negative,
  });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(false);
  const [done, setDone] = useState(null);

  const set = (patch) => { setF((s) => ({ ...s, ...patch })); setErr(""); };
  const fail = (m) => { setErr(m); setShake(true); setTimeout(() => setShake(false), 500); };

  const from = typeOf(a.account_type), to = typeOf(f.account_type);
  const typeChanged = f.account_type !== a.account_type;
  const hasActivity = Number(a.b?.total_debit || 0) !== 0 || Number(a.b?.total_credit || 0) !== 0 || Number(a.opening_balance || 0) !== 0;
  const shownName = f.name.trim() || a.name;

  async function save(ev) {
    ev.preventDefault();
    const name = f.name.trim();
    if (!name) return fail("Enter an account name.");
    if (name.toLowerCase() !== (a.name || "").toLowerCase() && names.some((n) => n.toLowerCase() === name.toLowerCase())) return fail("An account with this name already exists.");
    if (typeChanged && hasActivity && !confirm(`Change "${a.name}" from ${from.label} to ${to.label}?\n\nIts entries stay exactly as they are. Only how the balance is read changes (${from.nature} side becomes ${to.nature} side).`)) return;

    setBusy(true);
    try {
      const body = { opening_balance: r2(f.opening_balance), description: f.description.trim() || null, allow_negative: f.allow_negative };
      if (!locked) { body.name = name; body.account_type = f.account_type; }
      await api(`/accounts/${a.id}`, send("PUT", body));
      setDone(name);
      setTimeout(onSaved, 1100);
    } catch (er) {
      const m = er.message || "Couldn't save the changes.";
      fail(m);
      toast(m, true);
      setBusy(false);
    }
  }

  return (
    <Shell title="Edit account" sub={`${a.name} · Account #${a.id}`} onClose={onClose} busy={busy || !!done} max="max-w-2xl">
      {done ? (
        <div className="flex flex-col items-center py-12 text-center">
          <span className="ac-burst flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10 ring-8 ring-emerald-500/10">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path className="ac-check" d="M5 12.5l4.5 4.5L19 7.5" /></svg>
          </span>
          <p className="ac-up mt-5 font-serif text-xl font-medium">Account updated</p>
          <p className={`ac-up mt-1 text-sm ${MUTED}`} style={d(1)}>"{done}" has been saved{typeChanged ? ` as ${to.label}` : ""}.</p>
        </div>
      ) : (
        <form onSubmit={save} className={`grid gap-5 ${shake ? "ac-shake" : ""}`}>
          {/* Live preview */}
          <div className={`ac-up relative overflow-hidden rounded-2xl border bg-gradient-to-br to-white p-4 transition-colors duration-500 ${to.card}`}>
            <span aria-hidden className="ac-float pointer-events-none absolute -right-10 -top-14 h-36 w-36 rounded-full blur-3xl transition-colors duration-700" style={{ background: to.glow }} />
            <div className="relative flex items-center gap-4">
              <span key={to.v} className={`ac-pop flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl font-serif text-2xl text-white shadow-md transition-colors duration-500 ${to.avatar}`}>
                {shownName?.[0]?.toUpperCase() || "?"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-serif text-xl font-medium transition-all">{shownName}</p>
                <p className={`truncate text-sm ${MUTED}`}>{f.description.trim() || "No description"}</p>
              </div>
              <span key={`chip-${to.v}`} className={`ac-pop rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors duration-500 ${to.chip}`}>{to.label} · {to.nature}</span>
            </div>
          </div>

          {locked && (
            <p className="ac-up rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800" style={d(1)}>
              {a.party_type
                ? "This is a customer or vendor account. Rename it from the Customers and vendors page. Its type can't be changed."
                : `"${a.name}" is a system account used by the sales and purchase forms, so its name and type are fixed.`}
            </p>
          )}

          <div className="ac-up" style={d(2)}>
            <Field label="Account name">
              <Input autoFocus={!locked} disabled={locked} required maxLength={80} value={f.name} onChange={(e) => set({ name: e.target.value })} />
            </Field>
          </div>

          {/* Type */}
          <div className="ac-up" style={d(3)}>
            <span className="text-sm font-medium">Account type</span>
            <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
              {TYPES.map((x, i) => {
                const on = f.account_type === x.v;
                return (
                  <button key={x.v} type="button" disabled={locked} onClick={() => set({ account_type: x.v })} aria-pressed={on} style={d(i + 4)}
                    className={`ac-up group relative rounded-xl border p-3 text-left transition-all duration-300 enabled:hover:-translate-y-0.5 enabled:hover:shadow-md enabled:active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-60 ${on ? x.sel : "border-[#132622]/10 bg-white enabled:hover:border-[#1F5D46]/40"}`}>
                    <span className="flex items-center justify-between gap-2 font-semibold">
                      <span className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full transition-transform duration-300 ${x.dot} ${on ? "scale-125" : "scale-90 opacity-60"}`} />
                        {x.label}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className={`rounded-md px-1.5 py-0.5 text-[10px] ${x.chip}`}>{x.nature}</span>
                        {on && (
                          <svg key="tick" className="ac-pop" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" fill="rgba(5,150,105,.12)" /><path d="M8 12.5l3 3 5-6" /></svg>
                        )}
                      </span>
                    </span>
                    <span className={`mt-0.5 block text-xs ${MUTED}`}>{x.hint}</span>
                  </button>
                );
              })}
            </div>

            {/* Smoothly opens when the type is changed */}
            <div className={`grid transition-[grid-template-rows,opacity] duration-500 ease-out ${typeChanged ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
              <div className="overflow-hidden">
                <p className="mt-2 flex items-start gap-2 rounded-xl bg-sky-50 px-4 py-3 text-sm text-sky-900">
                  <span aria-hidden className="mt-0.5 inline-block h-2 w-2 shrink-0 animate-pulse rounded-full bg-sky-500" />
                  <span><b>{from.label} ({from.nature}) → {to.label} ({to.nature}).</b> {hasActivity ? "Existing entries are not changed, but the balance will be read from the other side, and reports will move this account to its new group." : "This account has no entries yet, so nothing else is affected."}</span>
                </p>
              </div>
            </div>
          </div>

          <div className="ac-up grid gap-4 sm:grid-cols-2" style={d(9)}>
            <Field label={`Opening balance (${to.nature} side)`}>
              <Input type="number" step="0.01" value={f.opening_balance} onChange={(e) => set({ opening_balance: e.target.value })} />
            </Field>
            <Field label="Description">
              <Input value={f.description} maxLength={120} onChange={(e) => set({ description: e.target.value })} placeholder="Optional" />
            </Field>
          </div>

          <button type="button" role="switch" aria-checked={f.allow_negative} onClick={() => set({ allow_negative: !f.allow_negative })} style={d(10)}
            className="ac-up flex items-center gap-3 rounded-xl text-left text-sm text-[#132622]/80 transition hover:text-[#132622]">
            <span className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-300 ${f.allow_negative ? "bg-[#1F5D46]" : "bg-[#132622]/20"}`}>
              <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-300 ease-[cubic-bezier(.2,.9,.25,1.2)] ${f.allow_negative ? "translate-x-5" : ""}`} />
            </span>
            Allow the balance to go below zero
          </button>

          {err && <p key={err} role="alert" className="ac-up rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">{err}</p>}

          <div className="ac-up flex flex-wrap gap-3 pt-1" style={d(11)}>
            <Btn type="submit" className="ac-btn min-w-40" disabled={busy}>
              {busy ? <span className="inline-flex items-center gap-2"><span className="ac-spin h-4 w-4 rounded-full border-2 border-white/40 border-t-white" />Saving…</span> : "Save changes"}
            </Btn>
            <Btn type="button" variant="line" onClick={onClose} disabled={busy}>Cancel</Btn>
          </div>
        </form>
      )}
    </Shell>
  );
}

function Details({ a, onClose, onEdit }) {
  const t = typeOf(a.account_type);
  const bal = drcr(a.account_type, a.b.balance);

  const tiles = [
    ["Account ID", `#${a.id}`],
    ["Type", t.label],
    [
      "Party",
      a.party_type
        ? PARTY[a.party_type]?.label || a.party_type
        : "None",
    ],
    ["Opening balance", inr(a.opening_balance)],
    ["Total debit", inr(a.b.total_debit)],
    ["Total credit", inr(a.b.total_credit)],
  ];

  return (
    <Shell
      title={a.name}
      sub="Account details"
      onClose={onClose}
      max="max-w-2xl"
    >
      <div className="ac-up flex items-center gap-4">
        <span
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl font-serif text-2xl text-white shadow-md ${t.avatar}`}
        >
          {a.name?.[0]?.toUpperCase() || "?"}
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate font-serif text-xl font-medium">
            {a.name}
          </p>

          <p className={`truncate text-sm ${MUTED}`}>
            {a.description || "No description"}
          </p>
        </div>

        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${t.chip}`}>
          {t.label}
        </span>
      </div>

      <div
        onMouseMove={glow}
        className={`group relative mt-5 overflow-hidden rounded-2xl border bg-gradient-to-br to-white p-5 ${t.card}`}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background: `radial-gradient(260px circle at var(--mx,50%) var(--my,0%), ${t.glow}, transparent 70%)`,
          }}
        />

        <div className="relative">
          <p className={`text-xs font-medium ${MUTED}`}>
            Current balance
          </p>

          <p className={`num mt-1 text-3xl font-semibold ${t.text}`}>
            <b>{bal.text}</b>
            <Side side={bal.side} />
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {tiles.map(([k, v], i) => (
          <div
            key={k}
            className="ac-card rounded-xl border border-[#132622]/10 bg-[#132622]/[0.025] p-3"
          >
            <p className={`text-xs ${MUTED}`}>{k}</p>
            <p className="num mt-1 break-all font-medium">{v}</p>
          </div>
        ))}
      </div>

      <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-[#132622]/10 pt-5">
        <Link
          href={`/ledger?account=${a.id}`}
          className="group inline-flex items-center gap-2 font-medium text-[#1F5D46] underline decoration-[#B9852F] underline-offset-4"
        >
          Open full ledger
          <span className="transition-transform duration-300 group-hover:translate-x-1">
            →
          </span>
        </Link>

        <div className="flex gap-3">
          {onEdit && <Btn variant="line" onClick={() => onEdit(a)}>Edit account</Btn>}
          <Btn onClick={onClose}>Close</Btn>
        </div>
      </div>
    </Shell>
  );
}

// --------------------------------------------------
// STAT CARD
// --------------------------------------------------

function Stat({ icon, label, i, children, sub, accent }) {
  return (
    <div
      className="ac-card ac-up group relative overflow-hidden rounded-2xl border border-[#132622]/10 bg-white p-5 shadow-sm"
      style={d(i)}
    >
      <span
        className={`pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full blur-3xl transition-transform duration-500 group-hover:scale-150 ${accent || "bg-emerald-100"}`}
      />

      <div className="relative">
        <div className="flex items-center justify-between gap-3">
          <p className={`text-sm font-medium ${MUTED}`}>
            {label}
          </p>

          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1F5D46]/[0.08] text-[#1F5D46] transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110">
            <Icon n={icon} size={19} />
          </span>
        </div>

        <div className="num mt-4 truncate text-2xl font-bold tracking-tight text-[#132622] sm:text-3xl">
          {children}
        </div>

        {sub && (
          <p className={`mt-1 text-xs ${MUTED}`}>
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}

// --------------------------------------------------
// MAIN ACCOUNTS PAGE
// --------------------------------------------------

export default function Accounts() {
  const toast = useToast();

  const {
    data,
    error,
    loading,
    reload,
  } = useAsync(load);

  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(null);
  const [editing, setEditing] = useState(null);
  const [stdBusy, setStdBusy] = useState(false);

  // ----------------------------------------------
  // STANDARD ACCOUNTS
  // ----------------------------------------------

  async function standard() {
    setStdBusy(true);

    try {
      const have = (
        await api("/accounts")
      ).map((a) => a.name.toLowerCase());

      let n = 0;

      for (const [name, account_type] of STANDARD) {
        if (!have.includes(name.toLowerCase())) {
          await api(
            "/accounts",
            send("POST", {
              name,
              account_type,
              opening_balance: 0,
            })
          );

          n++;
        }
      }

      toast(
        n
          ? `${n} standard account${n > 1 ? "s" : ""} created.`
          : "Standard accounts already exist."
      );

      reload();
    } catch (er) {
      toast(er.message, true);
    }

    setStdBusy(false);
  }

  // ----------------------------------------------
  // DATA
  // ----------------------------------------------

  const all = Array.isArray(data) ? data : [];

  const needle = q.trim().toLowerCase();

  const rows = all.filter((a) => {
    const matchesName =
      (a.name || "").toLowerCase().includes(needle);

    const matchesType =
      !type || a.account_type === type;

    return matchesName && matchesType;
  });

  const counts = Object.fromEntries(
    TYPES.map((t) => [
      t.v,
      all.filter((a) => a.account_type === t.v).length,
    ])
  );

  const totalDebit = all.reduce(
    (s, a) => s + num(a.b?.total_debit),
    0
  );

  const totalCredit = all.reduce(
    (s, a) => s + num(a.b?.total_credit),
    0
  );

  const activeTypes = TYPES.filter(
    (t) => counts[t.v] > 0
  ).length;

  // ----------------------------------------------
  // FILTERS
  // ----------------------------------------------

  const filters = [
    { v: "", label: "All accounts", count: all.length },
    ...TYPES.map((t) => ({
      v: t.v,
      label: t.label,
      count: counts[t.v],
      dot: t.dot,
    })),
  ];

  // ----------------------------------------------
  // UI
  // ----------------------------------------------

  return (
    <>
      <style>{CSS}</style>

      <div className="space-y-6 pb-10">

        {/* ======================================
            HEADER
        ====================================== */}

        <PageHeader eyebrow="Books" title="Accounts">
          <div className="flex flex-wrap gap-2">
            <Btn
              variant="line"
              onClick={standard}
              disabled={stdBusy}
            >
              <span className="inline-flex items-center gap-2">
                {stdBusy ? (
                  <span className="ac-spin h-4 w-4 rounded-full border-2 border-[#132622]/20 border-t-[#1F5D46]" />
                ) : (
                  <Icon n="bolt" size={15} />
                )}

                {stdBusy
                  ? "Creating..."
                  : "Standard accounts"}
              </span>
            </Btn>

            <Btn
              className="ac-btn"
              onClick={() => setOpen(true)}
            >
              <span className="inline-flex items-center gap-2">
                <Icon n="plus" size={16} />
                New account
              </span>
            </Btn>
          </div>
        </PageHeader>

        {/* ======================================
            ERROR
        ====================================== */}

        {error && (
          <div className="ac-up rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-600">
            {String(error)}
          </div>
        )}

        {/* ======================================
            OVERVIEW
        ====================================== */}

        {!loading && !error && all.length > 0 && (
          <section className="space-y-4">

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">

              <Stat
                i={0}
                icon="layers"
                label="Total accounts"
                sub={`${activeTypes} account categories in use`}
                accent="bg-emerald-100"
              >
                <Ticker value={all.length} />
              </Stat>

              <Stat
                i={1}
                icon="down"
                label="Total debit"
                sub="Across all accounts"
                accent="bg-sky-100"
              >
                <Ticker value={totalDebit} money />
              </Stat>

              <Stat
                i={2}
                icon="up"
                label="Total credit"
                sub="Across all accounts"
                accent="bg-violet-100"
              >
                <Ticker value={totalCredit} money />
              </Stat>

            </div>

            {/* DISTRIBUTION */}

            <div
              className="ac-up rounded-2xl border border-[#132622]/10 bg-white p-5 shadow-sm"
              style={d(3)}
            >
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-[#132622]">
                    Account distribution
                  </h3>

                  <p className={`mt-0.5 text-xs ${MUTED}`}>
                    Breakdown of your chart of accounts
                  </p>
                </div>

                <span className="rounded-lg bg-[#1F5D46]/[0.07] px-3 py-1.5 text-xs font-semibold text-[#1F5D46]">
                  {all.length} total
                </span>
              </div>

              <div className="flex h-3 overflow-hidden rounded-full bg-[#132622]/[0.06]">
                {TYPES.filter((t) => counts[t.v]).map((t) => (
                  <Seg
                    key={t.v}
                    pct={(counts[t.v] / all.length) * 100}
                    className={t.bar}
                    label={`${t.label}: ${counts[t.v]}`}
                  />
                ))}
              </div>

              <div className="mt-4 flex flex-wrap gap-x-6 gap-y-3">
                {TYPES.map((t) => (
                  <div
                    key={t.v}
                    className={`flex items-center gap-2 text-xs ${
                      counts[t.v] ? "" : "opacity-40"
                    }`}
                  >
                    <span className={`h-2.5 w-2.5 rounded-full ${t.dot}`} />

                    <span className="text-[#132622]/65">
                      {t.label}
                    </span>

                    <b className="font-semibold text-[#132622]">
                      {counts[t.v]}
                    </b>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ======================================
            TOOLBAR
        ====================================== */}

        <section
          className="ac-up rounded-2xl border border-[#132622]/10 bg-white p-4 shadow-sm"
          style={d(4)}
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

            {/* SEARCH */}

            <label className="group flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-[#132622]/10 bg-[#FBFAF6] px-4 py-3 transition focus-within:border-[#1F5D46]/40 focus-within:bg-white focus-within:ring-2 focus-within:ring-[#1F5D46]/10 lg:max-w-md">
              <Icon
                n="search"
                size={18}
                className="shrink-0 text-[#132622]/40 transition-colors group-focus-within:text-[#1F5D46]"
              />

              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search accounts..."
                aria-label="Search accounts"
                className="w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-[#132622]/35"
              />

              {q && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setQ("")}
                  className="rounded-md p-1 text-[#132622]/40 hover:bg-[#132622]/[0.06]"
                >
                  <Icon n="x" size={15} />
                </button>
              )}
            </label>

            {/* FILTER LABEL */}

            <div className="flex items-center gap-2">
              <Icon
                n="filter"
                size={16}
                className="text-[#132622]/45"
              />

              <span className="text-xs font-semibold uppercase tracking-wider text-[#132622]/45">
                Filter by
              </span>
            </div>
          </div>

          {/* FILTER CHIPS */}

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {filters.map((t) => {
              const active = type === t.v;

              return (
                <button
                  key={t.v || "all"}
                  type="button"
                  onClick={() => setType(t.v)}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition duration-200 hover:-translate-y-0.5 ${
                    active
                      ? "border-[#1F5D46] bg-[#1F5D46] text-white shadow-md shadow-[#1F5D46]/15"
                      : "border-[#132622]/10 bg-white text-[#132622]/65 hover:border-[#1F5D46]/30 hover:bg-[#1F5D46]/[0.04] hover:text-[#1F5D46]"
                  }`}
                >
                  {t.dot && (
                    <span
                      className={`h-2 w-2 rounded-full ${
                        active ? "bg-white" : t.dot
                      }`}
                    />
                  )}

                  {t.label}

                  <span
                    className={`rounded-md px-1.5 py-0.5 text-[10px] ${
                      active
                        ? "bg-white/15 text-white"
                        : "bg-[#132622]/[0.05] text-[#132622]/55"
                    }`}
                  >
                    {t.count}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* ======================================
            ACCOUNT TABLE
        ====================================== */}

        <section className="ac-up" style={d(5)}>

          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-[#132622]">
                Account list
              </h2>

              <p className={`mt-0.5 text-xs ${MUTED}`}>
                View and manage all your ledger accounts
              </p>
            </div>

            {!loading && (
              <span className="rounded-lg bg-[#1F5D46]/[0.07] px-3 py-1.5 text-xs font-semibold text-[#1F5D46]">
                Showing {rows.length} of {all.length}
              </span>
            )}
          </div>

          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="ac-skel h-[75px] rounded-2xl"
                  style={d(i)}
                />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-600">
              {String(error)}
            </div>
          ) : rows.length ? (
            <div className="overflow-hidden rounded-2xl border border-[#132622]/10 bg-white shadow-sm">

              {/* TABLE HEADER */}

              <div className="hidden grid-cols-[minmax(0,1.5fr)_minmax(100px,.8fr)_repeat(4,minmax(100px,1fr))_90px] items-center gap-4 border-b border-[#132622]/10 bg-[#F7F8F5] px-5 py-4 text-[10px] font-bold uppercase tracking-wider text-[#132622]/45 xl:grid">
                <span>Account</span>
                <span>Category</span>
                <span className="text-right">Opening</span>
                <span className="text-right">Debit</span>
                <span className="text-right">Credit</span>
                <span className="text-right">Balance</span>
                <span className="text-right">Action</span>
              </div>

              {/* TABLE ROWS */}

              <div className="divide-y divide-[#132622]/[0.07]">
                {rows.map((a, i) => {
                  const t = typeOf(a.account_type);
                  const bal = drcr(a.account_type, a.b.balance);

                  return (
                    <div
                      key={a.id}
                      onClick={() => setView(a)}
                      title="View account details"
                      style={d(i)}
                      className="ac-row ac-up group relative cursor-pointer px-4 py-4 sm:px-5"
                    >
                      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 xl:grid-cols-[minmax(0,1.5fr)_minmax(100px,.8fr)_repeat(4,minmax(100px,1fr))_90px] xl:gap-4">

                        {/* ACCOUNT NAME */}

                        <div className="flex min-w-0 items-center gap-3">
                          <span
                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-base font-bold text-white shadow-sm transition duration-300 group-hover:-rotate-3 group-hover:scale-105 ${t.avatar}`}
                          >
                            {a.name?.[0]?.toUpperCase() || "?"}
                          </span>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-[#132622] transition-colors group-hover:text-[#1F5D46]">
                              {a.name}
                            </p>

                            <p className={`mt-0.5 truncate text-xs ${MUTED}`}>
                              Account #{a.id}
                              {a.description
                                ? ` · ${a.description}`
                                : ""}
                            </p>

                            <div className="mt-1.5 flex flex-wrap gap-1.5 xl:hidden">
                              <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${t.chip}`}>
                                {t.label}
                              </span>

                              {a.party_type && (
                                <span
                                  className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                                    PARTY[a.party_type]?.chip ||
                                    "bg-[#132622]/[0.06]"
                                  }`}
                                >
                                  {PARTY[a.party_type]?.label ||
                                    a.party_type}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* CATEGORY */}

                        <div className="hidden xl:block">
                          <div className="flex flex-wrap gap-1.5">
                            <span className={`rounded-lg px-2.5 py-1 text-[10px] font-semibold ${t.chip}`}>
                              {t.label}
                            </span>

                            {a.party_type && (
                              <span
                                className={`rounded-lg px-2 py-1 text-[10px] font-semibold ${
                                  PARTY[a.party_type]?.chip ||
                                  "bg-[#132622]/[0.06]"
                                }`}
                              >
                                {PARTY[a.party_type]?.label ||
                                  a.party_type}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* MOBILE BALANCE */}

                        <div className="text-right xl:hidden">
                          <p className={`num text-sm font-bold ${t.text}`}>
                            {bal.text}
                          </p>

                          <p className={`mt-0.5 text-[10px] ${MUTED}`}>
                            {bal.side}
                          </p>
                        </div>

                        {/* DESKTOP OPENING */}

                        <p className="num hidden text-right text-sm font-medium text-[#132622]/75 xl:block">
                          {inr(a.opening_balance)}
                        </p>

                        {/* DESKTOP DEBIT */}

                        <p className="num hidden text-right text-sm text-[#132622]/75 xl:block">
                          {inr(a.b.total_debit)}
                        </p>

                        {/* DESKTOP CREDIT */}

                        <p className="num hidden text-right text-sm text-[#132622]/75 xl:block">
                          {inr(a.b.total_credit)}
                        </p>

                        {/* DESKTOP BALANCE */}

                        <div className="hidden text-right xl:block">
                          <p className={`num text-sm font-bold ${t.text}`}>
                            {bal.text}
                          </p>

                          <p className="mt-0.5 text-[10px] text-[#132622]/40">
                            {bal.side}
                          </p>
                        </div>

                        {/* ACTION */}

                        <div
                          className="hidden justify-end xl:flex"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Link
                            href={`/ledger?account=${a.id}`}
                            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-[#1F5D46] transition hover:bg-[#1F5D46]/[0.07]"
                          >
                            Ledger
                            <Icon n="arrow" size={13} />
                          </Link>
                        </div>
                      </div>

                      {/* MOBILE DETAILS */}

                      <div className="mt-3 grid grid-cols-3 gap-2 border-t border-[#132622]/[0.06] pt-3 xl:hidden">
                        <div>
                          <p className={`text-[10px] ${MUTED}`}>
                            Opening
                          </p>

                          <p className="num mt-0.5 text-xs font-medium">
                            {inr(a.opening_balance)}
                          </p>
                        </div>

                        <div>
                          <p className={`text-[10px] ${MUTED}`}>
                            Debit
                          </p>

                          <p className="num mt-0.5 text-xs font-medium">
                            {inr(a.b.total_debit)}
                          </p>
                        </div>

                        <div>
                          <p className={`text-[10px] ${MUTED}`}>
                            Credit
                          </p>

                          <p className="num mt-0.5 text-xs font-medium">
                            {inr(a.b.total_credit)}
                          </p>
                        </div>
                      </div>

                      <span className="pointer-events-none absolute bottom-0 left-0 h-[2px] w-0 bg-[#1F5D46] transition-all duration-300 group-hover:w-full" />
                    </div>
                  );
                })}
              </div>

              {/* TABLE FOOTER */}

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#132622]/10 bg-[#F7F8F5] px-5 py-3">
                <p className={`text-xs ${MUTED}`}>
                  {rows.length} account{rows.length !== 1 ? "s" : ""}
                </p>

                <button
                  onClick={reload}
                  className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold text-[#1F5D46] transition hover:bg-[#1F5D46]/[0.07]"
                >
                  <Icon n="refresh" size={14} />
                  Refresh
                </button>
              </div>
            </div>
          ) : (
            /* EMPTY STATE */

            <div className="ac-up flex flex-col items-center rounded-3xl border border-dashed border-[#132622]/20 bg-white px-6 py-14 text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#1F5D46]/10 text-[#1F5D46] ring-8 ring-[#1F5D46]/5">
                <Icon
                  n={needle || type ? "search" : "book"}
                  size={28}
                />
              </span>

              <h3 className="mt-5 font-serif text-xl font-medium text-[#132622]">
                {needle || type
                  ? "No matching accounts"
                  : "No accounts yet"}
              </h3>

              <p className={`mt-1 max-w-xs text-sm ${MUTED}`}>
                {needle || type
                  ? "Try a different search or clear your filters."
                  : "Create your standard accounts or add your own accounts to get started."}
              </p>

              <div className="mt-5 flex flex-wrap justify-center gap-3">
                {needle || type ? (
                  <Btn
                    variant="line"
                    onClick={() => {
                      setQ("");
                      setType("");
                    }}
                  >
                    Clear filters
                  </Btn>
                ) : (
                  <>
                    <Btn
                      className="ac-btn"
                      onClick={standard}
                      disabled={stdBusy}
                    >
                      Create standard accounts
                    </Btn>

                    <Btn
                      variant="line"
                      onClick={() => setOpen(true)}
                    >
                      New account
                    </Btn>
                  </>
                )}
              </div>
            </div>
          )}
        </section>

        {/* ======================================
            MODALS
        ====================================== */}

        {view && (
          <Details
            key={view.id}
            a={view}
            onClose={() => setView(null)}
            onEdit={(acc) => { setView(null); setEditing(acc); }}
          />
        )}

        {editing && (
          <EditAccount
            key={editing.id}
            a={editing}
            names={all.map((x) => x.name)}
            onClose={() => setEditing(null)}
            onSaved={() => { setEditing(null); reload(); }}
          />
        )}

        {open && (
          <NewAccount
            names={all.map((a) => a.name)}
            onClose={() => setOpen(false)}
            onCreated={() => {
              setOpen(false);
              reload();
            }}
          />
        )}
      </div>
    </>
  );
}