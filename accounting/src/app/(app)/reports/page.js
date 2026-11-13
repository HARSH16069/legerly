"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Btn, PageHeader, useToast } from "@/components/ui";
import { api } from "@/lib/api";
import { inr } from "@/lib/format";

// Save as: src/app/(app)/reports/page.js
// Backend: GET /reports/profit-loss, GET /reports/balance-sheet

const MUTED = "text-[#132622]/55";
const num = (n) => Number(n) || 0;

const ymd = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function periodPresets() {
  const n = new Date(), y = n.getFullYear(), m = n.getMonth();
  const fy = m >= 3 ? y : y - 1;                 // Indian FY: 1 Apr - 31 Mar
  const q = Math.floor(m / 3) * 3;
  return [
    { k: "month", label: "This month", from: ymd(new Date(y, m, 1)), to: ymd(new Date(y, m + 1, 0)) },
    { k: "quarter", label: "This quarter", from: ymd(new Date(y, q, 1)), to: ymd(new Date(y, q + 3, 0)) },
    { k: "fy", label: "This FY", from: ymd(new Date(fy, 3, 1)), to: ymd(new Date(fy + 1, 2, 31)) },
    { k: "lfy", label: "Last FY", from: ymd(new Date(fy - 1, 3, 1)), to: ymd(new Date(fy, 2, 31)) },
    { k: "all", label: "All time", from: "", to: "" },
  ];
}

function asOnPresets() {
  const n = new Date(), y = n.getFullYear(), m = n.getMonth();
  const fy = m >= 3 ? y : y - 1;
  return [
    { k: "today", label: "Today", to: ymd(n) },
    { k: "pm", label: "Last month end", to: ymd(new Date(y, m, 0)) },
    { k: "fy", label: "Last FY end", to: ymd(new Date(fy, 2, 31)) },
  ];
}

// --------------------------------------------------
// ICONS + CSS
// --------------------------------------------------

const ICONS = {
  down: "M17 7L7 17M7 17h8M7 17V9",
  up: "M7 17L17 7M17 7H9M17 7v8",
  scale: "M12 3v18M7 21h10M5 7h14M5 7l-3 7a3 3 0 006 0L5 7zm14 0l-3 7a3 3 0 006 0l-3-7z",
  pct: "M19 5L5 19M7 7h.01M17 17h.01",
  layers: "M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5",
  check: "M5 12.5l4.5 4.5L19 7.5",
  alert: "M12 9v4m0 4h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z",
  download: "M12 4v12m0 0l-4-4m4 4l4-4M4 20h16",
  print: "M7 9V3h10v6M7 17H5a2 2 0 01-2-2v-4a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2h-2M7 14h10v7H7z",
  refresh: "M20 7v5h-5M4 17v-5h5M5.6 9a7 7 0 0112-2L20 12M4 12l2.4 5a7 7 0 0012-2",
};

const Icon = ({ n, size = 16, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d={ICONS[n]} />
  </svg>
);

const CSS = `
@keyframes ac-up { from { opacity:0; transform:translateY(14px) } to { opacity:1; transform:translateY(0) } }
@keyframes ac-shimmer { from { background-position:200% 0 } to { background-position:-200% 0 } }
@keyframes ac-spin { to { transform:rotate(360deg) } }
@keyframes ac-burst { 0% { opacity:0; transform:scale(.5) } 60% { opacity:1; transform:scale(1.08) } 100% { opacity:1; transform:scale(1) } }
.ac-up { animation:ac-up .5s cubic-bezier(.2,.8,.2,1) both; }
.ac-spin { animation:ac-spin .7s linear infinite; }
.ac-burst { animation:ac-burst .5s cubic-bezier(.2,.8,.2,1) both; }
.ac-skel { background:linear-gradient(100deg,rgba(19,38,34,.05) 30%,rgba(19,38,34,.11) 50%,rgba(19,38,34,.05) 70%); background-size:200% 100%; animation:ac-shimmer 1.4s linear infinite; }
.ac-card { transition:transform .3s cubic-bezier(.2,.8,.2,1), box-shadow .3s ease, border-color .3s ease; }
.ac-card:hover { transform:translateY(-3px); box-shadow:0 14px 35px rgba(19,38,34,.07); border-color:rgba(31,93,70,.25); }
.ac-row { transition:background .2s ease, box-shadow .2s ease; }
.ac-row:hover { background:#fff; box-shadow:0 7px 22px rgba(19,38,34,.055); }
@media print { .no-print { display:none!important; } .ac-up { animation:none!important; } }
@media(prefers-reduced-motion:reduce) { .ac-up,.ac-spin,.ac-burst,.ac-skel { animation:none!important; } }
`;

const d = (i) => ({ animationDelay: `${Math.min(i, 14) * 45}ms` });

// --------------------------------------------------
// SMALL PIECES
// --------------------------------------------------

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
  return <>{money ? inr(n) : Math.round(n * 10) / 10}</>;
}

function Seg({ pct, className }) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setOn(true)));
    return () => cancelAnimationFrame(id);
  }, []);
  return <span className={`h-full transition-[width] duration-[900ms] ease-[cubic-bezier(.2,.8,.2,1)] ${className}`} style={{ width: on ? `${pct}%` : "0%" }} />;
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
        <div className="num mt-4 truncate text-2xl font-bold tracking-tight sm:text-3xl">{children}</div>
        {sub && <p className={`mt-1 text-xs ${MUTED}`}>{sub}</p>}
      </div>
    </div>
  );
}

function Pill({ on, onClick, children }) {
  return (
    <button type="button" onClick={onClick}
      className={`inline-flex shrink-0 items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition duration-200 hover:-translate-y-0.5 ${
        on
          ? "border-[#1F5D46] bg-[#1F5D46] text-white shadow-md shadow-[#1F5D46]/15"
          : "border-[#132622]/10 bg-white text-[#132622]/65 hover:border-[#1F5D46]/30 hover:bg-[#1F5D46]/[0.04] hover:text-[#1F5D46]"
      }`}>
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

function DateBox({ label, value, onChange }) {
  return (
    <label className="flex items-center gap-2 rounded-xl border border-[#132622]/10 bg-[#FBFAF6] px-3 py-2.5 text-xs font-semibold text-[#132622]/55 transition focus-within:border-[#1F5D46]/40 focus-within:bg-white">
      {label}
      <input type="date" value={value} onChange={(e) => onChange(e.target.value)} aria-label={`${label} date`}
        className="bg-transparent text-sm font-medium text-[#132622] outline-none" />
    </label>
  );
}

function useData(url) {
  const [s, set] = useState({ data: null, loading: true, error: null });
  const load = useCallback(async () => {
    set((x) => ({ ...x, loading: true, error: null }));
    try {
      set({ data: await api(url), loading: false, error: null });
    } catch (e) {
      set((x) => ({ ...x, loading: false, error: e.message || "Unable to load report." }));
    }
  }, [url]);
  useEffect(() => { load(); }, [load]);
  return { ...s, reload: load };
}

function downloadCsv(name, rows) {
  const esc = (v) => (typeof v === "string" ? `"${v.replace(/"/g, '""')}"` : v);
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([rows.map((r) => r.map(esc).join(",")).join("\n")], { type: "text/csv" }));
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

const change = (cur, prev) => {
  if (prev == null) return null;
  if (!num(prev)) return num(cur) ? "new" : "—";
  const p = ((num(cur) - num(prev)) / Math.abs(num(prev))) * 100;
  return `${p > 0 ? "+" : ""}${p.toFixed(1)}%`;
};

// One block of a statement: header, account rows, total.
function Block({ title, dot, rows, total, prevTotal, showPrev, sign = 1, extra }) {
  const grid = { gridTemplateColumns: showPrev ? "minmax(0,1fr) 130px 130px 80px" : "minmax(0,1fr) 150px" };
  const all = extra ? [...rows, extra] : rows;
  return (
    <div className="overflow-hidden rounded-2xl border border-[#132622]/10 bg-white shadow-sm">
      <div style={grid} className="grid items-center gap-4 border-b border-[#132622]/10 bg-[#F7F8F5] px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-[#132622]/45">
        <span className="flex items-center gap-2 text-xs text-[#132622]"><span className={`h-2.5 w-2.5 rounded-full ${dot}`} />{title}</span>
        <span className="text-right">{showPrev ? "Current" : "Amount"}</span>
        {showPrev && <><span className="text-right">Previous</span><span className="text-right">Change</span></>}
      </div>
      {all.length ? (
        <div className="divide-y divide-[#132622]/[0.06]">
          {all.map((r, i) => {
            const cells = (
              <>
                <p className="truncate text-sm font-semibold">{r.account_name}</p>
                <p className="num text-right text-sm font-medium">{inr(num(r.amount) * sign)}</p>
                {showPrev && (
                  <>
                    <p className="num text-right text-sm text-[#132622]/60">{inr(num(r.previous) * sign)}</p>
                    <p className={`text-right text-xs font-semibold ${MUTED}`}>{change(r.amount, r.previous)}</p>
                  </>
                )}
              </>
            );
            return r.account_id ? (
              <Link key={r.account_id} href={`/ledger?account=${r.account_id}`} style={{ ...grid, ...d(i) }} className="ac-row ac-up grid items-center gap-4 px-5 py-3">{cells}</Link>
            ) : (
              <div key={r.account_name} style={{ ...grid, ...d(i) }} className="ac-up grid items-center gap-4 bg-[#FBFAF6] px-5 py-3 italic">{cells}</div>
            );
          })}
        </div>
      ) : (
        <p className={`px-5 py-6 text-sm ${MUTED}`}>No accounts with activity.</p>
      )}
      <div style={grid} className="grid items-center gap-4 border-t-2 border-[#132622]/15 bg-[#F7F8F5] px-5 py-3.5">
        <span className="text-sm font-bold uppercase tracking-wide">Total {title.toLowerCase()}</span>
        <span className="num text-right text-sm font-bold">{inr(total * sign)}</span>
        {showPrev && <><span className="num text-right text-sm font-bold text-[#132622]/60">{inr(num(prevTotal) * sign)}</span><span className={`text-right text-xs font-semibold ${MUTED}`}>{change(total, prevTotal)}</span></>}
      </div>
    </div>
  );
}

function Skeleton() {
  return <div className="space-y-3">{[0, 1, 2, 3].map((i) => <div key={i} className="ac-skel h-[64px] rounded-2xl" style={d(i)} />)}</div>;
}

function Failed({ msg }) {
  return <div className="ac-up rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-600">{String(msg)}</div>;
}

// --------------------------------------------------
// PROFIT & LOSS
// --------------------------------------------------

function ProfitLoss() {
  const toast = useToast();
  const presets = useMemo(periodPresets, []);
  const [from, setFrom] = useState(() => periodPresets().find((p) => p.k === "fy").from);
  const [to, setTo] = useState(() => periodPresets().find((p) => p.k === "fy").to);
  const [compare, setCompare] = useState(false);
  const [hideZero, setHideZero] = useState(true);

  const url = useMemo(() => {
    const p = new URLSearchParams({ hide_zero: String(hideZero), compare: String(compare) });
    if (from) p.set("date_from", from);
    if (to) p.set("date_to", to);
    return `/reports/profit-loss?${p}`;
  }, [from, to, compare, hideZero]);

  const { data, loading, error, reload } = useData(url);
  const showPrev = compare && !!data?.previous_from;
  const inc = num(data?.income?.total), exp = num(data?.expenses?.total), net = num(data?.net_profit);
  const profit = net >= 0;
  const expPct = inc > 0 ? Math.min(100, (exp / inc) * 100) : exp > 0 ? 100 : 0;
  const period = from || to ? `${from || "Beginning"} → ${to || "Today"}` : "All transactions";
  const active = presets.find((p) => p.from === from && p.to === to)?.k;

  function exportCsv() {
    const rows = [["Profit & Loss", period], ["Account", "Amount", ...(showPrev ? ["Previous"] : [])], ["INCOME"]];
    const add = (list) => list.forEach((r) => rows.push([r.account_name, num(r.amount), ...(showPrev ? [num(r.previous)] : [])]));
    add(data.income.rows);
    rows.push(["Total income", inc, ...(showPrev ? [num(data.income.previous_total)] : [])], ["EXPENSES"]);
    add(data.expenses.rows);
    rows.push(["Total expenses", exp, ...(showPrev ? [num(data.expenses.previous_total)] : [])]);
    rows.push([profit ? "NET PROFIT" : "NET LOSS", net, ...(showPrev ? [num(data.previous_net_profit)] : [])]);
    downloadCsv(`profit_loss_${to || "all"}.csv`, rows);
    toast("Profit & Loss exported.");
  }

  return (
    <div className="space-y-6">
      <section className="no-print ac-up space-y-4 rounded-2xl border border-[#132622]/10 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <DateBox label="From" value={from} onChange={setFrom} />
          <DateBox label="To" value={to} onChange={setTo} />
          <div className="ml-auto flex gap-2">
            <Btn variant="line" onClick={() => window.print()}><span className="inline-flex items-center gap-2"><Icon n="print" size={15} />Print</span></Btn>
            <Btn variant="line" onClick={exportCsv} disabled={!data}><span className="inline-flex items-center gap-2"><Icon n="download" size={15} />CSV</span></Btn>
            <Btn onClick={reload} disabled={loading}><span className="inline-flex items-center gap-2"><Icon n="refresh" size={15} />Refresh</span></Btn>
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {presets.map((p) => <Pill key={p.k} on={active === p.k} onClick={() => { setFrom(p.from); setTo(p.to); }}>{p.label}</Pill>)}
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-[#132622]/[0.07] pt-4">
          <Switch on={compare} onChange={setCompare} label="Compare with previous period" />
          <Switch on={hideZero} onChange={setHideZero} label="Hide zero accounts" />
          {compare && (!from || !to) && <span className="text-xs font-medium text-amber-700">Pick both dates to compare.</span>}
        </div>
      </section>

      {error ? <Failed msg={error} /> : loading && !data ? <Skeleton /> : data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat i={0} icon="up" label="Total income" sub={period} accent="bg-sky-100"><Ticker value={inc} money /></Stat>
            <Stat i={1} icon="down" label="Total expenses" sub="Purchases, rent & other costs" accent="bg-rose-100"><Ticker value={exp} money /></Stat>
            <Stat i={2} icon="scale" label={profit ? "Net profit" : "Net loss"} sub={profit ? "Income minus expenses" : "Expenses exceed income"} accent={profit ? "bg-emerald-100" : "bg-amber-100"}>
              <span className={profit ? "text-emerald-700" : "text-rose-600"}><Ticker value={Math.abs(net)} money /></span>
            </Stat>
            <Stat i={3} icon="pct" label="Profit margin" sub="Net profit ÷ income" accent="bg-violet-100">
              <span className={profit ? "text-emerald-700" : "text-rose-600"}><Ticker value={data.margin} />%</span>
            </Stat>
          </div>

          <div className="ac-up rounded-2xl border border-[#132622]/10 bg-white p-5 shadow-sm" style={d(4)}>
            <div className="mb-3 flex items-center justify-between text-xs font-semibold">
              <span className="text-rose-600">Expenses {inr(exp)}</span>
              <span className="text-emerald-700">{profit ? `Profit ${inr(net)}` : `Loss ${inr(Math.abs(net))}`}</span>
            </div>
            <div className="flex h-3 overflow-hidden rounded-full bg-[#132622]/[0.06]">
              <Seg pct={expPct} className="bg-rose-500" />
              <Seg pct={100 - expPct} className="bg-emerald-500" />
            </div>
            <p className={`mt-2 text-xs ${MUTED}`}>Each ₹100 of income: ₹{expPct.toFixed(0)} goes to expenses.</p>
          </div>

          <div className={`space-y-4 ${loading ? "opacity-60 transition-opacity" : ""}`}>
            <Block title="Income" dot="bg-sky-500" rows={data.income.rows} total={inc} prevTotal={data.income.previous_total} showPrev={showPrev} />
            <Block title="Expenses" dot="bg-rose-500" rows={data.expenses.rows} total={exp} prevTotal={data.expenses.previous_total} showPrev={showPrev} />
            <div className={`ac-up flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-6 py-5 ${profit ? "border-emerald-600/25 bg-emerald-50" : "border-rose-600/25 bg-rose-50"}`}>
              <div>
                <p className="font-serif text-xl font-medium">{profit ? "Net profit" : "Net loss"}</p>
                <p className={`text-xs ${MUTED}`}>{period}</p>
              </div>
              <div className="text-right">
                <p className={`num text-2xl font-bold ${profit ? "text-emerald-700" : "text-rose-600"}`}>{inr(Math.abs(net))}</p>
                {showPrev && <p className={`text-xs ${MUTED}`}>Previous {inr(num(data.previous_net_profit))} · {change(net, data.previous_net_profit)}</p>}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// --------------------------------------------------
// BALANCE SHEET
// --------------------------------------------------

function BalanceSheet() {
  const toast = useToast();
  const presets = useMemo(asOnPresets, []);
  const [asOn, setAsOn] = useState(() => asOnPresets()[0].to);
  const [hideZero, setHideZero] = useState(true);

  const url = useMemo(() => {
    const p = new URLSearchParams({ hide_zero: String(hideZero) });
    if (asOn) p.set("as_on", asOn);
    return `/reports/balance-sheet?${p}`;
  }, [asOn, hideZero]);

  const { data, loading, error, reload } = useData(url);
  const A = num(data?.assets?.total), L = num(data?.liabilities?.total), E = num(data?.equity?.total);
  const diff = num(data?.difference);
  const balanced = data ? data.is_balanced : true;
  const active = presets.find((p) => p.to === asOn)?.k;
  const when = asOn ? `As on ${asOn}` : "As on today";
  const profit = num(data?.equity?.profit_to_date);
  const equityExtra = data && profit !== 0 ? { account_name: profit > 0 ? "Profit to date" : "Loss to date", amount: profit } : null;

  function exportCsv() {
    const rows = [["Balance Sheet", when], ["Account", "Amount"], ["ASSETS"]];
    data.assets.rows.forEach((r) => rows.push([r.account_name, num(r.amount)]));
    rows.push(["Total assets", A], ["LIABILITIES"]);
    data.liabilities.rows.forEach((r) => rows.push([r.account_name, num(r.amount)]));
    rows.push(["Total liabilities", L], ["EQUITY"]);
    data.equity.rows.forEach((r) => rows.push([r.account_name, num(r.amount)]));
    if (equityExtra) rows.push([equityExtra.account_name, profit]);
    rows.push(["Total equity", E], ["Total liabilities + equity", num(data.liabilities_and_equity)]);
    downloadCsv(`balance_sheet_${asOn || "latest"}.csv`, rows);
    toast("Balance sheet exported.");
  }

  return (
    <div className="space-y-6">
      <section className="no-print ac-up space-y-4 rounded-2xl border border-[#132622]/10 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <DateBox label="As on" value={asOn} onChange={setAsOn} />
          <div className="ml-auto flex gap-2">
            <Btn variant="line" onClick={() => window.print()}><span className="inline-flex items-center gap-2"><Icon n="print" size={15} />Print</span></Btn>
            <Btn variant="line" onClick={exportCsv} disabled={!data}><span className="inline-flex items-center gap-2"><Icon n="download" size={15} />CSV</span></Btn>
            <Btn onClick={reload} disabled={loading}><span className="inline-flex items-center gap-2"><Icon n="refresh" size={15} />Refresh</span></Btn>
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {presets.map((p) => <Pill key={p.k} on={active === p.k} onClick={() => setAsOn(p.to)}>{p.label}</Pill>)}
        </div>
        <div className="border-t border-[#132622]/[0.07] pt-4"><Switch on={hideZero} onChange={setHideZero} label="Hide zero accounts" /></div>
      </section>

      {error ? <Failed msg={error} /> : loading && !data ? <Skeleton /> : data && (
        <>
          <div className={`ac-up flex flex-wrap items-center gap-4 rounded-2xl border px-5 py-4 ${balanced ? "border-emerald-600/25 bg-emerald-50" : "border-amber-600/30 bg-amber-50"}`}>
            <span className={`ac-burst flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white ${balanced ? "bg-emerald-600" : "bg-amber-600"}`}>
              <Icon n={balanced ? "check" : "alert"} size={22} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{balanced ? "Balance sheet is balanced" : "Balance sheet does not tally"}</p>
              <p className={`text-sm ${MUTED}`}>
                {balanced
                  ? "Assets equal liabilities plus equity."
                  : `Assets are ${diff > 0 ? "higher" : "lower"} than liabilities + equity by ${inr(Math.abs(diff))}. This usually comes from opening balances that have no offsetting entry.`}
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Stat i={0} icon="layers" label="Total assets" sub={when} accent="bg-emerald-100"><Ticker value={A} money /></Stat>
            <Stat i={1} icon="down" label="Total liabilities" sub="What you owe" accent="bg-amber-100"><Ticker value={L} money /></Stat>
            <Stat i={2} icon="scale" label="Total equity" sub="Includes profit to date" accent="bg-violet-100"><Ticker value={E} money /></Stat>
          </div>

          <div className={`grid items-start gap-4 lg:grid-cols-2 ${loading ? "opacity-60 transition-opacity" : ""}`}>
            <Block title="Assets" dot="bg-emerald-500" rows={data.assets.rows} total={A} />
            <div className="space-y-4">
              <Block title="Liabilities" dot="bg-amber-500" rows={data.liabilities.rows} total={L} />
              <Block title="Equity" dot="bg-violet-500" rows={data.equity.rows} total={E} extra={equityExtra} />
              <div className="ac-up flex items-center justify-between rounded-2xl border border-[#132622]/10 bg-[#F7F8F5] px-5 py-4">
                <span className="text-sm font-bold uppercase tracking-wide">Liabilities + equity</span>
                <span className="num text-sm font-bold">{inr(num(data.liabilities_and_equity))}</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// --------------------------------------------------
// PAGE
// --------------------------------------------------

const TABS = [["pl", "Profit & Loss"], ["bs", "Balance Sheet"]];

export default function Reports() {
  const [tab, setTab] = useState("pl");
  const i = tab === "pl" ? 0 : 1;

  return (
    <>
      <style>{CSS}</style>
      <div className="space-y-6 pb-10">
        <PageHeader eyebrow="Reports" title="Financial statements" />

        <div role="tablist" className="no-print relative grid max-w-md grid-cols-2 rounded-2xl bg-[#132622]/[0.06] p-1">
          <span aria-hidden className="absolute bottom-1 left-1 top-1 rounded-xl bg-white shadow-md ring-1 ring-black/5 transition-transform duration-500 ease-[cubic-bezier(.2,.9,.25,1.1)]"
            style={{ width: "calc((100% - 0.5rem) / 2)", transform: `translateX(${i * 100}%)` }} />
          {TABS.map(([k, label]) => (
            <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
              className={`relative z-10 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors duration-300 ${tab === k ? "text-[#1F5D46]" : "text-[#132622]/55 hover:text-[#132622]"}`}>
              {label}
            </button>
          ))}
        </div>

        {tab === "pl" ? <ProfitLoss key="pl" /> : <BalanceSheet key="bs" />}
      </div>
    </>
  );
}