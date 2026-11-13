"use client";
import { useEffect, useRef, useState } from "react";
import { Btn, Field, Input, Select, useToast } from "@/components/ui";
import { useAsync } from "@/hooks/useAsync";
import { api, send } from "@/lib/api";
import { diffDays, inr } from "@/lib/format";

const KIND = {
  sales: { party: "Customer", type: "customer", field: "customer_id", path: "/sales-entries", ref: "Invoice no." },
  purchase: { party: "Supplier", type: "supplier", field: "supplier_id", path: "/purchase-entries", ref: "Supplier bill no." },
};
const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const day10 = (v) => String(v ?? "").slice(0, 10);

// An audit row can be edited when it is the newest action on a sales, purchase or journal entry that still exists
// and it carries the exact saved copy (`raw`) needed to fill the form.
export const canEdit = (a) => ["sales", "purchase", "journal"].includes(a.entity_type) && a.action !== "delete" && !!a.can_undo && !!a.after && !!a.after.raw;

const MUTED = "text-[#132622]/55";

const ICONS = {
  x: "M6 6l12 12M18 6L6 18",
  plus: "M12 5v14M5 12h14",
  check: "M5 12.5l4.5 4.5L19 7.5",
  alert: "M12 9v4M12 17h.01M10.3 3.9L2.4 18a2 2 0 001.7 3h15.8a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z",
  pen: "M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4",
  info: "M12 8h.01M11 12h1v5h1M12 21a9 9 0 100-18 9 9 0 000 18z",
};

const Icon = ({ n, size = 16, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d={ICONS[n]} />
  </svg>
);

const CSS = `
@keyframes ed-up{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
@keyframes ed-fade{from{opacity:0}to{opacity:1}}
@keyframes ed-rise{from{opacity:0;transform:translateY(24px) scale(.97)}to{opacity:1;transform:none}}
@keyframes ed-pop{0%{opacity:.5;transform:scale(.94)}60%{transform:scale(1.025)}100%{opacity:1;transform:scale(1)}}
@keyframes ed-float{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(18px,-12px) scale(1.12)}}
@keyframes ed-sheen{from{transform:translateX(-120%)}to{transform:translateX(220%)}}
@keyframes ed-spin{to{transform:rotate(360deg)}}
@keyframes ed-shake{10%,90%{transform:translateX(-1px)}20%,80%{transform:translateX(2px)}30%,50%,70%{transform:translateX(-5px)}40%,60%{transform:translateX(5px)}}
.ed-up{animation:ed-up .45s cubic-bezier(.2,.8,.2,1) both}
.ed-fade{animation:ed-fade .25s ease both}
.ed-rise{animation:ed-rise .4s cubic-bezier(.2,.8,.2,1) both}
.ed-pop{animation:ed-pop .4s cubic-bezier(.2,.8,.2,1) both}
.ed-float{animation:ed-float 9s ease-in-out infinite}
.ed-float2{animation:ed-float 12s ease-in-out infinite reverse}
.ed-spin{animation:ed-spin .7s linear infinite}
.ed-shake{animation:ed-shake .45s ease}
.ed-btn{position:relative;overflow:hidden}
.ed-btn::after{content:"";position:absolute;inset:0;width:40%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.35),transparent);transform:translateX(-120%)}
.ed-btn:hover::after{animation:ed-sheen .8s ease}
@media (prefers-reduced-motion:reduce){.ed-up,.ed-fade,.ed-rise,.ed-pop,.ed-float,.ed-float2,.ed-spin,.ed-shake{animation:none!important}.ed-btn::after{display:none}}
`;

const d = (i) => ({ animationDelay: `${Math.min(i, 12) * 40}ms` });

// Animated money (counts from the previous value).
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
      const p = Math.min(1, (t - t0) / 500);
      setN(from + (to - from) * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick); else prev.current = to;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return <>{inr(n)}</>;
}

// Sliding-pill choice group.
function Choice({ options, value, onChange, label }) {
  const i = Math.max(0, options.findIndex((o) => o.v === value));
  return (
    <div role="radiogroup" aria-label={label} className="relative grid rounded-2xl bg-[#132622]/[0.06] p-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0,1fr))` }}>
      <span aria-hidden className="absolute bottom-1 left-1 top-1 rounded-xl bg-white shadow-md ring-1 ring-black/5 transition-transform duration-500 ease-[cubic-bezier(.2,.9,.25,1.1)]" style={{ width: `calc((100% - 0.5rem) / ${options.length})`, transform: `translateX(${i * 100}%)` }} />
      {options.map((o) => (
        <button key={o.v} type="button" role="radio" aria-checked={value === o.v} onClick={() => onChange(o.v)} className={`relative z-10 whitespace-nowrap rounded-xl px-2.5 py-2 text-[13px] font-semibold transition-colors duration-300 ${value === o.v ? "text-[#1F5D46]" : "text-[#132622]/55 hover:text-[#132622]"}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Shell({ title, sub, onClose, busy, children }) {
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
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-6" role="dialog" aria-modal="true" aria-label={title}>
      <style>{CSS}</style>
      <div className="ed-fade absolute inset-0 bg-[#0b1714]/55 backdrop-blur-sm" onClick={() => !busy && onClose()} />

      <div className="ed-rise relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-[#FBFAF6] shadow-2xl ring-1 ring-black/5">
        <header className="relative shrink-0 overflow-hidden border-b border-[#132622]/10 px-6 py-5 sm:px-8">
          <span aria-hidden className="ed-float pointer-events-none absolute -left-10 -top-16 h-40 w-40 rounded-full bg-emerald-400/20 blur-3xl" />
          <span aria-hidden className="ed-float2 pointer-events-none absolute -right-8 -top-20 h-44 w-44 rounded-full bg-amber-300/25 blur-3xl" />

          <div className="relative flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="truncate font-serif text-2xl font-medium">{title}</h2>
              {sub && <p className={`mt-0.5 text-sm ${MUTED}`}>{sub}</p>}
            </div>

            <button type="button" aria-label="Close" onClick={onClose} disabled={busy} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[#132622]/45 transition hover:rotate-90 hover:bg-[#132622]/[0.06] hover:text-[#132622]">
              <Icon n="x" size={18} />
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6 sm:px-8">{children}</div>
      </div>
    </div>
  );
}

const Err = ({ children }) =>
  children ? (
    <div role="alert" className="ed-up flex items-start gap-2.5 rounded-xl bg-red-50 px-4 py-3 text-sm text-[#B3261E]">
      <Icon n="alert" size={16} className="mt-0.5 shrink-0" />
      <span>{children}</span>
    </div>
  ) : null;

const Heading = ({ children, i }) => (
  <p className="ed-up -mb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[#1F5D46]" style={d(i)}>{children}</p>
);

// The reason box (required) – stands out so it isn't skipped.
const Reason = ({ value, onChange, placeholder, i }) => (
  <div className="ed-up rounded-xl border border-[#B9852F]/40 bg-[#B9852F]/[0.07] p-4" style={d(i)}>
    <Field label="Reason for the change (required)">
      <Input value={value} onChange={onChange} placeholder={placeholder} />
    </Field>
    <p className={`mt-1.5 flex items-center gap-1.5 text-xs ${MUTED}`}><Icon n="info" size={12} />Saved in the audit log with the old and new values.</p>
  </div>
);

function Actions({ busy, onClose, i }) {
  return (
    <div className="ed-up flex flex-wrap gap-3 pt-1" style={d(i)}>
      <Btn type="submit" className="ed-btn min-w-40" disabled={busy}>
        {busy ? <span className="inline-flex items-center gap-2"><span className="ed-spin h-4 w-4 rounded-full border-2 border-white/40 border-t-white" />Saving…</span> : "Save changes"}
      </Btn>
      <Btn type="button" variant="line" disabled={busy} onClick={onClose}>Cancel</Btn>
    </div>
  );
}

// --------------------------------------------------
// Sales / purchase entry
// --------------------------------------------------

function PartyForm({ a, onClose, onSaved }) {
  const K = KIND[a.entity_type], toast = useToast(), s = a.after, F = s.raw?.fields || {}, T = s.raw?.terms || s.terms || {};
  const parties = useAsync(() => api(`/accounts?party_type=${K.type}`), []);
  const [orig] = useState(() => ({
    date: day10(F.date ?? s.date), party: String(F.party_id ?? ""), invoice: F.invoice_no ?? s.invoice_no ?? "",
    taxable: String(F.taxable_amount ?? s.taxable_amount ?? ""), rate: String(Number(F.gst_rate ?? 18)),
    mode: T.payment_mode || "credit", due: day10(T.due_date ?? F.date ?? s.date), narration: F.narration ?? s.narration ?? "", reason: "",
  }));
  const [f, setF] = useState(orig);
  const [err, setErr] = useState(""), [busy, setBusy] = useState(false), [shake, setShake] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const list = Array.isArray(parties.data) ? parties.data : [];
  const nameMatch = String(list.find((p) => p.name === s.party_name)?.id || "");
  const party = f.party || nameMatch;
  const baseParty = orig.party || nameMatch;
  const rates = [...new Set([0, 5, 12, 18, 28, Number(f.rate)])].sort((x, y) => x - y);
  const gst = r2((Number(f.taxable) || 0) * (Number(f.rate) || 0) / 100), total = r2((Number(f.taxable) || 0) + gst);

  const changes = [
    ["Date", f.date !== orig.date], [K.party, party !== baseParty], [K.ref, f.invoice !== orig.invoice],
    ["Taxable amount", Number(f.taxable) !== Number(orig.taxable)], ["GST rate", String(f.rate) !== String(orig.rate)],
    ["Payment", f.mode !== orig.mode], ["Due date", f.mode === "credit" && f.due !== orig.due], ["Narration", f.narration !== orig.narration],
  ].filter(([, c]) => c).map(([n]) => n);

  function fail(m) {
    setErr(m); setShake(true); setTimeout(() => setShake(false), 500);
  }

  async function save(e) {
    e.preventDefault(); setErr("");
    if (!party) return fail(`Choose the ${K.party.toLowerCase()}.`);
    if (f.reason.trim().length < 3) return fail("Please write a reason of at least 3 characters.");
    if (f.mode === "credit" && diffDays(f.date, f.due) < 0) return fail("The due date can’t be before the entry date.");
    const fd = new FormData();
    fd.append("entry_date", f.date); fd.append(K.field, party); fd.append("taxable_amount", f.taxable); fd.append("gst_rate", f.rate);
    fd.append("payment_mode", f.mode); fd.append("invoice_no", f.invoice.trim()); fd.append("narration", f.narration.trim()); fd.append("reason", f.reason.trim());
    if (f.mode === "credit") { fd.append("due_date", f.due); fd.append("credit_days", Math.max(0, diffDays(f.date, f.due))); }
    setBusy(true);
    try { await api(`${K.path}/${a.entity_id}`, { method: "PUT", body: fd }); toast(`Entry #${a.entity_id} updated.`); onSaved(); }
    catch (er) { fail(er.message); setBusy(false); }
  }

  return (
    <form onSubmit={save} className={`grid gap-4 sm:grid-cols-2 ${shake ? "ed-shake" : ""}`}>
      {/* What is changing */}
      <div className="ed-up flex flex-wrap items-center gap-2 rounded-xl bg-[#132622]/[0.04] px-4 py-3 text-sm sm:col-span-2" style={d(0)}>
        <Icon n="pen" size={15} className="text-[#1F5D46]" />
        {changes.length ? (
          <>
            <span className={MUTED}>Changing</span>
            {changes.map((c) => <span key={c} className="ed-pop rounded-full bg-[#1F5D46]/10 px-2.5 py-0.5 text-xs font-semibold text-[#1F5D46]">{c}</span>)}
          </>
        ) : <span className={MUTED}>No changes yet. Edit any field below.</span>}
      </div>

      <div className="sm:col-span-2"><Heading i={1}>Entry details</Heading></div>
      <div className="ed-up" style={d(2)}><Field label="Date"><Input type="date" required value={f.date} onChange={set("date")} /></Field></div>
      <div className="ed-up" style={d(2)}>
        <Field label={K.party}><Select required value={party} onChange={set("party")}><option value="">{parties.loading ? "Loading…" : `Select ${K.party.toLowerCase()}`}</option>{list.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field>
      </div>
      <div className="ed-up sm:col-span-2" style={d(3)}><Field label={K.ref}><Input value={f.invoice} onChange={set("invoice")} /></Field></div>

      <div className="sm:col-span-2"><Heading i={4}>Amount</Heading></div>
      <div className="ed-up" style={d(5)}><Field label="Taxable amount (₹)"><Input type="number" step="0.01" min="0.01" required value={f.taxable} onChange={set("taxable")} /></Field></div>
      <div className="ed-up" style={d(5)}>
        <p className="mb-1.5 text-sm font-semibold">GST rate</p>
        <Choice label="GST rate" value={String(f.rate)} onChange={(v) => setF({ ...f, rate: v })} options={rates.map((n) => ({ v: String(n), label: `${n}%` }))} />
      </div>

      <div className="ed-up grid grid-cols-3 gap-3 rounded-2xl border border-emerald-600/20 bg-gradient-to-br from-emerald-50 to-white p-4 sm:col-span-2" style={d(6)}>
        <div><p className={`text-xs ${MUTED}`}>Taxable</p><p className="num !text-left mt-0.5 font-semibold">{inr(r2(f.taxable))}</p></div>
        <div><p className={`text-xs ${MUTED}`}>GST {Number(f.rate) || 0}%</p><p className="num !text-left mt-0.5 font-semibold">{inr(gst)}</p></div>
        <div className="text-right"><p className={`text-xs ${MUTED}`}>Total</p><p className="num mt-0.5 text-xl font-semibold text-[#1F5D46]"><Ticker value={total} /></p></div>
      </div>

      <div className="sm:col-span-2"><Heading i={7}>Payment</Heading></div>
      <div className="ed-up sm:col-span-2" style={d(8)}>
        <Choice label="Payment" value={f.mode} onChange={(v) => setF({ ...f, mode: v })} options={[{ v: "credit", label: "Credit (pay later)" }, { v: "cash", label: "Cash (paid now)" }]} />
      </div>
      <div className={`grid transition-[grid-template-rows] duration-300 ease-out sm:col-span-2 ${f.mode === "credit" ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div className="overflow-hidden">
          <div className={`px-0.5 pb-0.5 pt-0.5 transition-opacity duration-300 ${f.mode === "credit" ? "opacity-100" : "opacity-0"}`}>
            <Field label="Due date"><Input type="date" tabIndex={f.mode === "credit" ? 0 : -1} value={f.due} onChange={set("due")} /></Field>
          </div>
        </div>
      </div>
      <div className="ed-up sm:col-span-2" style={d(9)}><Field label="Narration"><Input value={f.narration} onChange={set("narration")} /></Field></div>

      <div className="sm:col-span-2"><Reason i={10} value={f.reason} onChange={set("reason")} placeholder="For example: wrong amount entered" /></div>
      <div className="sm:col-span-2"><Err>{err}</Err></div>
      <div className="sm:col-span-2"><Actions busy={busy} onClose={onClose} i={11} /></div>
    </form>
  );
}

// --------------------------------------------------
// Journal entry
// --------------------------------------------------

function JournalForm({ a, onClose, onSaved }) {
  const toast = useToast(), s = a.after, F = s.raw?.fields || {};
  const accounts = useAsync(() => api("/accounts"), []);
  const [head, setHead] = useState({ date: day10(F.date ?? s.date), narration: F.narration ?? s.narration ?? "", reference: F.invoice_no ?? s.invoice_no ?? "", reason: "" });
  const [lines, setLines] = useState(() => (s.raw?.lines || []).map((l, i) => ({ k: i, id: String(l.account_id), dr: Number(l.debit) || "", cr: Number(l.credit) || "" })));
  const [err, setErr] = useState(""), [busy, setBusy] = useState(false), [shake, setShake] = useState(false);
  const list = Array.isArray(accounts.data) ? accounts.data : [];
  const setH = (k) => (e) => setHead({ ...head, [k]: e.target.value });
  const upd = (k, p) => setLines((ls) => ls.map((l) => (l.k === k ? { ...l, ...p } : l)));
  const dr = r2(lines.reduce((t, l) => t + r2(l.dr), 0)), cr = r2(lines.reduce((t, l) => t + r2(l.cr), 0)), ok = dr > 0 && dr === cr;

  function fail(m) {
    setErr(m); setShake(true); setTimeout(() => setShake(false), 500);
  }

  async function save(e) {
    e.preventDefault(); setErr("");
    if (lines.length < 2 || lines.some((l) => !l.id || (r2(l.dr) > 0) === (r2(l.cr) > 0))) return fail("Every line needs an account and either a debit or a credit.");
    if (!ok) return fail(`Debits (${inr(dr)}) and credits (${inr(cr)}) must be equal.`);
    if (head.reason.trim().length < 3) return fail("Please write a reason of at least 3 characters.");
    setBusy(true);
    try {
      await api(`/manual-journal/${a.entity_id}`, send("PUT", { date: head.date, narration: head.narration.trim() || null, reference: head.reference.trim() || null, reason: head.reason.trim(), lines: lines.map((l) => ({ account_id: Number(l.id), debit: r2(l.dr), credit: r2(l.cr) })) }));
      toast(`Entry #${a.entity_id} updated.`); onSaved();
    } catch (er) { fail(er.message); setBusy(false); }
  }

  const diff = r2(Math.abs(dr - cr));

  return (
    <form onSubmit={save} className={`grid gap-4 ${shake ? "ed-shake" : ""}`}>
      <Heading i={0}>Entry details</Heading>
      <div className="ed-up grid gap-4 sm:grid-cols-3" style={d(1)}>
        <Field label="Date"><Input type="date" required value={head.date} onChange={setH("date")} /></Field>
        <Field label="Narration"><Input value={head.narration} onChange={setH("narration")} /></Field>
        <Field label="Reference"><Input value={head.reference} onChange={setH("reference")} /></Field>
      </div>

      <Heading i={2}>Lines</Heading>
      <div className="space-y-2">
        <div className="hidden grid-cols-[minmax(0,1fr)_120px_120px_40px] gap-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-[#132622]/40 sm:grid">
          <span>Account</span><span className="text-right">Debit</span><span className="text-right">Credit</span><span />
        </div>

        {lines.map((l) => (
          <div key={l.k} className="ed-up grid grid-cols-2 gap-2 rounded-xl border border-[#132622]/10 bg-white/70 p-2 transition duration-200 focus-within:border-[#1F5D46]/40 focus-within:bg-white focus-within:shadow-md sm:grid-cols-[minmax(0,1fr)_120px_120px_40px] sm:items-center sm:border-0 sm:bg-transparent sm:p-0 sm:focus-within:shadow-none">
            <div className="col-span-2 sm:col-span-1">
              <Select value={l.id} onChange={(e) => upd(l.k, { id: e.target.value })}><option value="">Choose account</option>{list.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</Select>
            </div>
            <Input type="number" min="0" step="0.01" placeholder="Debit" style={{ textAlign: "right" }} value={l.dr} onChange={(e) => upd(l.k, { dr: e.target.value, cr: e.target.value ? "" : l.cr })} />
            <Input type="number" min="0" step="0.01" placeholder="Credit" style={{ textAlign: "right" }} value={l.cr} onChange={(e) => upd(l.k, { cr: e.target.value, dr: e.target.value ? "" : l.dr })} />
            <button type="button" aria-label="Remove line" disabled={lines.length <= 2} onClick={() => lines.length > 2 && setLines((ls) => ls.filter((x) => x.k !== l.k))} className="col-span-2 flex h-10 w-10 items-center justify-center justify-self-end rounded-xl text-[#132622]/40 transition hover:rotate-90 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:rotate-0 disabled:hover:bg-transparent disabled:hover:text-[#132622]/40 sm:col-span-1">
              <Icon n="x" size={16} />
            </button>
          </div>
        ))}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <Btn type="button" variant="line" className="btn-sm" onClick={() => setLines((ls) => [...ls, { k: Date.now(), id: "", dr: "", cr: "" }])}>
            <span className="inline-flex items-center gap-1.5"><Icon n="plus" size={14} />Add line</span>
          </Btn>
        </div>
      </div>

      {/* Balance bar */}
      <div className={`ed-up flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 transition-colors duration-300 ${ok ? "border-emerald-600/25 bg-gradient-to-br from-emerald-50 to-white" : "border-rose-500/25 bg-gradient-to-br from-rose-50 to-white"}`} style={d(3)}>
        <div className="flex gap-6 text-sm">
          <div><p className={`text-xs ${MUTED}`}>Debit</p><p className="num !text-left font-semibold"><Ticker value={dr} /></p></div>
          <div><p className={`text-xs ${MUTED}`}>Credit</p><p className="num !text-left font-semibold"><Ticker value={cr} /></p></div>
        </div>
        <span key={ok ? "ok" : "bad"} className={`ed-pop inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${ok ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
          <Icon n={ok ? "check" : "alert"} size={13} />
          {ok ? "Balanced" : dr === 0 && cr === 0 ? "Enter amounts" : `Not balanced, off by ${inr(diff)}`}
        </span>
      </div>

      <Reason i={4} value={head.reason} onChange={setH("reason")} placeholder="For example: wrong account used" />
      <Err>{err}</Err>
      <Actions busy={busy} onClose={onClose} i={5} />
    </form>
  );
}

export default function EditEntryDialog({ a, onClose, onSaved }) {
  const title = a.entity_type === "journal" ? `Edit journal entry #${a.entity_id}` : `Edit ${a.entity_type} entry #${a.entity_id}`;
  return (
    <Shell title={title} sub="The old and new values are saved in the audit log, and the change can be undone." onClose={onClose}>
      {a.entity_type === "journal" ? <JournalForm a={a} onClose={onClose} onSaved={onSaved} /> : <PartyForm a={a} onClose={onClose} onSaved={onSaved} />}
    </Shell>
  );
}