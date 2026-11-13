"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Btn, PageHeader, useToast } from "@/components/ui";
import { api } from "@/lib/api";
import { inr } from "@/lib/format";

// Save as: src/app/(app)/trial-balance/page.js
// Backend: GET /trial-balance, GET /trial-balance/unbalanced-entries

// --------------------------------------------------
// CONSTANTS
// --------------------------------------------------

const MUTED = "text-[#132622]/55";
const num = (n) => Number(n) || 0;
const sumOf = (rows, k) => rows.reduce((s, r) => s + num(r[k]), 0);

const TYPES = [
  { v: "asset", label: "Assets", dot: "bg-emerald-500", avatar: "bg-emerald-600", chip: "bg-emerald-50 text-emerald-700", bar: "bg-emerald-500" },
  { v: "liability", label: "Liabilities", dot: "bg-amber-500", avatar: "bg-amber-600", chip: "bg-amber-50 text-amber-700", bar: "bg-amber-500" },
  { v: "equity", label: "Equity", dot: "bg-violet-500", avatar: "bg-violet-600", chip: "bg-violet-50 text-violet-700", bar: "bg-violet-500" },
  { v: "income", label: "Income", dot: "bg-sky-500", avatar: "bg-sky-600", chip: "bg-sky-50 text-sky-700", bar: "bg-sky-500" },
  { v: "expense", label: "Expenses", dot: "bg-rose-500", avatar: "bg-rose-600", chip: "bg-rose-50 text-rose-700", bar: "bg-rose-500" },
];
const typeOf = (v) => TYPES.find((t) => t.v === v) || TYPES[0];

const COLS_SIMPLE = [["closing_debit", "Debit"], ["closing_credit", "Credit"]];
const COLS_FULL = [
  ["opening_debit", "Opening Dr"], ["opening_credit", "Opening Cr"],
  ["period_debit", "Period Dr"], ["period_credit", "Period Cr"],
  ["closing_debit", "Closing Dr"], ["closing_credit", "Closing Cr"],
];

const ymd = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function makePresets() {
  const n = new Date(), y = n.getFullYear(), m = n.getMonth();
  const fy = m >= 3 ? y : y - 1;          // Indian financial year: 1 Apr - 31 Mar
  const q = Math.floor(m / 3) * 3;
  return [
    { k: "all", label: "All time", from: "", to: "" },
    { k: "today", label: "As on today", from: "", to: ymd(n) },
    { k: "month", label: "This month", from: ymd(new Date(y, m, 1)), to: ymd(new Date(y, m + 1, 0)) },
    { k: "quarter", label: "This quarter", from: ymd(new Date(y, q, 1)), to: ymd(new Date(y, q + 3, 0)) },
    { k: "fy", label: "This FY", from: ymd(new Date(fy, 3, 1)), to: ymd(new Date(fy + 1, 2, 31)) },
    { k: "lfy", label: "Last FY", from: ymd(new Date(fy - 1, 3, 1)), to: ymd(new Date(fy, 2, 31)) },
  ];
}

// --------------------------------------------------
// ICONS
// --------------------------------------------------

const ICONS = {
  scale: "M12 3v18M7 21h10M5 7h14M5 7l-3 7a3 3 0 006 0L5 7zm14 0l-3 7a3 3 0 006 0l-3-7z",
  search: "M21 21l-4.3-4.3M11 18a7 7 0 100-14 7 7 0 000 14z",
  x: "M6 6l12 12M18 6L6 18",
  layers: "M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5",
  down: "M17 7L7 17M7 17h8M7 17V9",
  up: "M7 17L17 7M17 7H9M17 7v8",
  check: "M5 12.5l4.5 4.5L19 7.5",
  alert: "M12 9v4m0 4h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z",
  arrow: "M5 12h14m-7-7 7 7-7 7",
  refresh: "M20 7v5h-5M4 17v-5h5M5.6 9a7 7 0 0112-2L20 12M4 12l2.4 5a7 7 0 0012-2",
  download: "M12 4v12m0 0l-4-4m4 4l4-4M4 20h16",
  print: "M7 9V3h10v6M7 17H5a2 2 0 01-2-2v-4a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2h-2M7 14h10v7H7z",
  chev: "M9 6l6 6-6 6",
};

const Icon = ({ n, size = 16, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d={ICONS[n]} />
  </svg>
);

// --------------------------------------------------
// ANIMATIONS
// --------------------------------------------------

const CSS = `
@keyframes ac-up { from { opacity:0; transform:translateY(14px) } to { opacity:1; transform:translateY(0) } }
@keyframes ac-fade { from { opacity:0 } to { opacity:1 } }
@keyframes ac-rise { from { opacity:0; transform:translateY(24px) scale(.97) } to { opacity:1; transform:none } }
@keyframes ac-float { 0%,100% { transform:translate(0,0) scale(1) } 50% { transform:translate(18px,-12px) scale(1.12) } }
@keyframes ac-shimmer { from { background-position:200% 0 } to { background-position:-200% 0 } }
@keyframes ac-spin { to { transform:rotate(360deg) } }
@keyframes ac-burst { 0% { opacity:0; transform:scale(.5) } 60% { opacity:1; transform:scale(1.08) } 100% { opacity:1; transform:scale(1) } }
.ac-up { animation:ac-up .5s cubic-bezier(.2,.8,.2,1) both; }
.ac-fade { animation:ac-fade .25s ease both; }
.ac-rise { animation:ac-rise .4s cubic-bezier(.2,.8,.2,1) both; }
.ac-float { animation:ac-float 9s ease-in-out infinite; }
.ac-spin { animation:ac-spin .7s linear infinite; }
.ac-burst { animation:ac-burst .5s cubic-bezier(.2,.8,.2,1) both; }
.ac-skel { background:linear-gradient(100deg,rgba(19,38,34,.05) 30%,rgba(19,38,34,.11) 50%,rgba(19,38,34,.05) 70%); background-size:200% 100%; animation:ac-shimmer 1.4s linear infinite; }
.ac-card { transition:transform .3s cubic-bezier(.2,.8,.2,1), box-shadow .3s ease, border-color .3s ease; }
.ac-card:hover { transform:translateY(-3px); box-shadow:0 14px 35px rgba(19,38,34,.07); border-color:rgba(31,93,70,.25); }
.ac-row { transition:background .2s ease, box-shadow .2s ease; }
.ac-row:hover { background:#fff; box-shadow:0 7px 22px rgba(19,38,34,.055); }
@media print {
  .no-print { display:none!important; }
  .ac-up,.ac-rise { animation:none!important; }
}
@media(prefers-reduced-motion:reduce) {
  .ac-up,.ac-fade,.ac-rise,.ac-float,.ac-spin,.ac-burst,.ac-skel { animation:none!important; }
}
`;

const d = (i) => ({ animationDelay: `${Math.min(i, 14) * 45}ms` });

// --------------------------------------------------
// SMALL PIECES
// --------------------------------------------------

function Ticker({ value, money }) {
  const prev = useRef(0);
  const [n, setN] = useState(0);

  useEffect(() => {
    const from = prev.current;
    const to = Number(value) || 0;
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce || from === to) { setN(to); prev.current = to; return; }
    let raf;
    const t0 = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / 800);
      setN(from + (to - from) * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
      else prev.current = to;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return <>{money ? inr(n) : Math.round(n)}</>;
}

function Seg({ pct, className, label }) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setOn(true)));
    return () => cancelAnimationFrame(id);
  }, []);
  return (
    <span title={label}
      className={`h-full transition-[width] duration-[900ms] ease-[cubic-bezier(.2,.8,.2,1)] ${className}`}
      style={{ width: on ? `${pct}%` : "0%" }} />
  );
}

function Stat({ icon, label, i, children, sub, accent }) {
  return (
    <div className="ac-card ac-up group relative overflow-hidden rounded-2xl border border-[#132622]/10 bg-white p-5 shadow-sm" style={d(i)}>
      <span className={`pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full blur-3xl transition-transform duration-500 group-hover:scale-150 ${accent}`} />
      <div className="relative">
        <div className="flex items-center justify-between gap-3">
          <p className={`text-sm font-medium ${MUTED}`}>{label}</p>
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1F5D46]/[0.08] text-[#1F5D46] transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110">
            <Icon n={icon} size={19} />
          </span>
        </div>
        <div className="num mt-4 truncate text-2xl font-bold tracking-tight text-[#132622] sm:text-3xl">{children}</div>
        {sub && <p className={`mt-1 text-xs ${MUTED}`}>{sub}</p>}
      </div>
    </div>
  );
}

function Pill({ on, onClick, children, dot }) {
  return (
    <button type="button" onClick={onClick}
      className={`inline-flex shrink-0 items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition duration-200 hover:-translate-y-0.5 ${
        on
          ? "border-[#1F5D46] bg-[#1F5D46] text-white shadow-md shadow-[#1F5D46]/15"
          : "border-[#132622]/10 bg-white text-[#132622]/65 hover:border-[#1F5D46]/30 hover:bg-[#1F5D46]/[0.04] hover:text-[#1F5D46]"
      }`}>
      {dot && <span className={`h-2 w-2 rounded-full ${on ? "bg-white" : dot}`} />}
      {children}
    </button>
  );
}

function Switch({ on, onChange, label }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)}
      className="inline-flex items-center gap-2.5 text-xs font-semibold text-[#132622]/70">
      <span className={`relative h-5 w-9 rounded-full transition-colors duration-300 ${on ? "bg-[#1F5D46]" : "bg-[#132622]/20"}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all duration-300 ${on ? "left-[18px]" : "left-0.5"}`} />
      </span>
      {label}
    </button>
  );
}

function Shell({ title, sub, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [onClose]);

  return (
    <div className="no-print fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-6" role="dialog" aria-modal="true" aria-label={title}>
      <div className="ac-fade absolute inset-0 bg-[#0b1714]/55 backdrop-blur-sm" onClick={onClose} />
      <div className="ac-rise relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-[#FBFAF6] shadow-2xl ring-1 ring-black/5">
        <header className="relative shrink-0 overflow-hidden border-b border-[#132622]/10 px-6 py-5 sm:px-8">
          <span className="ac-float pointer-events-none absolute -left-10 -top-16 h-40 w-40 rounded-full bg-amber-400/20 blur-3xl" />
          <div className="relative flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="truncate font-serif text-2xl font-medium">{title}</h2>
              {sub && <p className={`mt-0.5 text-sm ${MUTED}`}>{sub}</p>}
            </div>
            <button type="button" aria-label="Close" onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[#132622]/45 transition hover:rotate-90 hover:bg-[#132622]/[0.06] hover:text-[#132622]">
              <Icon n="x" size={18} />
            </button>
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6 sm:px-8">{children}</div>
      </div>
    </div>
  );
}

// numeric cells; zero shows as a dash
function Cells({ r, cols, strong }) {
  return cols.map(([k]) => (
    <p key={k} className={`num text-right text-sm ${strong ? "font-bold" : "font-medium"} ${num(r[k]) ? "text-[#132622]" : "text-[#132622]/25"}`}>
      {num(r[k]) ? inr(r[k]) : "—"}
    </p>
  ));
}

// --------------------------------------------------
// UNBALANCED ENTRIES POPUP
// --------------------------------------------------

function Issues({ onClose }) {
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    api("/trial-balance/unbalanced-entries").then(setRows).catch((e) => setErr(e.message || "Unable to load."));
  }, []);

  return (
    <Shell title="Unbalanced entries" sub="Journal entries where total debit does not equal total credit." onClose={onClose}>
      {err ? (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{err}</p>
      ) : !rows ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="ac-skel h-16 rounded-2xl" />)}</div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center py-8 text-center">
          <span className="ac-burst flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 ring-8 ring-emerald-500/10">
            <Icon n="check" size={30} />
          </span>
          <p className="ac-up mt-4 font-serif text-xl font-medium">All entries are balanced</p>
          <p className={`ac-up mt-1 max-w-sm text-sm ${MUTED}`}>
            If the trial balance still shows a difference, it comes from opening balances, which have no offsetting entry.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((r, i) => (
            <div key={r.entry_id} style={d(i)} className="ac-up rounded-2xl border border-amber-600/25 bg-amber-50/50 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold">Entry #{r.entry_id} <span className={`font-normal ${MUTED}`}>· {r.entry_type} · {r.date}</span></p>
                <span className="num rounded-lg bg-white px-2.5 py-1 text-xs font-bold text-amber-700 ring-1 ring-amber-600/20">
                  {inr(Math.abs(num(r.difference)))} {num(r.difference) > 0 ? "Dr" : "Cr"} excess
                </span>
              </div>
              {r.narration && <p className={`mt-1 truncate text-xs ${MUTED}`}>{r.narration}</p>}
              <p className="num mt-2 text-xs text-[#132622]/70">Debit {inr(r.total_debit)} · Credit {inr(r.total_credit)}</p>
            </div>
          ))}
        </div>
      )}
      <div className="mt-6 flex justify-end border-t border-[#132622]/10 pt-5"><Btn onClick={onClose}>Close</Btn></div>
    </Shell>
  );
}

// --------------------------------------------------
// MAIN PAGE
// --------------------------------------------------

export default function TrialBalance() {
  const toast = useToast();
  const presets = useMemo(makePresets, []);

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [type, setType] = useState("");
  const [q, setQ] = useState("");
  const [hideZero, setHideZero] = useState(true);
  const [grouped, setGrouped] = useState(true);
  const [full, setFull] = useState(false);
  const [shut, setShut] = useState({});          // collapsed groups
  const [issues, setIssues] = useState(false);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const p = new URLSearchParams({ hide_zero: String(hideZero), group_by_type: "true" });
      if (from) p.set("date_from", from);
      if (to) p.set("date_to", to);
      setData(await api(`/trial-balance?${p}`));
    } catch (e) {
      setError(e.message || "Unable to load trial balance.");
    }
    setLoading(false);
  }, [from, to, hideZero]);

  useEffect(() => { load(); }, [load]);

  // ---------------- derived data ----------------
  const cols = full ? COLS_FULL : COLS_SIMPLE;
  const needle = q.trim().toLowerCase();

  const groups = useMemo(
    () =>
      (data?.groups || [])
        .map((g) => ({ ...g, rows: g.rows.filter((r) => !needle || r.account_name.toLowerCase().includes(needle)) }))
        .filter((g) => g.rows.length && (!type || g.account_type === type)),
    [data, needle, type]
  );
  const flat = useMemo(
    () => groups.flatMap((g) => g.rows).sort((a, b) => a.account_name.localeCompare(b.account_name)),
    [groups]
  );

  const all = data?.groups?.flatMap((g) => g.rows) || [];
  const totals = data?.totals || {};
  const diff = num(data?.difference);
  const balanced = data ? data.is_balanced : true;
  const dr = num(totals.closing_debit);
  const cr = num(totals.closing_credit);
  const drPct = dr + cr ? (dr / (dr + cr)) * 100 : 50;
  const counts = Object.fromEntries(TYPES.map((t) => [t.v, all.filter((r) => r.account_type === t.v).length]));
  const shown = flat.length;
  const activePreset = presets.find((p) => p.from === from && p.to === to)?.k;
  const period = from || to ? `${from || "Beginning"} → ${to || "Today"}` : "All transactions";
  const minW = full ? "min-w-[1100px]" : "min-w-[640px]";
  const grid = { gridTemplateColumns: `minmax(220px,1.7fr) repeat(${cols.length}, minmax(110px,1fr))` };

  // ---------------- actions ----------------
  function exportCsv() {
    const esc = (s) => `"${String(s ?? "").replace(/"/g, '""')}"`;
    const head = ["Account", "Type", ...cols.map(([, l]) => l)];
    const body = flat.map((r) => [esc(r.account_name), r.account_type, ...cols.map(([k]) => num(r[k]).toFixed(2))]);
    const foot = ["TOTAL", "", ...cols.map(([k]) => sumOf(flat, k).toFixed(2))];
    const csv = [head, ...body, foot].map((l) => l.join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `trial_balance_${to || "latest"}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast("Trial balance exported.");
  }

  const applyPreset = (p) => { setFrom(p.from); setTo(p.to); };

  const Row = ({ r, i }) => {
    const t = typeOf(r.account_type);
    return (
      <Link href={`/ledger?account=${r.account_id}`} style={{ ...grid, ...d(i) }}
        className="ac-row ac-up group relative grid items-center gap-4 px-5 py-3.5">
        <div className="flex min-w-0 items-center gap-3">
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white shadow-sm transition duration-300 group-hover:-rotate-3 group-hover:scale-105 ${t.avatar}`}>
            {r.account_name?.[0]?.toUpperCase() || "?"}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold transition-colors group-hover:text-[#1F5D46]">{r.account_name}</p>
            <p className={`text-[11px] ${MUTED}`}>{grouped ? `Account #${r.account_id}` : t.label}</p>
          </div>
        </div>
        <Cells r={r} cols={cols} />
        <span className="pointer-events-none absolute bottom-0 left-0 h-[2px] w-0 bg-[#1F5D46] transition-all duration-300 group-hover:w-full" />
      </Link>
    );
  };

  // ---------------- UI ----------------
  return (
    <>
      <style>{CSS}</style>

      <div className="space-y-6 pb-10">
        <PageHeader eyebrow="Reports" title="Trial balance">
          <div className="no-print flex flex-wrap gap-2">
            <Btn variant="line" onClick={() => window.print()}>
              <span className="inline-flex items-center gap-2"><Icon n="print" size={15} />Print</span>
            </Btn>
            <Btn variant="line" onClick={exportCsv} disabled={!shown}>
              <span className="inline-flex items-center gap-2"><Icon n="download" size={15} />Export CSV</span>
            </Btn>
            <Btn onClick={load} disabled={loading}>
              <span className="inline-flex items-center gap-2">
                {loading ? <span className="ac-spin h-4 w-4 rounded-full border-2 border-white/40 border-t-white" /> : <Icon n="refresh" size={15} />}
                Refresh
              </span>
            </Btn>
          </div>
        </PageHeader>

        {error && <div className="ac-up rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-600">{String(error)}</div>}

        {/* ---------- STATUS + OVERVIEW ---------- */}
        {!error && data && (
          <section className="space-y-4">
            <div
              className={`ac-up flex flex-wrap items-center gap-4 rounded-2xl border px-5 py-4 ${
                balanced ? "border-emerald-600/25 bg-emerald-50" : "border-amber-600/30 bg-amber-50"
              }`}
            >
              <span className={`ac-burst flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white ${balanced ? "bg-emerald-600" : "bg-amber-600"}`}>
                <Icon n={balanced ? "check" : "alert"} size={22} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{balanced ? "Trial balance is balanced" : "Trial balance does not tally"}</p>
                <p className={`text-sm ${MUTED}`}>
                  {balanced
                    ? `Total debit equals total credit for ${period.toLowerCase()}.`
                    : `${diff > 0 ? "Debit" : "Credit"} is higher by ${inr(Math.abs(diff))}. This usually comes from opening balances or an unbalanced entry.`}
                </p>
              </div>
              {!balanced && (
                <Btn variant="line" className="no-print" onClick={() => setIssues(true)}>
                  Find unbalanced entries
                </Btn>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Stat i={0} icon="down" label="Total debit" sub="Closing balances" accent="bg-sky-100"><Ticker value={dr} money /></Stat>
              <Stat i={1} icon="up" label="Total credit" sub="Closing balances" accent="bg-violet-100"><Ticker value={cr} money /></Stat>
              <Stat i={2} icon="scale" label="Difference" sub={balanced ? "Perfectly balanced" : "Debit minus credit"} accent={balanced ? "bg-emerald-100" : "bg-amber-100"}>
                <span className={balanced ? "text-emerald-700" : "text-amber-700"}><Ticker value={Math.abs(diff)} money /></span>
              </Stat>
              <Stat i={3} icon="layers" label="Accounts" sub={`${TYPES.filter((t) => counts[t.v]).length} categories`} accent="bg-emerald-100"><Ticker value={all.length} /></Stat>
            </div>

            <div className="ac-up rounded-2xl border border-[#132622]/10 bg-white p-5 shadow-sm" style={d(4)}>
              <div className="mb-3 flex items-center justify-between text-xs font-semibold">
                <span className="text-sky-700">Debit {inr(dr)}</span>
                <span className="text-violet-700">Credit {inr(cr)}</span>
              </div>
              <div className="flex h-3 overflow-hidden rounded-full bg-[#132622]/[0.06]">
                <Seg pct={drPct} className="bg-sky-500" label="Debit" />
                <Seg pct={100 - drPct} className="bg-violet-500" label="Credit" />
              </div>
            </div>
          </section>
        )}

        {/* ---------- TOOLBAR ---------- */}
        <section className="no-print ac-up space-y-4 rounded-2xl border border-[#132622]/10 bg-white p-4 shadow-sm" style={d(5)}>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <label className="group flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-[#132622]/10 bg-[#FBFAF6] px-4 py-3 transition focus-within:border-[#1F5D46]/40 focus-within:bg-white focus-within:ring-2 focus-within:ring-[#1F5D46]/10 lg:max-w-sm">
              <Icon n="search" size={18} className="shrink-0 text-[#132622]/40 group-focus-within:text-[#1F5D46]" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search accounts..." aria-label="Search accounts"
                className="w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-[#132622]/35" />
              {q && (
                <button type="button" aria-label="Clear search" onClick={() => setQ("")} className="rounded-md p-1 text-[#132622]/40 hover:bg-[#132622]/[0.06]">
                  <Icon n="x" size={15} />
                </button>
              )}
            </label>

            {[["From", from, setFrom], ["To", to, setTo]].map(([l, v, set]) => (
              <label key={l} className="flex items-center gap-2 rounded-xl border border-[#132622]/10 bg-[#FBFAF6] px-3 py-2.5 text-xs font-semibold text-[#132622]/55 transition focus-within:border-[#1F5D46]/40 focus-within:bg-white">
                {l}
                <input type="date" value={v} onChange={(e) => set(e.target.value)} aria-label={`${l} date`}
                  className="bg-transparent text-sm font-medium text-[#132622] outline-none" />
              </label>
            ))}
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {presets.map((p) => <Pill key={p.k} on={activePreset === p.k} onClick={() => applyPreset(p)}>{p.label}</Pill>)}
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            <Pill on={!type} onClick={() => setType("")}>All types</Pill>
            {TYPES.map((t) => <Pill key={t.v} on={type === t.v} dot={t.dot} onClick={() => setType(t.v)}>{t.label}</Pill>)}
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-[#132622]/[0.07] pt-4">
            <Switch on={grouped} onChange={setGrouped} label="Group by type" />
            <Switch on={full} onChange={setFull} label="Show opening & period columns" />
            <Switch on={hideZero} onChange={setHideZero} label="Hide zero accounts" />
          </div>
        </section>

        {/* ---------- TABLE ---------- */}
        <section className="ac-up" style={d(6)}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">Accounts</h2>
              <p className={`mt-0.5 text-xs ${MUTED}`}>{period}</p>
            </div>
            {!loading && data && (
              <span className="rounded-lg bg-[#1F5D46]/[0.07] px-3 py-1.5 text-xs font-semibold text-[#1F5D46]">
                Showing {shown} of {all.length}
              </span>
            )}
          </div>

          {loading && !data ? (
            <div className="space-y-3">{[0, 1, 2, 3, 4].map((i) => <div key={i} className="ac-skel h-[64px] rounded-2xl" style={d(i)} />)}</div>
          ) : shown ? (
            <div className="overflow-hidden rounded-2xl border border-[#132622]/10 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <div className={minW}>
                  <div style={grid} className="grid items-center gap-4 border-b border-[#132622]/10 bg-[#F7F8F5] px-5 py-4 text-[10px] font-bold uppercase tracking-wider text-[#132622]/45">
                    <span>Account</span>
                    {cols.map(([k, l]) => <span key={k} className="text-right">{l}</span>)}
                  </div>

                  <div className={loading ? "opacity-60 transition-opacity" : "transition-opacity"}>
                    {grouped ? (
                      groups.map((g) => {
                        const t = typeOf(g.account_type);
                        const closed = shut[g.account_type];
                        const sub = Object.fromEntries(cols.map(([k]) => [k, sumOf(g.rows, k)]));
                        return (
                          <div key={g.account_type}>
                            <button type="button" onClick={() => setShut((s) => ({ ...s, [g.account_type]: !s[g.account_type] }))}
                              style={grid} aria-expanded={!closed}
                              className="grid w-full items-center gap-4 border-b border-[#132622]/[0.07] bg-[#FBFAF6] px-5 py-3 text-left transition hover:bg-[#F3F4EE]">
                              <span className="flex items-center gap-2.5">
                                <Icon n="chev" size={14} className={`text-[#132622]/45 transition-transform duration-300 ${closed ? "" : "rotate-90"}`} />
                                <span className={`h-2.5 w-2.5 rounded-full ${t.dot}`} />
                                <span className="text-sm font-bold">{t.label}</span>
                                <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${t.chip}`}>{g.rows.length}</span>
                              </span>
                              <Cells r={sub} cols={cols} strong />
                            </button>
                            {!closed && (
                              <div className="divide-y divide-[#132622]/[0.06] border-b border-[#132622]/[0.07]">
                                {g.rows.map((r, i) => <Row key={r.account_id} r={r} i={i} />)}
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="divide-y divide-[#132622]/[0.06]">
                        {flat.map((r, i) => <Row key={r.account_id} r={r} i={i} />)}
                      </div>
                    )}
                  </div>

                  <div style={grid} className="grid items-center gap-4 border-t-2 border-[#132622]/15 bg-[#F7F8F5] px-5 py-4">
                    <span className="text-sm font-bold uppercase tracking-wide">Total</span>
                    <Cells r={Object.fromEntries(cols.map(([k]) => [k, sumOf(flat, k)]))} cols={cols} strong />
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#132622]/10 bg-[#F7F8F5] px-5 py-3">
                <p className={`text-xs ${MUTED}`}>Click any account to open its ledger.</p>
                <p className={`inline-flex items-center gap-1.5 text-xs font-semibold ${balanced ? "text-emerald-700" : "text-amber-700"}`}>
                  <Icon n={balanced ? "check" : "alert"} size={13} />
                  {balanced ? "Balanced" : `Difference ${inr(Math.abs(diff))}`}
                </p>
              </div>
            </div>
          ) : (
            <div className="ac-up flex flex-col items-center rounded-3xl border border-dashed border-[#132622]/20 bg-white px-6 py-14 text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#1F5D46]/10 text-[#1F5D46] ring-8 ring-[#1F5D46]/5">
                <Icon n={needle || type ? "search" : "scale"} size={28} />
              </span>
              <h3 className="mt-5 font-serif text-xl font-medium">
                {needle || type ? "No matching accounts" : "Nothing to show yet"}
              </h3>
              <p className={`mt-1 max-w-xs text-sm ${MUTED}`}>
                {needle || type
                  ? "Try a different search or clear your filters."
                  : "Post some journal, sales or purchase entries, or widen the date range."}
              </p>
              {(needle || type) && (
                <Btn variant="line" className="mt-5" onClick={() => { setQ(""); setType(""); }}>Clear filters</Btn>
              )}
            </div>
          )}
        </section>

        {issues && <Issues onClose={() => setIssues(false)} />}
      </div>
    </>
  );
}