"use client";
import { useEffect, useRef, useState } from "react";
import { Btn, Field, Input, PageHeader, Select, useToast } from "@/components/ui";
import { useAsync } from "@/hooks/useAsync";
import { api, send } from "@/lib/api";
import { day, inr, today } from "@/lib/format";

const MUTED = "text-[#132622]/55";
const num = (n) => Number(n) || 0;

const label = (i) => (i.status === "overdue" ? `Overdue ${i.days_overdue} day${i.days_overdue === 1 ? "" : "s"}` : i.status === "due_today" ? "Due today" : `Due in ${i.days_left} days`);

// Static class names so Tailwind can see them.
const STATUS = {
  overdue: { chip: "bg-rose-50 text-rose-700", dot: "bg-rose-500", bar: "bg-rose-500", name: "Overdue" },
  due_today: { chip: "bg-amber-50 text-amber-700", dot: "bg-amber-500", bar: "bg-amber-500", name: "Due today" },
  due_soon: { chip: "bg-sky-50 text-sky-700", dot: "bg-sky-500", bar: "bg-sky-500", name: "Due soon" },
};
const st = (s) => STATUS[s] || STATUS.due_soon;

const SIDE = {
  collect: { text: "text-emerald-700", bar: "bg-emerald-500", soft: "bg-emerald-50 text-emerald-700", ring: "ring-emerald-600/20", card: "border-emerald-600/25 from-emerald-50", glow: "rgba(5,150,105,.16)", icon: "in" },
  pay: { text: "text-amber-700", bar: "bg-amber-500", soft: "bg-amber-50 text-amber-700", ring: "ring-amber-600/20", card: "border-amber-600/25 from-amber-50", glow: "rgba(217,119,6,.16)", icon: "out" },
};

const PALETTE = ["bg-emerald-600", "bg-sky-600", "bg-violet-600", "bg-amber-600", "bg-rose-600", "bg-teal-600", "bg-indigo-600"];
const tone = (s = "") => PALETTE[[...String(s)].reduce((a, ch) => a + ch.charCodeAt(0), 0) % PALETTE.length];

const ICONS = {
  in: "M17 7L7 17M7 17h8M7 17V9",
  out: "M7 17L17 7M17 7H9M17 7v8",
  check: "M5 12.5l4.5 4.5L19 7.5",
  x: "M6 6l12 12M18 6L6 18",
  clock: "M12 7v5l3 2M12 21a9 9 0 100-18 9 9 0 000 18z",
  alert: "M12 9v4M12 17h.01M10.3 3.9L2.4 18a2 2 0 001.7 3h15.8a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z",
  info: "M12 8h.01M11 12h1v5h1M12 21a9 9 0 100-18 9 9 0 000 18z",
  cal: "M7 3v4M17 3v4M4 9h16M5 5h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z",
  bell: "M6 9a6 6 0 1112 0c0 6 2 7 2 7H4s2-1 2-7zM10 20a2 2 0 004 0",
};

const Icon = ({ n, size = 16, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d={ICONS[n]} />
  </svg>
);

const CSS = `
@keyframes rm-up{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
@keyframes rm-fade{from{opacity:0}to{opacity:1}}
@keyframes rm-rise{from{opacity:0;transform:translateY(24px) scale(.97)}to{opacity:1;transform:none}}
@keyframes rm-pop{0%{opacity:.5;transform:scale(.94)}60%{transform:scale(1.025)}100%{opacity:1;transform:scale(1)}}
@keyframes rm-float{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(18px,-12px) scale(1.12)}}
@keyframes rm-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
@keyframes rm-shimmer{from{background-position:200% 0}to{background-position:-200% 0}}
@keyframes rm-sheen{from{transform:translateX(-120%)}to{transform:translateX(220%)}}
@keyframes rm-spin{to{transform:rotate(360deg)}}
@keyframes rm-draw{to{stroke-dashoffset:0}}
@keyframes rm-burst{0%{opacity:0;transform:scale(.5)}60%{opacity:1;transform:scale(1.08)}100%{opacity:1;transform:scale(1)}}
.rm-up{animation:rm-up .5s cubic-bezier(.2,.8,.2,1) both}
.rm-fade{animation:rm-fade .25s ease both}
.rm-rise{animation:rm-rise .4s cubic-bezier(.2,.8,.2,1) both}
.rm-pop{animation:rm-pop .4s cubic-bezier(.2,.8,.2,1) both}
.rm-float{animation:rm-float 9s ease-in-out infinite}
.rm-float2{animation:rm-float 12s ease-in-out infinite reverse}
.rm-bob{animation:rm-bob 3.2s ease-in-out infinite}
.rm-spin{animation:rm-spin .7s linear infinite}
.rm-burst{animation:rm-burst .5s cubic-bezier(.2,.8,.2,1) both}
.rm-check{stroke-dasharray:48;stroke-dashoffset:48;animation:rm-draw .5s .3s ease forwards}
.rm-skel{background:linear-gradient(100deg,rgba(19,38,34,.05) 30%,rgba(19,38,34,.11) 50%,rgba(19,38,34,.05) 70%);background-size:200% 100%;animation:rm-shimmer 1.4s linear infinite}
.rm-btn{position:relative;overflow:hidden}
.rm-btn::after{content:"";position:absolute;inset:0;width:40%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.35),transparent);transform:translateX(-120%)}
.rm-btn:hover::after{animation:rm-sheen .8s ease}
@media (prefers-reduced-motion:reduce){.rm-up,.rm-fade,.rm-rise,.rm-pop,.rm-float,.rm-float2,.rm-bob,.rm-spin,.rm-burst,.rm-skel{animation:none!important}.rm-check{animation:none!important;stroke-dashoffset:0}.rm-btn::after{display:none}}
`;

const d = (i) => ({ animationDelay: `${Math.min(i, 14) * 45}ms` });

const glow = (e) => {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
  e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
};

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

// Progress bar that grows in from zero.
function Progress({ pct, className = "bg-emerald-500", h = "h-1.5" }) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setOn(true)));
    return () => cancelAnimationFrame(id);
  }, []);
  const p = Math.max(0, Math.min(100, pct));
  return (
    <span className={`block overflow-hidden rounded-full bg-[#132622]/[0.08] ${h}`}>
      <span className={`block h-full rounded-full transition-[width] duration-[900ms] ease-[cubic-bezier(.2,.8,.2,1)] ${className}`} style={{ width: on ? `${p}%` : "0%" }} />
    </span>
  );
}

// Sliding-pill choice group.
function Choice({ options, value, onChange, label }) {
  const i = Math.max(0, options.findIndex((o) => o.v === value));
  return (
    <div role="radiogroup" aria-label={label} className="relative grid rounded-2xl bg-[#132622]/[0.06] p-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0,1fr))` }}>
      <span aria-hidden className="absolute bottom-1 left-1 top-1 rounded-xl bg-white shadow-md ring-1 ring-black/5 transition-transform duration-500 ease-[cubic-bezier(.2,.9,.25,1.1)]" style={{ width: `calc((100% - 0.5rem) / ${options.length})`, transform: `translateX(${i * 100}%)` }} />
      {options.map((o) => (
        <button key={o.v} type="button" role="radio" aria-checked={value === o.v} onClick={() => onChange(o.v)} className={`relative z-10 whitespace-nowrap rounded-xl px-3.5 py-2 text-[13px] font-semibold transition-colors duration-300 ${value === o.v ? "text-[#1F5D46]" : "text-[#132622]/55 hover:text-[#132622]"}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

// --------------------------------------------------
// Popup shell
// --------------------------------------------------

function Shell({ title, sub, onClose, busy, max = "max-w-2xl", children }) {
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
      <div className="rm-fade absolute inset-0 bg-[#0b1714]/55 backdrop-blur-sm" onClick={() => !busy && onClose()} />

      <div className={`rm-rise relative flex max-h-[92vh] w-full ${max} flex-col overflow-hidden rounded-3xl bg-[#FBFAF6] shadow-2xl ring-1 ring-black/5`}>
        <header className="relative shrink-0 overflow-hidden border-b border-[#132622]/10 px-6 py-5 sm:px-8">
          <span aria-hidden className="rm-float pointer-events-none absolute -left-10 -top-16 h-40 w-40 rounded-full bg-emerald-400/20 blur-3xl" />
          <span aria-hidden className="rm-float2 pointer-events-none absolute -right-8 -top-20 h-44 w-44 rounded-full bg-amber-300/25 blur-3xl" />

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
// Payment popup
// --------------------------------------------------

function PayModal({ item, onClose, onDone }) {
  const toast = useToast(), inflow = item.entry_type === "sales", due = Number(item.amount);
  const S = inflow ? SIDE.collect : SIDE.pay;
  const { data, loading, error, reload } = useAsync(async () => {
    const [accs, pays] = await Promise.all([api("/accounts"), api(`/payments?terms_id=${item.id}`)]);
    return { accs: accs.filter((a) => a.id !== item.party_id), pays };
  });
  const [f, setF] = useState({ date: today(), amount: String(due), account: "", note: "" }), [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const isCB = (a) => a.account_type === "asset" && /cash|bank/i.test(a.name);
  const groups = data && [["Cash and bank", data.accs.filter(isCB)], ["Other assets, such as furniture or goods taken in exchange", data.accs.filter((a) => !isCB(a) && a.account_type === "asset")], ["Other accounts", data.accs.filter((a) => !isCB(a) && a.account_type !== "asset")]];
  const account = f.account || (data && String((data.accs.find((a) => /cash/i.test(a.name)) || data.accs[0] || {}).id || ""));

  const total = num(item.total), paid = num(item.paid);
  const pct = total > 0 ? (paid / total) * 100 : 0;
  const half = (Math.round(due * 50) / 100).toFixed(2);

  async function save(e) {
    e.preventDefault();
    const amt = Number(f.amount);
    if (!(amt > 0) || amt > due + 0.005) return toast(`Enter an amount up to ${inr(due)}.`, true);
    setBusy(true);
    try {
      const r = await api("/payments", send("POST", { terms_id: item.id, amount: amt, date: f.date, account_id: Number(account), note: f.note.trim() || null }));
      toast(`${inflow ? "Received" : "Paid"} ${inr(amt)}. ${r.is_paid ? "Fully settled." : `Balance left ${inr(r.outstanding)}.`}`); onDone();
    } catch (er) { toast(er.message, true); setBusy(false); }
  }
  async function remove(id) {
    if (!confirm("Remove this payment? The balance due goes back up and its ledger entry is deleted.")) return;
    try { await api(`/payments/${id}`, { method: "DELETE" }); toast("Payment removed."); reload(); onDone(true); } catch (er) { toast(er.message, true); }
  }

  return (
    <Shell title={`${inflow ? "Receive payment from" : "Pay"} ${item.party_name}`} sub={`${item.invoice_no ? item.invoice_no + ", " : ""}due ${day(item.due_date)}`} onClose={onClose} busy={busy}>
      {/* Summary */}
      <div onMouseMove={glow} className={`rm-up group relative overflow-hidden rounded-2xl border bg-gradient-to-br to-white p-5 ${S.card}`} style={d(0)}>
        <span aria-hidden className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{ background: `radial-gradient(260px circle at var(--mx,50%) var(--my,0%), ${S.glow}, transparent 70%)` }} />
        <div className="relative">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className={`text-xs font-medium ${MUTED}`}>Balance due</p>
              <p className={`num mt-0.5 text-3xl font-semibold ${due > 0 ? S.text : "text-[#132622]/40"}`}><Ticker value={due} money /></p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${st(item.status).chip}`}>{label(item)}</span>
          </div>

          <div className="mt-4"><Progress pct={pct} className={S.bar} h="h-2" /></div>
          <div className="mt-2 flex justify-between text-xs">
            <span className={MUTED}>{inflow ? "Received" : "Paid"} <b className="num font-semibold text-[#132622]">{inr(paid)}</b></span>
            <span className={MUTED}>Bill total <b className="num font-semibold text-[#132622]">{inr(total)}</b></span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="mt-6 space-y-3">{[0, 1, 2].map((i) => <div key={i} className="rm-skel h-14 rounded-xl" />)}</div>
      ) : error ? (
        <p className="rm-up mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
      ) : (
        <>
          <form onSubmit={save} className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rm-up" style={d(1)}><Field label="Date"><Input type="date" required value={f.date} onChange={set("date")} /></Field></div>
            <div className="rm-up" style={d(2)}><Field label={`${inflow ? "Amount received" : "Amount paid"} (₹)`}><Input type="number" step="0.01" min="0.01" max={due} required value={f.amount} onChange={set("amount")} /></Field></div>

            <div className="rm-up sm:col-span-2" style={d(3)}>
              <Field label={inflow ? "Money received in (method)" : "Paid from (method)"}>
                <Select required value={account} onChange={set("account")}>{groups.map(([g, l]) => l.length > 0 && <optgroup key={g} label={g}>{l.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</optgroup>)}</Select>
              </Field>
            </div>

            <div className="rm-up sm:col-span-2" style={d(4)}>
              <Field label="Reference or note (optional)"><Input value={f.note} onChange={set("note")} placeholder="Cheque no., UPI reference, or what was taken in exchange" /></Field>
            </div>

            <div className="rm-up flex flex-wrap gap-2 sm:col-span-2" style={d(5)}>
              {[["Full balance " + inr(due), String(due)], ["Half", half]].map(([text, val]) => {
                const on = Number(f.amount) === Number(val);
                return (
                  <button key={text} type="button" onClick={() => setF({ ...f, amount: val })} className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition duration-200 hover:-translate-y-0.5 ${on ? "border-[#1F5D46] bg-[#1F5D46] text-white shadow-md shadow-[#1F5D46]/20" : "border-[#132622]/10 bg-white/70 text-[#132622]/70 hover:border-[#132622]/25"}`}>
                    {on && <Icon n="check" size={13} className="rm-pop" />}{text}
                  </button>
                );
              })}
            </div>

            <div className="rm-up flex gap-2.5 rounded-xl bg-[#132622]/[0.04] p-3.5 text-[13px] text-[#132622]/65 sm:col-span-2" style={d(6)}>
              <Icon n="info" size={16} className="mt-0.5 shrink-0 text-[#1F5D46]" />
              <p>For an exchange, choose the account of what you {inflow ? "received" : "gave"}, for example Furniture. The ledger entry is posted for you.</p>
            </div>

            <div className="rm-up flex flex-wrap gap-3 pt-1 sm:col-span-2" style={d(7)}>
              <Btn type="submit" className="rm-btn min-w-44" disabled={busy}>
                {busy ? <span className="inline-flex items-center gap-2"><span className="rm-spin h-4 w-4 rounded-full border-2 border-white/40 border-t-white" />Saving…</span> : inflow ? "Save received amount" : "Save payment"}
              </Btn>
              <Btn type="button" variant="line" onClick={onClose}>Cancel</Btn>
            </div>
          </form>

          {data.pays.length > 0 && (
            <div className="mt-8">
              <h3 className="rm-up mb-3 flex items-center gap-2 font-serif text-lg font-medium" style={d(8)}>
                Earlier payments on this bill
                <span className="rounded-full bg-[#132622]/[0.06] px-2 py-0.5 font-sans text-xs">{data.pays.length}</span>
              </h3>
              <ul className="space-y-2">
                {data.pays.map((p, i) => (
                  <li key={p.id} className="rm-up group flex items-center gap-3 rounded-xl border border-[#132622]/10 bg-[#132622]/[0.025] p-3 transition duration-200 hover:-translate-y-0.5 hover:border-[#132622]/25 hover:bg-white hover:shadow-md" style={d(i + 9)}>
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${S.soft}`}><Icon n={S.icon} size={16} /></span>
                    <div className="min-w-0 flex-1">
                      <p className="num font-semibold">{inr(p.amount)}</p>
                      <p className={`truncate text-xs ${MUTED}`}>{day(p.date)} · {p.account}{p.note ? `, ${p.note}` : ""}</p>
                    </div>
                    <Btn variant="danger" className="btn-sm" onClick={() => remove(p.id)}>Remove</Btn>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </Shell>
  );
}

// --------------------------------------------------
// Page pieces
// --------------------------------------------------

function Stat({ label: text, value, sub, i, bad, icon }) {
  const hot = bad && num(value) > 0;
  return (
    <div className={`rm-up group relative overflow-hidden rounded-2xl border p-4 transition duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#132622]/5 ${hot ? "border-rose-500/25 bg-gradient-to-br from-rose-50 to-white" : "border-[#132622]/10 bg-white/70"}`} style={d(i)}>
      <span aria-hidden className={`pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full blur-2xl transition-transform duration-500 group-hover:scale-150 ${hot ? "bg-rose-500/15" : "bg-[#1F5D46]/[0.07]"}`} />
      <div className="relative flex items-center gap-3">
        <span className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110 ${hot ? "bg-rose-500/10 text-rose-600" : "bg-[#1F5D46]/10 text-[#1F5D46]"}`}>
          <Icon n={icon} size={18} />
          {hot && <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5"><span aria-hidden className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-500/70" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-500" /></span>}
        </span>
        <div className="min-w-0">
          <p className={`text-xs font-medium ${MUTED}`}>{text}</p>
          <p className={`num truncate text-xl font-semibold ${hot ? "text-rose-700" : ""}`}><Ticker value={value} money /></p>
          {sub && <p className={`truncate text-[11px] ${MUTED}`}>{sub}</p>}
        </div>
      </div>
    </div>
  );
}

const GRID = "grid-cols-[auto_minmax(0,1fr)_auto] lg:grid-cols-[auto_minmax(0,1.3fr)_minmax(0,.8fr)_minmax(0,.9fr)_minmax(0,1fr)_minmax(0,.9fr)_auto]";

function Section({ title, kind, list, who, act, onPick, delay }) {
  const S = SIDE[kind];
  const outstanding = list.reduce((s, i) => s + num(i.amount), 0);

  return (
    <section className="rm-up mt-8" style={d(delay)}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2.5 font-serif text-xl font-medium">
          <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${S.soft}`}><Icon n={S.icon} size={16} /></span>
          {title}
          <span className="rounded-full bg-[#132622]/[0.06] px-2 py-0.5 font-sans text-xs">{list.length}</span>
        </h2>
        {list.length > 0 && <p className={`text-sm ${MUTED}`}>Outstanding <b className={`num font-semibold ${S.text}`}>{inr(outstanding)}</b></p>}
      </div>

      {list.length ? (
        <>
          <div className={`mb-2 hidden items-center gap-x-4 px-4 text-[11px] font-semibold uppercase tracking-wider text-[#132622]/40 lg:grid ${GRID}`}>
            <span className="w-11" /><span>{who}</span><span>Due date</span><span>Status</span><span>Settled</span><span className="text-right">Balance due</span><span className="w-[88px]" />
          </div>

          <ul className="space-y-2.5">
            {list.map((i, n) => {
              const total = num(i.total), paid = num(i.paid);
              const pct = total > 0 ? (paid / total) * 100 : 0;
              const s = st(i.status);
              return (
                <li key={i.id} style={d(n)} className={`rm-up group relative grid items-center gap-x-4 overflow-hidden rounded-2xl border border-[#132622]/10 bg-white/70 px-4 py-3.5 transition duration-300 hover:-translate-y-0.5 hover:border-[#1F5D46]/30 hover:bg-white hover:shadow-lg hover:shadow-[#132622]/5 ${GRID}`}>
                  <span aria-hidden className={`absolute inset-y-0 left-0 w-1 origin-top scale-y-[.35] transition-transform duration-300 group-hover:scale-y-100 ${s.bar}`} />

                  <span className={`flex h-11 w-11 items-center justify-center rounded-xl font-serif text-lg text-white shadow-sm transition-transform duration-300 group-hover:-rotate-3 group-hover:scale-110 ${tone(i.party_name)}`}>{i.party_name?.[0]?.toUpperCase() || "?"}</span>

                  <div className="min-w-0">
                    <p className="truncate font-semibold">{i.party_name}</p>
                    <p className={`truncate text-xs ${MUTED}`}>
                      {i.invoice_no ? <span className="num">{i.invoice_no}</span> : "No bill number"}
                      <span className="lg:hidden"> · due {day(i.due_date)}</span>
                    </p>
                    <span className={`mt-1.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold lg:hidden ${s.chip}`}><span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />{label(i)}</span>
                  </div>

                  <p className="hidden items-center gap-1.5 text-sm lg:flex"><Icon n="cal" size={14} className="text-[#132622]/40" />{day(i.due_date)}</p>

                  <div className="hidden lg:block">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${s.chip}`}><span className={`h-1.5 w-1.5 rounded-full ${s.dot} ${i.status === "overdue" ? "animate-pulse" : ""}`} />{label(i)}</span>
                  </div>

                  <div className="hidden lg:block">
                    <Progress pct={pct} className={S.bar} />
                    <p className={`num mt-1 text-[11px] ${MUTED}`}>{inr(paid)} of {inr(total)}</p>
                  </div>

                  <p className={`num text-right font-semibold ${S.text}`}>{inr(i.amount)}</p>

                  <div className="col-span-3 mt-3 lg:col-span-1 lg:mt-0">
                    <Btn className="rm-btn btn-sm w-full lg:w-[88px]" onClick={() => onPick(i)}>{act}</Btn>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      ) : (
        <div className="flex flex-col items-center rounded-3xl border border-dashed border-[#132622]/20 bg-white/50 px-6 py-10 text-center">
          <span className="rm-bob flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 ring-8 ring-emerald-500/5"><Icon n="check" size={26} /></span>
          <p className="mt-4 font-serif text-lg font-medium">All clear</p>
          <p className={`mt-0.5 text-sm ${MUTED}`}>Nothing here right now.</p>
        </div>
      )}
    </section>
  );
}

// --------------------------------------------------
// Page
// --------------------------------------------------

export default function Reminders() {
  const [days, setDays] = useState("7"), [item, setItem] = useState(null), [status, setStatus] = useState("");
  const { data, error, loading, reload } = useAsync(() => api(`/reminders?days=${days}`), [days]);

  const recv = data?.receivables || [];
  const pay = data?.payables || [];
  const pass = (i) => !status || i.status === status;
  const cnt = (s) => [...recv, ...pay].filter((i) => !s || i.status === s).length;
  const overdueOf = (l) => l.filter((i) => i.status === "overdue").length;

  const chips = [["", "All", "bg-[#132622]/40"], ["overdue", "Overdue", "bg-rose-500"], ["due_today", "Due today", "bg-amber-500"], ["due_soon", "Due soon", "bg-sky-500"]];

  return (
    <>
      <style>{CSS}</style>

      <PageHeader eyebrow="Follow up" title="Reminders">
        <div className="flex items-center gap-3">
          <span className={`hidden text-sm sm:inline ${MUTED}`}>Due within</span>
          <Choice label="Due within" value={days} onChange={setDays} options={[3, 7, 15, 30].map((x) => ({ v: String(x), label: `${x} days` }))} />
        </div>
      </PageHeader>

      {loading && !data ? (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="rm-skel h-[88px] rounded-2xl" style={d(i)} />)}</div>
          <div className="space-y-2.5 pt-4">{[0, 1, 2].map((i) => <div key={i} className="rm-skel h-[76px] rounded-2xl" style={d(i)} />)}</div>
        </div>
      ) : error ? (
        <div className="rm-up rounded-2xl bg-red-50 px-5 py-4 text-sm text-red-600">{error}</div>
      ) : data && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat i={0} icon="in" label="To collect" value={data.summary.to_collect} sub={`${recv.length} bill${recv.length === 1 ? "" : "s"}`} />
            <Stat i={1} icon="alert" label="Overdue to collect" value={data.summary.to_collect_overdue} bad sub={`${overdueOf(recv)} overdue`} />
            <Stat i={2} icon="out" label="To pay" value={data.summary.to_pay} sub={`${pay.length} bill${pay.length === 1 ? "" : "s"}`} />
            <Stat i={3} icon="clock" label="Overdue to pay" value={data.summary.to_pay_overdue} bad sub={`${overdueOf(pay)} overdue`} />
          </div>

          {/* Status filter */}
          <div className="rm-up mt-5 flex flex-wrap gap-2" style={d(4)} role="tablist" aria-label="Filter by status">
            {chips.map(([v, text, dot]) => {
              const on = status === v;
              return (
                <button key={v || "all"} type="button" role="tab" aria-selected={on} onClick={() => setStatus(v)} className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition duration-200 hover:-translate-y-0.5 ${on ? "border-[#1F5D46] bg-[#1F5D46] text-white shadow-md shadow-[#1F5D46]/20" : "border-[#132622]/10 bg-white/70 text-[#132622]/70 hover:border-[#132622]/25 hover:text-[#132622]"}`}>
                  <span className={`h-2 w-2 rounded-full transition-transform duration-300 ${dot} ${on ? "scale-125 ring-2 ring-white/60" : ""}`} />
                  {text}
                  <span className={`text-xs ${on ? "text-white/70" : "text-[#132622]/40"}`}>{cnt(v)}</span>
                </button>
              );
            })}
          </div>

          <Section key={`c-${status}-${days}`} delay={5} kind="collect" title="To collect from customers" who="Customer" act="Receive" list={recv.filter(pass)} onPick={setItem} />
          <Section key={`p-${status}-${days}`} delay={6} kind="pay" title="To pay to suppliers" who="Supplier" act="Pay" list={pay.filter(pass)} onPick={setItem} />
        </>
      )}

      {item && <PayModal key={item.id} item={item} onClose={() => setItem(null)} onDone={(keep) => { if (!keep) setItem(null); reload(); }} />}
    </>
  );
}