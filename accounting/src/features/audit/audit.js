"use client";
import { useEffect, useRef, useState } from "react";
import { Btn, Field, Input, PageHeader, Select, useToast } from "@/components/ui";
import { useUser } from "@/components/Session";
import { useAsync } from "@/hooks/useAsync";
import { api } from "@/lib/api";
import { inr } from "@/lib/format";
import EditEntryDialog, { canEdit } from "@/components/editentrydialog";

// Editing needs the exact saved copy ("raw") that the audit log keeps.
const editable = (a) => canEdit(a) && !!a.after?.raw;

const WORD = { create: "Created", update: "Edited", delete: "Deleted" };
const TYPE = { sales: "Sales", purchase: "Purchase", journal: "Journal", account: "Account", vendor: "Vendor", customer: "Customer" };
const ENTRY = new Set(["sales", "purchase", "journal"]);
const SKIP = new Set(["id", "lines", "attachments", "attachment_count", "journal_entry_id", "terms", "raw"]);
const blank = { entity_type: "", action: "", user: "", entry_id: "", q: "", date_from: "", date_to: "" };

const MUTED = "text-[#132622]/55";

// Static class names so Tailwind can see them.
const ACT = {
  create: { icon: "plus", dot: "bg-emerald-500", chip: "bg-emerald-50 text-emerald-700", soft: "bg-emerald-500/10 text-emerald-600", card: "border-emerald-600/25 from-emerald-50", glow: "rgba(5,150,105,.16)", bar: "bg-emerald-500" },
  update: { icon: "pen", dot: "bg-amber-500", chip: "bg-amber-50 text-amber-700", soft: "bg-amber-500/10 text-amber-600", card: "border-amber-600/25 from-amber-50", glow: "rgba(217,119,6,.16)", bar: "bg-amber-500" },
  delete: { icon: "trash", dot: "bg-rose-500", chip: "bg-rose-50 text-rose-700", soft: "bg-rose-500/10 text-rose-600", card: "border-rose-600/25 from-rose-50", glow: "rgba(225,29,72,.16)", bar: "bg-rose-500" },
};
const act = (a) => ACT[a] || ACT.update;

const PALETTE = ["bg-emerald-600", "bg-sky-600", "bg-violet-600", "bg-amber-600", "bg-rose-600", "bg-teal-600", "bg-indigo-600"];
const tone = (s = "") => PALETTE[[...String(s)].reduce((a, ch) => a + ch.charCodeAt(0), 0) % PALETTE.length];

const ICONS = {
  plus: "M12 5v14M5 12h14",
  pen: "M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4",
  trash: "M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3",
  undo: "M9 14L4 9l5-5M4 9h10a6 6 0 010 12h-3",
  search: "M21 21l-4.3-4.3M11 18a7 7 0 100-14 7 7 0 000 14z",
  x: "M6 6l12 12M18 6L6 18",
  filter: "M3 5h18l-7 8v6l-4 2v-8L3 5z",
  chevron: "M6 9l6 6 6-6",
  history: "M3 12a9 9 0 109-9 9 9 0 00-6.4 2.7L3 8M3 3v5h5M12 7v5l3 2",
  alert: "M12 9v4M12 17h.01M10.3 3.9L2.4 18a2 2 0 001.7 3h15.8a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z",
  info: "M12 8h.01M11 12h1v5h1M12 21a9 9 0 100-18 9 9 0 000 18z",
  arrow: "M5 12h14M13 6l6 6-6 6",
  clock: "M12 7v5l3 2M12 21a9 9 0 100-18 9 9 0 000 18z",
};

const Icon = ({ n, size = 16, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d={ICONS[n]} />
  </svg>
);

const CSS = `
@keyframes au-up{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
@keyframes au-fade{from{opacity:0}to{opacity:1}}
@keyframes au-rise{from{opacity:0;transform:translateY(24px) scale(.97)}to{opacity:1;transform:none}}
@keyframes au-pop{0%{opacity:.5;transform:scale(.94)}60%{transform:scale(1.025)}100%{opacity:1;transform:scale(1)}}
@keyframes au-float{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(18px,-12px) scale(1.12)}}
@keyframes au-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
@keyframes au-shimmer{from{background-position:200% 0}to{background-position:-200% 0}}
@keyframes au-sheen{from{transform:translateX(-120%)}to{transform:translateX(220%)}}
@keyframes au-spin{to{transform:rotate(360deg)}}
@keyframes au-line{from{transform:scaleY(0)}to{transform:scaleY(1)}}
.au-up{animation:au-up .5s cubic-bezier(.2,.8,.2,1) both}
.au-fade{animation:au-fade .25s ease both}
.au-rise{animation:au-rise .4s cubic-bezier(.2,.8,.2,1) both}
.au-pop{animation:au-pop .4s cubic-bezier(.2,.8,.2,1) both}
.au-float{animation:au-float 9s ease-in-out infinite}
.au-float2{animation:au-float 12s ease-in-out infinite reverse}
.au-bob{animation:au-bob 3.2s ease-in-out infinite}
.au-spin{animation:au-spin .7s linear infinite}
.au-line{transform-origin:top;animation:au-line .8s cubic-bezier(.2,.8,.2,1) both}
.au-skel{background:linear-gradient(100deg,rgba(19,38,34,.05) 30%,rgba(19,38,34,.11) 50%,rgba(19,38,34,.05) 70%);background-size:200% 100%;animation:au-shimmer 1.4s linear infinite}
.au-btn{position:relative;overflow:hidden}
.au-btn::after{content:"";position:absolute;inset:0;width:40%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.35),transparent);transform:translateX(-120%)}
.au-btn:hover::after{animation:au-sheen .8s ease}
details>summary{list-style:none}details>summary::-webkit-details-marker{display:none}
details[open] .au-chev{transform:rotate(180deg)}
@media (prefers-reduced-motion:reduce){.au-up,.au-fade,.au-rise,.au-pop,.au-float,.au-float2,.au-bob,.au-spin,.au-line,.au-skel{animation:none!important}.au-btn::after{display:none}}
`;

const d = (i) => ({ animationDelay: `${Math.min(i, 14) * 40}ms` });

const glow = (e) => {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
  e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
};

// --------------------------------------------------
// Helpers (same logic as before)
// --------------------------------------------------

const parse = (t) => new Date(t.endsWith("Z") ? t : t + "Z");
const when = (t) => parse(t).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
const timeOf = (t) => parse(t).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
const label = (k) => k.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
const rec = (a) => (ENTRY.has(a.entity_type) ? `#${a.entity_id}` : `${TYPE[a.entity_type]} #${a.entity_id}`);
const undoText = (a) => (a.action === "create" ? "Remove this entry" : a.action === "update" ? "Restore the earlier values" : "Bring this entry back");
function flat(o) {
  const f = {};
  for (const [k, v] of Object.entries(o || {})) if (!SKIP.has(k) && (typeof v !== "object" || (Array.isArray(v) && v.length))) f[k] = typeof v === "object" ? JSON.stringify(v) : v;
  for (const [k, v] of Object.entries((o || {}).terms || {})) f[`terms: ${k}`] = v;
  return f;
}
const linesOf = (o) => ((o && o.lines) || []).map((l) => `${l.account_name ?? l.account_id}: ${Number(l.debit) ? "Dr " + inr(l.debit) : "Cr " + inr(l.credit)}`);

function dayLabel(dt) {
  const now = new Date(), y = new Date();
  y.setDate(now.getDate() - 1);
  if (dt.toDateString() === now.toDateString()) return "Today";
  if (dt.toDateString() === y.toDateString()) return "Yesterday";
  return dt.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
}

// Animated number (counts from the previous value).
function Ticker({ value }) {
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

  return <>{Math.round(n)}</>;
}

// Progress bar that grows in from zero.
function Progress({ pct }) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setOn(true)));
    return () => cancelAnimationFrame(id);
  }, []);
  return (
    <span className="block h-1.5 overflow-hidden rounded-full bg-[#132622]/[0.08]">
      <span className="block h-full rounded-full bg-[#1F5D46] transition-[width] duration-[900ms] ease-[cubic-bezier(.2,.8,.2,1)]" style={{ width: on ? `${Math.max(0, Math.min(100, pct))}%` : "0%" }} />
    </span>
  );
}

// Sliding-pill choice group.
function Choice({ options, value, onChange, label: aria }) {
  const i = Math.max(0, options.findIndex((o) => o.v === value));
  return (
    <div role="radiogroup" aria-label={aria} className="relative grid rounded-2xl bg-[#132622]/[0.06] p-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0,1fr))` }}>
      <span aria-hidden className="absolute bottom-1 left-1 top-1 rounded-xl bg-white shadow-md ring-1 ring-black/5 transition-transform duration-500 ease-[cubic-bezier(.2,.9,.25,1.1)]" style={{ width: `calc((100% - 0.5rem) / ${options.length})`, transform: `translateX(${i * 100}%)` }} />
      {options.map((o) => (
        <button key={o.v} type="button" role="radio" aria-checked={value === o.v} onClick={() => onChange(o.v)} className={`relative z-10 flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 py-2 text-[13px] font-semibold transition-colors duration-300 ${value === o.v ? "text-[#1F5D46]" : "text-[#132622]/55 hover:text-[#132622]"}`}>
          {o.dot && <span className={`h-2 w-2 rounded-full ${o.dot}`} />}
          {o.label}
        </button>
      ))}
    </div>
  );
}

// --------------------------------------------------
// Popup shell
// --------------------------------------------------

function Shell({ title, sub, onClose, busy, noEsc, z = "z-[60]", max = "max-w-3xl", children }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && !busy && !noEsc && onClose();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [busy, noEsc, onClose]);

  return (
    <div className={`fixed inset-0 ${z} flex items-center justify-center p-3 sm:p-6`} role="dialog" aria-modal="true" aria-label={title}>
      <div className="au-fade absolute inset-0 bg-[#0b1714]/55 backdrop-blur-sm" onClick={() => !busy && onClose()} />

      <div className={`au-rise relative flex max-h-[92vh] w-full ${max} flex-col overflow-hidden rounded-3xl bg-[#FBFAF6] shadow-2xl ring-1 ring-black/5`}>
        <header className="relative shrink-0 overflow-hidden border-b border-[#132622]/10 px-6 py-5 sm:px-8">
          <span aria-hidden className="au-float pointer-events-none absolute -left-10 -top-16 h-40 w-40 rounded-full bg-emerald-400/20 blur-3xl" />
          <span aria-hidden className="au-float2 pointer-events-none absolute -right-8 -top-20 h-44 w-44 rounded-full bg-amber-300/25 blur-3xl" />

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
// Detail popup
// --------------------------------------------------

function Detail({ a, onClose, onUndo, onEdit, noEsc }) {
  const role = useUser().role, canChange = (x) => role !== "sales" && editable(x);   // editing a sale is for books roles only
  const b = flat(a.before), n = flat(a.after), keys = [...new Set([...Object.keys(b), ...Object.keys(n)])];
  const changed = keys.filter((k) => String(b[k] ?? "") !== String(n[k] ?? ""));
  const snap = a.action === "delete" ? b : n, snapObj = a.action === "delete" ? a.before : a.after;
  const lb = linesOf(a.before), la = linesOf(a.after);
  const A = act(a.action);

  const lineBox = (lines, cls) => (
    <div className={`rounded-xl p-3 font-mono text-[13px] leading-relaxed ${cls}`}>{lines.length ? lines.map((x) => <div key={x}>{x}</div>) : <span className="opacity-50">—</span>}</div>
  );

  return (
    <Shell title={`${WORD[a.action]} ${TYPE[a.entity_type]} ${rec(a)}`} sub={`By ${a.user} on ${when(a.at)}`} onClose={onClose} noEsc={noEsc}>
      {/* Hero */}
      <div onMouseMove={glow} className={`au-up group relative overflow-hidden rounded-2xl border bg-gradient-to-br to-white p-5 ${A.card}`} style={d(0)}>
        <span aria-hidden className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{ background: `radial-gradient(260px circle at var(--mx,50%) var(--my,0%), ${A.glow}, transparent 70%)` }} />
        <div className="relative flex items-center gap-4">
          <span className={`au-pop flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-black/5 ${A.soft}`}><Icon n={A.icon} size={22} /></span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-serif text-lg font-medium">{a.summary || `${WORD[a.action]} ${TYPE[a.entity_type]}`}</p>
            <p className={`mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs ${MUTED}`}>
              <span className="inline-flex items-center gap-1.5"><span className={`flex h-5 w-5 items-center justify-center rounded-md text-[10px] font-bold text-white ${tone(a.user)}`}>{a.user?.[0]?.toUpperCase() || "?"}</span>{a.user}</span>
              <span className="inline-flex items-center gap-1"><Icon n="clock" size={12} />{when(a.at)}</span>
            </p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${A.chip}`}>{WORD[a.action]}</span>
        </div>
      </div>

      {a.reason && (
        <div className="au-up mt-4 flex gap-3 rounded-xl border-l-[3px] border-[#B9852F] bg-[#B9852F]/10 px-4 py-3 text-[14px]" style={d(1)}>
          <Icon n="info" size={16} className="mt-0.5 shrink-0 text-[#B9852F]" />
          <p><b>Reason:</b> {a.reason}</p>
        </div>
      )}

      {a.action === "update" ? (
        <>
          <h3 className="au-up mb-3 mt-6 flex items-center gap-2 font-serif text-lg font-medium" style={d(2)}>
            What changed
            {changed.length > 0 && <span className="rounded-full bg-[#132622]/[0.06] px-2 py-0.5 font-sans text-xs">{changed.length}</span>}
          </h3>

          {changed.length ? (
            <ul className="space-y-2.5">
              {changed.map((k, i) => (
                <li key={k} className="au-up rounded-xl border border-[#132622]/10 bg-white/70 p-3.5 transition duration-200 hover:-translate-y-0.5 hover:border-[#132622]/25 hover:shadow-md" style={d(i + 3)}>
                  <p className={`mb-2 text-xs font-semibold uppercase tracking-wider ${MUTED}`}>{label(k)}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="break-all rounded-lg bg-rose-50 px-3 py-1.5 text-sm text-rose-800 line-through decoration-rose-300">{String(b[k] ?? "") || "—"}</span>
                    <Icon n="arrow" size={16} className="shrink-0 text-[#132622]/35" />
                    <span className="break-all rounded-lg bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-800">{String(n[k] ?? "") || "—"}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : <p className={`au-up ${MUTED}`} style={d(3)}>No visible field values changed.</p>}

          {JSON.stringify(lb) !== JSON.stringify(la) && (
            <div className="au-up mt-6" style={d(6)}>
              <h3 className="mb-3 font-serif text-lg font-medium">Journal lines changed</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div><p className="mb-1.5 text-xs font-semibold text-rose-600">Before</p>{lineBox(lb, "bg-rose-50 text-rose-900")}</div>
                <div><p className="mb-1.5 text-xs font-semibold text-emerald-600">After</p>{lineBox(la, "bg-emerald-50 text-emerald-900")}</div>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          <h3 className="au-up mb-3 mt-6 font-serif text-lg font-medium" style={d(2)}>{a.action === "delete" ? "Record before it was deleted" : "Record as created"}</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {Object.entries(snap).map(([k, v], i) => (
              <div key={k} className="au-up rounded-xl border border-[#132622]/10 bg-[#132622]/[0.025] p-3 transition duration-200 hover:-translate-y-0.5 hover:border-[#132622]/25 hover:bg-white hover:shadow-md" style={d(i + 3)}>
                <p className={`text-xs ${MUTED}`}>{label(k)}</p>
                <p className="mt-1 break-all font-medium">{String(v) || "—"}</p>
              </div>
            ))}
          </div>

          {linesOf(snapObj).length > 0 && (
            <div className="au-up mt-6" style={d(8)}>
              <h3 className="mb-3 font-serif text-lg font-medium">Journal lines</h3>
              {lineBox(linesOf(snapObj), "bg-[#132622]/[0.04]")}
            </div>
          )}
        </>
      )}

      <details className="au-up group/d mt-6 rounded-xl border border-[#132622]/10 bg-white/60 text-[13px]" style={d(9)}>
        <summary className="flex cursor-pointer items-center justify-between px-4 py-3 font-medium text-[#132622]/70 hover:text-[#132622]">
          Raw record
          <Icon n="chevron" size={16} className="au-chev transition-transform duration-300" />
        </summary>
        <pre className="mx-3 mb-3 max-h-64 overflow-auto rounded-lg bg-[#0B1C18] p-3 text-xs leading-relaxed text-[#F6F3EA]/85">{JSON.stringify({ before: a.before, after: a.after }, null, 2)}</pre>
      </details>

      <div className="au-up mt-6 flex flex-wrap items-center gap-3 border-t border-[#132622]/10 pt-5" style={d(10)}>
        {canChange(a) && (
          <Btn className="au-btn" onClick={onEdit}><span className="inline-flex items-center gap-2"><Icon n="pen" size={15} />Edit this entry</span></Btn>
        )}
        {a.can_undo ? (
          <Btn variant={canChange(a) ? "line" : undefined} className="au-btn" onClick={onUndo}><span className="inline-flex items-center gap-2"><Icon n="undo" size={15} />Undo: {undoText(a).toLowerCase()}</span></Btn>
        ) : (
          <span className="inline-flex items-center gap-2 text-[13px] text-[#132622]/55"><Icon n="info" size={15} />Only the newest action on a record can be edited or undone.</span>
        )}
        <Btn variant="line" onClick={onClose}>Close</Btn>
      </div>
    </Shell>
  );
}

// --------------------------------------------------
// Undo confirmation
// --------------------------------------------------

function UndoDialog({ a, busy, onConfirm, onClose }) {
  return (
    <Shell title={`Undo: ${undoText(a).toLowerCase()}`} onClose={onClose} busy={busy} z="z-[70]" max="max-w-md">
      <div className="flex items-start gap-4">
        <span className="au-pop flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600 ring-8 ring-rose-500/5"><Icon n="alert" size={22} /></span>
        <p className="au-up text-sm leading-relaxed text-[#132622]/70" style={d(1)}>
          {WORD[a.action]} {TYPE[a.entity_type]} {rec(a)}. The undo is saved in the audit log and can itself be undone.
        </p>
      </div>
      <div className="au-up mt-6 flex flex-wrap gap-3" style={d(2)}>
        <Btn variant="danger" className="au-btn min-w-36" disabled={busy} onClick={onConfirm}>
          {busy ? <span className="inline-flex items-center gap-2"><span className="au-spin h-4 w-4 rounded-full border-2 border-white/40 border-t-white" />Undoing…</span> : "Yes, undo it"}
        </Btn>
        <Btn variant="line" disabled={busy} onClick={onClose}>Cancel</Btn>
      </div>
    </Shell>
  );
}

// --------------------------------------------------
// Page pieces
// --------------------------------------------------

function Stat({ icon, text, value, sub, i, accent = "bg-[#1F5D46]/10 text-[#1F5D46]" }) {
  return (
    <div className="au-up group relative overflow-hidden rounded-2xl border border-[#132622]/10 bg-white/70 p-4 transition duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#132622]/5" style={d(i)}>
      <span aria-hidden className="pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full bg-[#1F5D46]/[0.07] blur-2xl transition-transform duration-500 group-hover:scale-150" />
      <div className="relative flex items-center gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110 ${accent}`}><Icon n={icon} size={18} /></span>
        <div className="min-w-0">
          <p className={`text-xs font-medium ${MUTED}`}>{text}</p>
          <p className="num !text-left text-xl font-semibold"><Ticker value={value} /></p>
          {sub && <p className={`truncate text-[11px] ${MUTED}`}>{sub}</p>}
        </div>
      </div>
    </div>
  );
}

// --------------------------------------------------
// Page
// --------------------------------------------------

export default function Audit() {
  const toast = useToast(), role = useUser().role, canChange = (x) => role !== "sales" && editable(x);
  const [f, setF] = useState(blank), [applied, setApplied] = useState(blank), [limit, setLimit] = useState(50), [open, setOpen] = useState(null), [undo, setUndo] = useState(null), [undoBusy, setUndoBusy] = useState(false), [adv, setAdv] = useState(false), [edit, setEdit] = useState(null);
  const logs = useAsync(() => {
    const q = new URLSearchParams({ limit, offset: 0 });
    Object.entries(applied).forEach(([k, v]) => v && q.set(k, v));
    return api(`/audit-logs?${q}`);
  }, [applied, limit]);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const quick = (action) => { const n = { ...f, action }; setF(n); setApplied(n); setLimit(50); };
  const items = (logs.data?.items || []).filter((item) => item && item.id != null);

  async function doUndo() {
    if (!undo?.id) {
      toast("Cannot undo: audit record not found.", true);
      return;
    }

    setUndoBusy(true);
    try {
      const r = await api(`/audit-logs/${undo.id}/undo`, { method: "POST" });

      toast(r.message || "Undone.");
      setUndo(null);
      setOpen(null);
      logs.reload();
    } catch (error) {
      toast(error.message || "Undo failed.", true);
    }
    setUndoBusy(false);
  }

  const clearAll = () => { setF(blank); setApplied(blank); setLimit(50); };
  const removeFilter = (k) => { const n = { ...applied, [k]: "" }; setApplied(n); setF((s) => ({ ...s, [k]: "" })); setLimit(50); };

  const FL = { entity_type: (v) => `Type: ${TYPE[v] || v}`, user: (v) => `User: ${v}`, entry_id: (v) => `Entry #${v}`, q: (v) => `Search: ${v}`, date_from: (v) => `From ${v}`, date_to: (v) => `To ${v}` };
  const chips = Object.entries(applied).filter(([k, v]) => v && FL[k]);
  const advCount = ["entity_type", "user", "entry_id", "date_from", "date_to"].filter((k) => applied[k]).length;

  const cnt = (x) => items.filter((i) => i.action === x).length;

  // Group rows by day
  const groups = [];
  items.forEach((a) => {
    const dt = parse(a.at), key = dt.toDateString();
    let g = groups[groups.length - 1];
    if (!g || g.key !== key) { g = { key, label: dayLabel(dt), list: [] }; groups.push(g); }
    g.list.push(a);
  });
  let n = 0;

  const total = logs.data?.total || 0;

  return (
    <>
      <style>{CSS}</style>

      <PageHeader eyebrow="Control" title="Audit log" />
      <p className="au-up -mt-5 mb-6 max-w-2xl text-[#132622]/65">Every entry that was created, edited or deleted, with who did it, when and why. Open a row to see exactly what changed, and undo it if it was a mistake.</p>

      {/* Stats */}
      {logs.data && !logs.error && (
        <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat i={0} icon="history" text="Matching records" value={total} sub={`${items.length} loaded`} />
          <Stat i={1} icon="plus" text="Created" value={cnt("create")} sub="In loaded rows" accent="bg-emerald-500/10 text-emerald-600" />
          <Stat i={2} icon="pen" text="Edited" value={cnt("update")} sub="In loaded rows" accent="bg-amber-500/10 text-amber-600" />
          <Stat i={3} icon="trash" text="Deleted" value={cnt("delete")} sub="In loaded rows" accent="bg-rose-500/10 text-rose-600" />
        </div>
      )}

      {/* Filters */}
      <form onSubmit={(e) => { e.preventDefault(); setApplied(f); setLimit(50); }} className="au-up mb-5 rounded-2xl border border-[#132622]/10 bg-white/70 p-4" style={d(2)}>
        <div className="flex flex-wrap items-center gap-3">
          <Choice label="Action" value={f.action} onChange={quick} options={[{ v: "", label: "All actions" }, { v: "create", label: "Created", dot: "bg-emerald-500" }, { v: "update", label: "Edited", dot: "bg-amber-500" }, { v: "delete", label: "Deleted", dot: "bg-rose-500" }]} />

          <label className="group flex min-w-[200px] flex-1 items-center gap-2 rounded-2xl bg-white px-3.5 py-2.5 ring-1 ring-[#132622]/10 transition focus-within:ring-2 focus-within:ring-[#1F5D46]/40">
            <Icon n="search" size={16} className="text-[#132622]/40 transition-colors group-focus-within:text-[#1F5D46]" />
            <input value={f.q} onChange={set("q")} placeholder="Search party or reference" aria-label="Search" className="w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-[#132622]/35" />
            {f.q && <button type="button" aria-label="Clear search" onClick={() => setF({ ...f, q: "" })} className="au-pop rounded-md p-0.5 text-[#132622]/40 hover:bg-[#132622]/[0.06] hover:text-[#132622]"><Icon n="x" size={14} /></button>}
          </label>

          <button type="button" aria-expanded={adv} onClick={() => setAdv((x) => !x)} className={`inline-flex items-center gap-2 rounded-2xl border px-3.5 py-2.5 text-sm font-medium transition duration-200 hover:-translate-y-0.5 ${adv ? "border-[#1F5D46]/40 bg-[#1F5D46]/10 text-[#1F5D46]" : "border-[#132622]/10 bg-white text-[#132622]/70 hover:border-[#132622]/25"}`}>
            <Icon n="filter" size={15} />
            Filters
            {advCount > 0 && <span className="au-pop flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#1F5D46] px-1.5 text-[11px] font-bold text-white">{advCount}</span>}
            <Icon n="chevron" size={14} className={`transition-transform duration-300 ${adv ? "rotate-180" : ""}`} />
          </button>
        </div>

        {/* Advanced filters */}
        <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${adv ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
          <div className="overflow-hidden">
            <div className={`grid gap-4 pt-4 transition-opacity duration-300 sm:grid-cols-2 lg:grid-cols-5 ${adv ? "opacity-100" : "opacity-0"}`}>
              <Field label="Type"><Select value={f.entity_type} onChange={set("entity_type")}><option value="">All</option>{Object.entries(TYPE).filter(([v]) => role !== "sales" || v === "sales").map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></Field>
              <Field label="User"><Input value={f.user} onChange={set("user")} placeholder="Name" /></Field>
              <Field label="Entry no."><Input type="number" min="1" value={f.entry_id} onChange={set("entry_id")} placeholder="e.g. 12" /></Field>
              <Field label="From"><Input type="date" value={f.date_from} onChange={set("date_from")} /></Field>
              <Field label="To"><Input type="date" value={f.date_to} onChange={set("date_to")} /></Field>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Btn type="submit" className="au-btn">Apply</Btn>
          <Btn type="button" variant="line" onClick={clearAll}>Clear</Btn>

          {chips.map(([k, v]) => (
            <span key={k} className="au-pop inline-flex items-center gap-1.5 rounded-full bg-[#1F5D46]/10 py-1 pl-3 pr-1.5 text-xs font-medium text-[#1F5D46]">
              {FL[k](v)}
              <button type="button" aria-label={`Remove filter ${k}`} onClick={() => removeFilter(k)} className="flex h-5 w-5 items-center justify-center rounded-full transition hover:bg-[#1F5D46]/15"><Icon n="x" size={12} /></button>
            </span>
          ))}
        </div>
      </form>

      {/* Timeline */}
      {logs.loading && !logs.data ? (
        <div className="space-y-2.5">{[0, 1, 2, 3, 4].map((i) => <div key={i} className="au-skel h-[84px] rounded-2xl" style={d(i)} />)}</div>
      ) : logs.error ? (
        <div className="au-up rounded-2xl bg-red-50 px-5 py-4 text-sm text-red-600">{logs.error}. Check that audit_logs is included in main.py.</div>
      ) : items.length ? (
        <>
          <div className="space-y-8">
            {groups.map((g) => (
              <section key={g.key}>
                <h3 className="au-up mb-3 flex items-center gap-2.5 text-sm font-semibold text-[#132622]/70" style={d(n)}>
                  <span className="h-px w-5 bg-[#132622]/20" />
                  {g.label}
                  <span className="rounded-full bg-[#132622]/[0.06] px-2 py-0.5 text-xs font-medium">{g.list.length}</span>
                </h3>

                <div className="relative ml-3 pl-7 sm:ml-4">
                  <span aria-hidden className="au-line absolute bottom-3 left-0 top-3 w-0.5 rounded-full bg-gradient-to-b from-[#132622]/15 to-[#132622]/5" />

                  <ul className="space-y-2.5">
                    {g.list.map((a) => {
                      const A = act(a.action);
                      const isUndo = (a.reason || "").startsWith("Undo of audit");
                      const idx = n++;
                      return (
                        <li
                          key={a.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => setOpen(a)}
                          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setOpen(a))}
                          title="Click to view details"
                          style={d(idx)}
                          className="au-up group relative cursor-pointer overflow-hidden rounded-2xl border border-[#132622]/10 bg-white/70 px-4 py-3.5 outline-none transition duration-300 hover:-translate-y-0.5 hover:border-[#1F5D46]/30 hover:bg-white hover:shadow-lg hover:shadow-[#132622]/5 focus-visible:ring-2 focus-visible:ring-[#1F5D46]/50"
                        >
                          {/* timeline dot */}
                          <span aria-hidden className={`absolute -left-[34px] top-5 h-3 w-3 rounded-full ring-4 ring-[#FBFAF6] transition-transform duration-300 group-hover:scale-125 ${A.dot}`} />
                          <span aria-hidden className={`absolute inset-y-0 left-0 w-1 origin-top scale-y-0 transition-transform duration-300 group-hover:scale-y-100 ${A.bar}`} />

                          <div className="flex flex-wrap items-start gap-x-4 gap-y-3 sm:flex-nowrap sm:items-center">
                            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110 ${A.soft}`}><Icon n={A.icon} size={19} /></span>

                            <div className="min-w-0 flex-1">
                              <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-semibold">
                                <span>{WORD[a.action]} {TYPE[a.entity_type]}</span>
                                <span className="num rounded-md bg-[#132622]/[0.06] px-1.5 py-0.5 text-xs font-semibold">{rec(a)}</span>
                                {isUndo && <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-700"><Icon n="undo" size={11} />Undo</span>}
                              </p>
                              {a.summary && <p className="mt-0.5 truncate text-sm text-[#132622]/75">{a.summary}</p>}
                              {a.reason && <p className={`mt-0.5 truncate text-xs italic ${MUTED}`}>“{a.reason}”</p>}
                            </div>

                            <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-end">
                              <div className="flex items-center gap-2.5 text-right">
                                <div className="hidden sm:block">
                                  <p className="text-sm font-medium">{a.user}</p>
                                  <p className={`num text-xs ${MUTED}`}>{timeOf(a.at)}</p>
                                </div>
                                <span className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold text-white ${tone(a.user)}`}>{a.user?.[0]?.toUpperCase() || "?"}</span>
                                <p className={`num text-xs sm:hidden ${MUTED}`}>{a.user} · {timeOf(a.at)}</p>
                              </div>

                              {(canChange(a) || a.can_undo) && (
                                <div className="flex gap-2">
                                  {canChange(a) && (
                                    <Btn className="btn-sm" onClick={(e) => { e.stopPropagation(); setEdit(a); }}>
                                      <span className="inline-flex items-center gap-1.5"><Icon n="pen" size={13} />Edit</span>
                                    </Btn>
                                  )}
                                  {a.can_undo && (
                                    <Btn variant="line" className="btn-sm" onClick={(e) => { e.stopPropagation(); setUndo(a); }}>
                                      <span className="inline-flex items-center gap-1.5"><Icon n="undo" size={13} />Undo</span>
                                    </Btn>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </section>
            ))}
          </div>

          <div className="au-up mx-auto mt-8 flex max-w-sm flex-col items-center gap-3 text-center text-[14px] text-[#132622]/60">
            <p>Showing <b className="num text-[#132622]">{items.length}</b> of <b className="num text-[#132622]">{total}</b></p>
            <div className="w-full"><Progress pct={total ? (items.length / total) * 100 : 100} /></div>
            {items.length < total && (
              <Btn variant="line" className="btn-sm" disabled={logs.loading} onClick={() => setLimit((x) => x + 50)}>
                {logs.loading ? <span className="inline-flex items-center gap-2"><span className="au-spin h-3.5 w-3.5 rounded-full border-2 border-[#132622]/20 border-t-[#1F5D46]" />Loading…</span> : "Load more"}
              </Btn>
            )}
          </div>
        </>
      ) : (
        <div className="au-up flex flex-col items-center rounded-3xl border border-dashed border-[#132622]/20 bg-white/50 px-6 py-14 text-center">
          <span className="au-bob flex h-16 w-16 items-center justify-center rounded-2xl bg-[#1F5D46]/10 text-[#1F5D46] ring-8 ring-[#1F5D46]/5"><Icon n="search" size={28} /></span>
          <p className="mt-5 font-serif text-xl font-medium">No audit records match</p>
          <p className={`mt-1 max-w-xs text-sm ${MUTED}`}>Try a different filter, or clear them to see everything.</p>
          {(chips.length > 0 || applied.action) && <div className="mt-5"><Btn variant="line" onClick={clearAll}>Clear filters</Btn></div>}
        </div>
      )}

      {open && <Detail key={open.id} a={open} noEsc={!!undo || !!edit} onClose={() => setOpen(null)} onUndo={() => setUndo(open)} onEdit={() => setEdit(open)} />}
      {edit && <EditEntryDialog key={edit.id} a={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); setOpen(null); logs.reload(); }} />}
      {undo && <UndoDialog a={undo} busy={undoBusy} onConfirm={doUndo} onClose={() => setUndo(null)} />}
    </>
  );
}