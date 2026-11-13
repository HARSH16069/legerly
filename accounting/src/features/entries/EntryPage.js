"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Reveal from "@/app/components/Reveal";
import { Btn, Card, CountUp, Empty, Field, Input, PageHeader, Pill, Select, useToast } from "@/components/ui";
import { useUser } from "@/components/Session";
import { CSS as POPUP_CSS, PartyDetails, Shell } from "@/features/contacts/Contacts";
import { useAsync } from "@/hooks/useAsync";
import { api } from "@/lib/api";
import { addDays, day, diffDays, inr, payStatus, today } from "@/lib/format";

const KIND = {
  sales: { title: "Sales", party: "Customer", partyType: "customer", contacts: "customers", field: "customer_id", endpoint: "/sales-entries", ref: "Invoice no.", verb: "You collect", owed: "To collect", accent: "text-emerald-700", bar: "bg-emerald-600", soft: "bg-emerald-50", ring: "ring-emerald-600/20" },
  purchase: { title: "Purchases", party: "Supplier", partyType: "supplier", contacts: "vendors", field: "supplier_id", endpoint: "/purchase-entries", ref: "Supplier bill no.", verb: "You pay", owed: "To pay", accent: "text-amber-700", bar: "bg-amber-600", soft: "bg-amber-50", ring: "ring-amber-600/20" },
};
const init = () => ({ date: today(), party: "", ref: "", taxable: "", rate: "18", mode: "credit", days: "30", due: addDays(today(), 30), narration: "" });

const MUTED = "text-[#132622]/55";
const FILE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
const MAX_MB = 10;
const delay = (i) => ({ animationDelay: `${Math.min(i, 14) * 40}ms` });

const PATHS = {
  clip: "M21 11l-8.5 8.5a5 5 0 01-7-7L14 4a3.3 3.3 0 014.7 4.7L10 17.4a1.7 1.7 0 01-2.4-2.4L15 7.6",
  upload: "M12 16V4m0 0l-4 4m4-4l4 4M4 16v3a1 1 0 001 1h14a1 1 0 001-1v-3",
  file: "M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8zM14 3v5h5",
  x: "M6 6l12 12M18 6L6 18",
  search: "M21 21l-4.3-4.3M11 18a7 7 0 100-14 7 7 0 000 14z",
  receipt: "M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6",
  calendar: "M4 7h16v13H4zM4 11h16M8 3v4M16 3v4",
  user: "M12 12a4 4 0 100-8 4 4 0 000 8zm-7 8a7 7 0 0114 0",
  left: "M15 6l-6 6 6 6",
  right: "M9 6l6 6-6 6",
  out: "M14 4h6v6M20 4l-9 9M18 14v5H5V6h5",
  trend: "M3 17l6-6 4 4 8-8M14 7h7v7",
  alert: "M12 8v5M12 17h.01M10.3 3.9L2.4 18a2 2 0 001.7 3h15.8a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z",
  wallet: "M3 7h16a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2zM3 7l2-3h12M16 14h2",
  list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  image: "M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M9 9.5h.01",
};
const Ico = ({ n, size = 16, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true"><path d={PATHS[n]} /></svg>
);

const EP_CSS = `
@keyframes ep-in{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
@keyframes ep-pop{0%{opacity:0;transform:scale(.8)}70%{transform:scale(1.05)}100%{opacity:1;transform:scale(1)}}
@keyframes ep-pulse{0%,100%{box-shadow:0 0 0 0 rgba(31,93,70,.28)}50%{box-shadow:0 0 0 10px rgba(31,93,70,0)}}
@keyframes ep-shimmer{from{background-position:200% 0}to{background-position:-200% 0}}
@keyframes ep-grow{from{transform:scaleX(0)}to{transform:scaleX(1)}}
.ep-in{animation:ep-in .45s cubic-bezier(.2,.8,.2,1) both}
.ep-pop{animation:ep-pop .35s cubic-bezier(.2,.8,.2,1) both}
.ep-grow{transform-origin:left;animation:ep-grow .8s cubic-bezier(.2,.8,.2,1) both}
.ep-drop-on{animation:ep-pulse 1.1s ease-in-out infinite}
.ep-skel{background:linear-gradient(100deg,rgba(19,38,34,.05) 30%,rgba(19,38,34,.12) 50%,rgba(19,38,34,.05) 70%);background-size:200% 100%;animation:ep-shimmer 1.4s linear infinite}
.ep-row{cursor:pointer;transition:background-color .2s,transform .2s}
.ep-row:hover td{background:rgba(31,93,70,.06)}
.ep-row:focus-visible{outline:2px solid #1F5D46;outline-offset:-2px}
.ep-row:hover .ep-go{opacity:1;transform:translateX(0)}
.ep-go{opacity:0;transform:translateX(-6px);transition:all .2s}
.ep-card{transition:transform .25s,box-shadow .25s}
.ep-card:hover{transform:translateY(-2px);box-shadow:0 10px 30px -12px rgba(19,38,34,.25)}
@media (prefers-reduced-motion:reduce){.ep-in,.ep-pop,.ep-grow,.ep-drop-on,.ep-skel{animation:none!important}}
`;

const isPdf = (a) => a.content_type === "application/pdf";
const src = (a) => `/api/proxy${a.url}`;   // goes through the Next proxy, which adds the sign-in token

// ---------------------------------------------------------------- bill photos
function Thumb({ a, onOpen, i }) {
  const [state, setState] = useState("loading");
  return (
    <button type="button" onClick={onOpen} title={a.original_name || "Open bill"} style={delay(i)}
      className="ep-in group relative aspect-[4/3] overflow-hidden rounded-xl border border-[#132622]/10 bg-[#132622]/[0.03] text-left transition hover:-translate-y-0.5 hover:border-[#1F5D46]/40 hover:shadow-lg">
      {isPdf(a) || state === "error" ? (
        <span className="flex h-full flex-col items-center justify-center gap-2 p-3 text-center">
          <Ico n="file" size={28} className="text-[#1F5D46]" />
          <span className="line-clamp-2 break-all text-xs font-medium">{a.original_name || "Bill"}</span>
          <span className={`text-[10px] uppercase tracking-wider ${MUTED}`}>{isPdf(a) ? "PDF" : "Couldn’t load"}</span>
        </span>
      ) : (
        <>
          {state === "loading" && <span className="ep-skel absolute inset-0" />}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src(a)} alt={a.original_name || "Bill"} loading="lazy" onLoad={() => setState("ok")} onError={() => setState("error")}
            className={`h-full w-full object-cover transition duration-500 group-hover:scale-105 ${state === "ok" ? "opacity-100" : "opacity-0"}`} />
        </>
      )}
      <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent px-2.5 pb-1.5 pt-6 text-[11px] font-medium text-white opacity-0 transition group-hover:opacity-100">Click to open</span>
    </button>
  );
}

function Lightbox({ items, start, onClose }) {
  const [i, setI] = useState(start), [zoom, setZoom] = useState(false), [loaded, setLoaded] = useState(false);
  const a = items[i], many = items.length > 1;
  const go = (n) => { setI(n); setZoom(false); setLoaded(false); };

  useEffect(() => {
    const k = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setI((x) => { const n = Math.min(items.length - 1, x + 1); if (n !== x) { setZoom(false); setLoaded(false); } return n; });
      if (e.key === "ArrowLeft") setI((x) => { const n = Math.max(0, x - 1); if (n !== x) { setZoom(false); setLoaded(false); } return n; });
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [items.length, onClose]);

  const nav = "absolute top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur transition hover:bg-white/30 disabled:opacity-30";

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-black/85 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Bill viewer">
      <div className="flex items-center justify-between gap-3 px-4 py-3 text-white">
        <p className="min-w-0 truncate text-sm font-medium">{a.original_name || "Bill"} <span className="ml-2 text-white/60">{i + 1} / {items.length}</span></p>
        <div className="flex items-center gap-2">
          <a href={src(a)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-3 py-2 text-sm font-medium backdrop-blur transition hover:bg-white/30"><Ico n="out" size={15} />Open</a>
          <button type="button" aria-label="Close" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 backdrop-blur transition hover:rotate-90 hover:bg-white/30"><Ico n="x" size={18} /></button>
        </div>
      </div>

      <div className="relative min-h-0 flex-1" onClick={(e) => e.target === e.currentTarget && onClose()}>
        {many && <button type="button" aria-label="Previous" disabled={i === 0} onClick={() => go(i - 1)} className={`${nav} left-3`}><Ico n="left" size={22} /></button>}
        {many && <button type="button" aria-label="Next" disabled={i === items.length - 1} onClick={() => go(i + 1)} className={`${nav} right-3`}><Ico n="right" size={22} /></button>}

        {isPdf(a) ? (
          <iframe key={a.id} title={a.original_name || "Bill"} src={src(a)} className="mx-auto block h-full w-full max-w-4xl bg-white sm:rounded-xl" />
        ) : (
          <div className={`flex h-full w-full ${zoom ? "overflow-auto" : "items-center justify-center overflow-hidden"}`} onClick={(e) => e.target === e.currentTarget && onClose()}>
            {!loaded && <span className="ep-skel absolute h-40 w-56 rounded-xl" />}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img key={a.id} src={src(a)} alt={a.original_name || "Bill"} onLoad={() => setLoaded(true)} onClick={() => setZoom((z) => !z)}
              className={`ep-pop select-none rounded-lg shadow-2xl transition-all duration-300 ${zoom ? "m-auto max-w-none cursor-zoom-out" : "max-h-full max-w-full cursor-zoom-in object-contain"}`} />
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- transaction popup
function Info({ label, children, i = 0 }) {
  return (
    <div className="ep-in rounded-xl border border-[#132622]/10 bg-[#132622]/[0.025] p-3" style={delay(i)}>
      <p className={`text-xs ${MUTED}`}>{label}</p>
      <p className="mt-1 break-words font-medium">{children || "—"}</p>
    </div>
  );
}

function EntryDetails({ r, t, kind, onClose }) {
  const K = KIND[kind], role = useUser().role, canSeeFull = role !== "sales";
  const [light, setLight] = useState(null), [partyOpen, setPartyOpen] = useState(false);
  const full = useAsync(() => (canSeeFull ? api(`/journal-entries/${r.id}`) : Promise.resolve(null)), [r.id, canSeeFull]);
  const contacts = useAsync(() => api(`/${K.contacts}?active_only=false`).catch(() => []), [K.contacts]);

  const party = (contacts.data || []).find((c) => c.account_id === r.party_id);
  const lines = full.data?.lines || [], files = full.data?.attachments || [];
  const dr = lines.reduce((s, l) => s + Number(l.debit || 0), 0), cr = lines.reduce((s, l) => s + Number(l.credit || 0), 0);
  const s = payStatus(t);
  const total = Number(r.total_amount || 0), paid = t ? (t.payment_mode === "cash" ? total : Number(t.paid_amount || 0)) : 0;
  const pct = total ? Math.min(100, Math.round((paid / total) * 100)) : 0;
  const left = t?.due_date ? diffDays(today(), t.due_date) : null;

  const head = (icon, title, count, i) => (
    <h4 className="ep-in mb-3 mt-7 flex items-center gap-2 font-serif text-base font-medium" style={delay(i)}>
      <Ico n={icon} size={16} className="text-[#1F5D46]" />{title}
      {count > 0 && <span className="rounded-full bg-[#132622]/[0.06] px-2 py-0.5 font-sans text-xs">{count}</span>}
    </h4>
  );

  return (
    <>
      <Shell title={`${K.title.replace(/s$/, "")} ${r.invoice_no ? `#${r.invoice_no}` : `entry #${r.id}`}`} sub={`${day(r.date)} · ${r.party_name || K.party}`} onClose={onClose} busy={!!light || partyOpen} max="max-w-4xl">
        {/* Total */}
        <div className={`ep-in relative overflow-hidden rounded-2xl border border-[#132622]/10 bg-gradient-to-br from-white p-5 ${K.soft}`}>
          <span aria-hidden className={`absolute inset-y-0 left-0 w-1.5 ${K.bar}`} />
          <div className="flex flex-wrap items-end justify-between gap-4 pl-2">
            <div>
              <p className={`text-xs font-medium ${MUTED}`}>Bill total</p>
              <p className="num !text-left font-serif text-4xl font-medium text-[#132622]"><CountUp value={total} /></p>
            </div>
            <Pill tone={s.tone}>{s.label}</Pill>
          </div>
          {t && t.payment_mode === "credit" && (
            <div className="mt-4 pl-2">
              <div className="h-2 overflow-hidden rounded-full bg-[#132622]/10"><div className={`ep-grow h-full rounded-full ${K.bar}`} style={{ width: `${pct}%` }} /></div>
              <p className={`mt-1.5 flex justify-between text-xs ${MUTED}`}><span>{kind === "sales" ? "Received" : "Paid"} {inr(paid)}</span><span>Outstanding {inr(Math.max(0, total - paid))}</span></p>
            </div>
          )}
        </div>

        {/* Amounts and terms */}
        {head("receipt", "Amounts and payment", 0, 1)}
        <div className="grid gap-3 sm:grid-cols-3">
          <Info i={1} label="Taxable amount">{inr(r.taxable_amount)}</Info>
          <Info i={2} label={`GST${r.gst_rate != null ? ` (${Number(r.gst_rate)}%)` : ""}`}>{inr(r.gst_amount)}</Info>
          <Info i={3} label="Payment">{t ? (t.payment_mode === "cash" ? "Cash, paid now" : "Credit") : "—"}</Info>
          {t?.payment_mode === "credit" && <Info i={4} label="Due date">{day(t.due_date)}{!t.is_paid && left != null && <span className={`ml-2 text-xs font-semibold ${left < 0 ? "text-red-600" : left <= 7 ? "text-amber-700" : MUTED}`}>{left < 0 ? `${-left} days overdue` : left === 0 ? "today" : `in ${left} days`}</span>}</Info>}
          <Info i={5} label="Entry date">{day(r.date)}</Info>
          <Info i={6} label={K.ref}>{r.invoice_no}</Info>
          {r.narration && <div className="sm:col-span-3"><Info i={7} label="Narration">{r.narration}</Info></div>}
        </div>

        {/* Customer / supplier */}
        {head("user", K.party, 0, 8)}
        <div className="ep-in rounded-2xl border border-[#132622]/10 bg-white/70 p-4" style={delay(9)}>
          {contacts.loading && !party ? <div className="ep-skel h-16 rounded-xl" /> : (
            <div className="flex flex-wrap items-center gap-4">
              <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl font-serif text-xl text-white ${K.bar}`}>{(party?.display_name || r.party_name || "?")[0].toUpperCase()}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{party?.display_name || r.party_name || "—"}</p>
                <p className={`truncate text-sm ${MUTED}`}>{party?.company_name || (party ? "No company name" : `${K.party} details are not available`)}</p>
                {party && (
                  <p className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-sm">
                    {party.mobile && <a href={`tel:${party.mobile}`} className="text-[#1F5D46] hover:underline">{party.mobile}</a>}
                    {party.email && <a href={`mailto:${party.email}`} className="break-all text-[#1F5D46] hover:underline">{party.email}</a>}
                    {party.gstin && <span className="font-mono text-xs">GSTIN {party.gstin}</span>}
                  </p>
                )}
              </div>
              {party && <Btn variant="line" onClick={() => setPartyOpen(true)}>View {K.party.toLowerCase()} details</Btn>}
            </div>
          )}
        </div>

        {/* Journal */}
        {canSeeFull && (<>
          {head("list", "Journal entry", lines.length, 10)}
          {full.loading && !full.data ? <div className="ep-skel h-28 rounded-xl" /> : full.error ? <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{full.error}</p> : (
            <div className="ep-in overflow-x-auto rounded-xl border border-[#132622]/10" style={delay(11)}>
              <table className="w-full text-sm">
                <thead className="bg-[#132622]/[0.04] text-left text-xs uppercase tracking-wider text-[#132622]/55"><tr><th className="px-4 py-2.5">Account</th><th className="px-4 py-2.5 text-right">Debit</th><th className="px-4 py-2.5 text-right">Credit</th></tr></thead>
                <tbody>{lines.map((l, i) => (
                  <tr key={i} className="border-t border-[#132622]/10"><td className="px-4 py-2.5">{l.account_name}</td><td className="num px-4 py-2.5 text-right">{Number(l.debit) ? inr(l.debit) : ""}</td><td className="num px-4 py-2.5 text-right">{Number(l.credit) ? inr(l.credit) : ""}</td></tr>
                ))}</tbody>
                <tfoot><tr className="border-t-2 border-[#132622]/20 font-semibold"><td className="px-4 py-2.5">Total</td><td className="num px-4 py-2.5 text-right">{inr(dr)}</td><td className="num px-4 py-2.5 text-right">{inr(cr)}</td></tr></tfoot>
              </table>
            </div>
          )}
        </>)}

        {/* Bill photos */}
        {head("image", "Bills", canSeeFull ? files.length : r.attachment_count || 0, 12)}
        {!canSeeFull ? (
          <p className={`text-sm ${MUTED}`}>{r.attachment_count ? `${r.attachment_count} bill file${r.attachment_count === 1 ? "" : "s"} attached. Photos can be opened by an owner or accountant.` : "No bills attached."}</p>
        ) : full.loading && !full.data ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="ep-skel aspect-[4/3] rounded-xl" />)}</div>
        ) : files.length ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{files.map((a, i) => <Thumb key={a.id} a={a} i={i} onOpen={() => setLight(i)} />)}</div>
        ) : <p className={`text-sm ${MUTED}`}>No bills were attached to this entry.</p>}
      </Shell>

      {light != null && <Lightbox items={files} start={light} onClose={() => setLight(null)} />}
      {partyOpen && party && <PartyDetails kind={K.contacts} p={party} onClose={() => setPartyOpen(false)} />}
    </>
  );
}

// ---------------------------------------------------------------- page
function StatCard({ i, icon, label, sub, tone = "text-[#1F5D46]", bg = "bg-[#1F5D46]/10", children }) {
  return (
    <div className="ep-in ep-card relative overflow-hidden rounded-2xl border border-[#132622]/10 bg-white/70 p-4" style={delay(i)}>
      <div className="flex items-center gap-3">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${bg} ${tone}`}><Ico n={icon} size={19} /></span>
        <div className="min-w-0"><p className={`text-xs font-medium ${MUTED}`}>{label}</p><p className="num !text-left truncate text-xl font-semibold">{children}</p>{sub && <p className={`truncate text-[11px] ${MUTED}`}>{sub}</p>}</div>
      </div>
    </div>
  );
}

const statusOf = (t) => {
  if (!t) return "settled";
  if (t.payment_mode === "cash" || t.is_paid) return "settled";
  return t.due_date && diffDays(today(), t.due_date) < 0 ? "overdue" : "unpaid";
};

export default function EntryPage({ kind }) {
  const K = KIND[kind], toast = useToast();
  const [f, setF] = useState(init), [busy, setBusy] = useState(false), [files, setFiles] = useState([]), [drag, setDrag] = useState(false);
  const [q, setQ] = useState(""), [flt, setFlt] = useState("all"), [open, setOpen] = useState(null);
  const inputRef = useRef(null), filesRef = useRef([]);
  filesRef.current = files;
  useEffect(() => () => filesRef.current.forEach((x) => x.url && URL.revokeObjectURL(x.url)), []);

  const parties = useAsync(() => api(`/accounts?party_type=${K.partyType}`), [kind]);
  const reg = useAsync(async () => {
    const [rows, terms] = await Promise.all([api(K.endpoint), api(`/reminders/terms?entry_type=${kind}`).catch(() => [])]);
    return { rows, tm: Object.fromEntries(terms.map((t) => [t.entry_id, t])) };
  }, [kind]);

  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const setDate = (v) => setF((s) => ({ ...s, date: v, due: addDays(v, parseInt(s.days) || 0) }));
  const setDays = (v) => setF((s) => ({ ...s, days: String(v), due: addDays(s.date, parseInt(v) || 0) }));
  const setDue = (v) => setF((s) => ({ ...s, due: v, days: String(Math.max(0, diffDays(s.date, v))) }));

  const taxable = parseFloat(f.taxable) || 0, rate = parseFloat(f.rate) || 0, gst = Math.round(taxable * rate) / 100, total = taxable + gst;
  const name = parties.data?.find((p) => String(p.id) === f.party)?.name || K.party;
  let lines = kind === "sales" ? [[name, total, 0], ["Sales", 0, taxable], ["GST Payable", 0, gst]] : [["Purchases", taxable, 0], ["GST Input", gst, 0], [name, 0, total]];
  if (f.mode === "cash") lines = lines.concat(kind === "sales" ? [["Cash", total, 0], [name, 0, total]] : [[name, total, 0], ["Cash", 0, total]]);

  // ---- bill files
  function addFiles(list) {
    const next = [];
    for (const file of [...list]) {
      if (!FILE_TYPES.has(file.type)) { toast(`${file.name}: only JPG, PNG, WEBP or PDF.`, true); continue; }
      if (file.size > MAX_MB * 1024 * 1024) { toast(`${file.name}: files can be at most ${MAX_MB} MB.`, true); continue; }
      if (filesRef.current.some((x) => x.file.name === file.name && x.file.size === file.size)) continue;
      next.push({ id: `${file.name}-${file.size}-${Math.random()}`, file, url: file.type.startsWith("image/") ? URL.createObjectURL(file) : null });
    }
    if (next.length) setFiles((s) => [...s, ...next]);
  }
  const removeFile = (id) => setFiles((s) => { const x = s.find((y) => y.id === id); if (x?.url) URL.revokeObjectURL(x.url); return s.filter((y) => y.id !== id); });
  const clearFiles = () => { filesRef.current.forEach((x) => x.url && URL.revokeObjectURL(x.url)); setFiles([]); if (inputRef.current) inputRef.current.value = ""; };

  async function submit(e) {
    e.preventDefault();
    if (f.mode === "credit" && diffDays(f.date, f.due) < 0) return toast("Due date can’t be before the entry date.", true);
    const fd = new FormData();
    fd.append("entry_date", f.date); fd.append(K.field, f.party); fd.append("taxable_amount", f.taxable); fd.append("gst_rate", f.rate); fd.append("payment_mode", f.mode);
    if (f.mode === "credit") { fd.append("credit_days", f.days || 0); fd.append("due_date", f.due); }
    if (f.ref.trim()) fd.append("invoice_no", f.ref.trim());
    if (f.narration.trim()) fd.append("narration", f.narration.trim());
    files.forEach((x) => fd.append("files", x.file, x.file.name));
    setBusy(true);
    try {
      const r = await api(K.endpoint, { method: "POST", body: fd });
      toast(`Saved entry #${r.journal_entry_id}, total ${inr(r.total_amount)}${f.mode === "credit" ? `, due ${day(f.due)}` : " (cash)"}.`);
      setF((s) => ({ ...init(), party: s.party })); clearFiles(); reg.reload();
    } catch (er) { toast(er.message, true); }
    setBusy(false);
  }

  // ---- register: numbers, search and filter
  const rows = reg.data?.rows || [], tm = reg.data?.tm || {};
  const stats = useMemo(() => {
    let billed = 0, owed = 0, overdue = 0;
    for (const r of rows) {
      billed += Number(r.total_amount || 0);
      const t = tm[r.id];
      if (t && t.payment_mode === "credit" && !t.is_paid) { owed += Number(t.outstanding ?? Number(t.total) - Number(t.paid_amount || 0)); if (statusOf(t) === "overdue") overdue++; }
    }
    return { billed, owed, overdue };
  }, [rows, tm]);
  const counts = useMemo(() => rows.reduce((c, r) => { c[statusOf(tm[r.id])]++; return c; }, { settled: 0, unpaid: 0, overdue: 0 }), [rows, tm]);
  const needle = q.trim().toLowerCase();
  const shown = rows.filter((r) => (flt === "all" || statusOf(tm[r.id]) === flt) && (!needle || [r.invoice_no, r.party_name, r.narration, r.total_amount, r.date, day(r.date)].some((x) => String(x ?? "").toLowerCase().includes(needle))));

  const section = (n, title) => <p className="sm:col-span-2 -mb-1 mt-1 flex items-center gap-2.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#1F5D46]"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#1F5D46] text-[10px] text-white">{n}</span>{title}</p>;

  return (
    <>
      <style>{POPUP_CSS}</style>
      <style>{EP_CSS}</style>
      <PageHeader eyebrow="Transactions" title={K.title} />

      {/* Summary */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard i={0} icon="receipt" label="Entries" sub="In the register">{reg.loading && !reg.data ? "…" : <CountUp value={rows.length} money={false} />}</StatCard>
        <StatCard i={1} icon="trend" label={`Total ${kind === "sales" ? "sold" : "bought"}`} sub="Including GST">{reg.loading && !reg.data ? "…" : <CountUp value={stats.billed} />}</StatCard>
        <StatCard i={2} icon="wallet" label={K.owed} sub="Unpaid credit bills" tone={K.accent} bg={K.soft}>{reg.loading && !reg.data ? "…" : <CountUp value={stats.owed} />}</StatCard>
        <StatCard i={3} icon="alert" label="Overdue" sub={stats.overdue ? "Needs follow-up" : "All on time"} tone={stats.overdue ? "text-red-600" : "text-[#1F5D46]"} bg={stats.overdue ? "bg-red-50" : "bg-[#1F5D46]/10"}>{reg.loading && !reg.data ? "…" : <CountUp value={stats.overdue} money={false} />}</StatCard>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Card className="ep-in"><form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          {section(1, "Bill details")}
          <Field label="Date"><Input type="date" required value={f.date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label={K.party}><Select required value={f.party} onChange={(e) => set("party", e.target.value)}>
            <option value="">{parties.loading && !parties.data ? "Loading…" : `Select ${K.party.toLowerCase()}`}</option>
            {(parties.data || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select></Field>
          <Field label={K.ref}><Input value={f.ref} onChange={(e) => set("ref", e.target.value)} /></Field>
          <Field label="Narration"><Input value={f.narration} onChange={(e) => set("narration", e.target.value)} placeholder="Optional" /></Field>

          {section(2, "Amount")}
          <Field label="Taxable amount (₹)"><Input type="number" step="0.01" min="0.01" required value={f.taxable} onChange={(e) => set("taxable", e.target.value)} /></Field>
          <Field label="GST rate"><Select value={f.rate} onChange={(e) => set("rate", e.target.value)}>{[0, 5, 12, 18, 28].map((n) => <option key={n} value={n}>{n}%</option>)}</Select></Field>

          {section(3, "Payment")}
          <div className="sm:col-span-2">
            <div className="seg" data-v={f.mode}>
              <button type="button" aria-pressed={f.mode === "cash"} onClick={() => set("mode", "cash")}>Cash (paid now)</button>
              <button type="button" aria-pressed={f.mode === "credit"} onClick={() => set("mode", "credit")}>Credit (pay later)</button>
            </div>
          </div>
          <div className={`fold sm:col-span-2 ${f.mode === "cash" ? "shut" : ""}`}><div>
            <div className="grid gap-4 border border-[#132622]/15 bg-[#EFEADB] p-4 sm:grid-cols-2">
              <Field label="Credit days"><Input type="number" min="0" max="365" value={f.days} onChange={(e) => setDays(e.target.value)} /></Field>
              <Field label="Due date"><Input type="date" value={f.due} onChange={(e) => setDue(e.target.value)} /></Field>
              <div className="flex flex-wrap gap-2 sm:col-span-2">{[0, 7, 15, 30, 45, 60].map((n) => <button type="button" key={n} className={`chip ${parseInt(f.days) === n ? "on" : ""}`} onClick={() => setDays(n)}>{n ? `${n} days` : "Same day"}</button>)}</div>
              <p className="text-[13px] text-[#132622]/60 sm:col-span-2">{K.verb} on {day(f.due)}.</p>
            </div>
          </div></div>

          {section(4, "Bills (images or PDF)")}
          <div className="sm:col-span-2">
            <label onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files); }}
              className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-2xl border-2 border-dashed px-4 py-7 text-center transition ${drag ? "ep-drop-on border-[#1F5D46] bg-[#1F5D46]/[0.07]" : "border-[#132622]/20 bg-white/50 hover:border-[#1F5D46]/50 hover:bg-white"}`}>
              <span className={`flex h-12 w-12 items-center justify-center rounded-xl bg-[#1F5D46]/10 text-[#1F5D46] transition ${drag ? "scale-110" : ""}`}><Ico n="upload" size={22} /></span>
              <span className="font-medium">Drop bill photos here, or <span className="text-[#1F5D46] underline underline-offset-4">browse</span></span>
              <span className={`text-xs ${MUTED}`}>JPG, PNG, WEBP or PDF, up to {MAX_MB} MB each</span>
              <input ref={inputRef} type="file" multiple accept="image/jpeg,image/png,image/webp,application/pdf" className="sr-only" onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
            </label>
            {files.length > 0 && (
              <ul className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4">
                {files.map((x) => (
                  <li key={x.id} className="ep-pop group relative aspect-square overflow-hidden rounded-xl border border-[#132622]/10 bg-[#132622]/[0.03]">
                    {x.url ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={x.url} alt={x.file.name} className="h-full w-full object-cover" /> : (
                      <span className="flex h-full flex-col items-center justify-center gap-1 p-2 text-center"><Ico n="file" size={24} className="text-[#1F5D46]" /><span className="line-clamp-2 break-all text-[11px]">{x.file.name}</span></span>
                    )}
                    <button type="button" aria-label={`Remove ${x.file.name}`} onClick={() => removeFile(x.id)} className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-90 transition hover:bg-red-600 sm:opacity-0 sm:group-hover:opacity-100"><Ico n="x" size={13} /></button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="sm:col-span-2"><Btn type="submit" disabled={busy}>{busy ? "Saving…" : `Save ${kind} entry`}</Btn></div>
        </form></Card>

        <Card className="ep-in lg:sticky lg:top-8" style={delay(2)}>
          <h2 className="mb-4 font-serif text-xl font-medium">Journal that will be posted <Pill tone={f.mode === "cash" ? "ok" : "warn"}>{f.mode === "cash" ? "Cash" : "Credit"}</Pill></h2>
          <table className="tbl"><thead><tr><th></th><th className="num">Debit</th><th className="num">Credit</th></tr></thead>
            <tbody>{lines.filter((l) => l[1] > 0 || l[2] > 0 || taxable === 0).map((l, i) => <tr key={i}><td>{l[0]}</td><td className="num">{l[1] ? inr(l[1]) : ""}</td><td className="num">{l[2] ? inr(l[2]) : ""}</td></tr>)}</tbody></table>
          <div className="mt-4 grid grid-cols-[1fr_auto] gap-1 text-[14px]">
            <span>Taxable amount</span><span className="num">{inr(taxable)}</span><span>GST ({rate}%)</span><span className="num">{inr(gst)}</span>
            <span className="mt-2 border-t-2 border-[#132622] pt-3 font-serif text-[17px]">Bill total</span>
            <span key={total} className="num bump mt-2 border-t-2 border-[#132622] pt-3 text-[17px] text-[#1F5D46]">{inr(total)}</span>
          </div>
        </Card>
      </div>

      {/* Register */}
      <Reveal className="mt-10"><Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-serif text-xl font-medium">{K.title} register</h2>
          <label className="group flex min-w-[220px] flex-1 items-center gap-2 rounded-2xl bg-white/70 px-3.5 py-2.5 ring-1 ring-[#132622]/10 transition focus-within:bg-white focus-within:ring-2 focus-within:ring-[#1F5D46]/40 sm:max-w-sm">
            <Ico n="search" size={16} className="text-[#132622]/40 transition-colors group-focus-within:text-[#1F5D46]" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${K.ref.toLowerCase()}, ${K.party.toLowerCase()} or amount`} aria-label="Search the register" className="w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-[#132622]/35" />
            {q && <button type="button" aria-label="Clear search" onClick={() => setQ("")} className="rounded-md p-0.5 text-[#132622]/40 hover:bg-[#132622]/[0.06]"><Ico n="x" size={14} /></button>}
          </label>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {[["all", "All", rows.length], ["unpaid", "Unpaid", counts.unpaid], ["overdue", "Overdue", counts.overdue], ["settled", "Settled", counts.settled]].map(([v, l, n]) => (
            <button key={v} type="button" onClick={() => setFlt(v)} className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${flt === v ? "bg-[#1F5D46] text-white shadow" : "bg-[#132622]/[0.06] text-[#132622]/70 hover:bg-[#132622]/10"}`}>
              {l} <span className={`ml-1 text-xs ${flt === v ? "text-white/80" : "text-[#132622]/45"}`}>{n}</span>
            </button>
          ))}
        </div>

        {reg.loading && !reg.data ? <div className="space-y-2">{[0, 1, 2, 3].map((i) => <div key={i} className="ep-skel h-12 rounded-xl" />)}</div> : reg.error ? <Empty error>{reg.error}</Empty> : shown.length ? (
          <div className="tw"><table className="tbl">
            <thead><tr><th>Date</th><th>{K.ref}</th><th>{K.party}</th><th className="num">Taxable</th><th className="num">GST</th><th className="num">Total</th><th>Payment</th><th></th></tr></thead>
            <tbody key={`${flt}-${needle}`}>{shown.map((r, i) => { const s = payStatus(tm[r.id]); return (
              <tr key={r.id} className="ep-row ep-in" style={delay(i)} tabIndex={0} title="Click to see the full details" onClick={() => setOpen(r)} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setOpen(r))}>
                <td>{day(r.date)}</td>
                <td>{r.invoice_no || "-"}</td>
                <td>{r.party_name || "-"}</td>
                <td className="num">{inr(r.taxable_amount)}</td><td className="num">{inr(r.gst_amount)}</td><td className="num font-semibold">{inr(r.total_amount)}</td>
                <td><Pill tone={s.tone}>{s.label}</Pill></td>
                <td className="whitespace-nowrap text-right">
                  {r.attachment_count > 0 && <span className={`mr-2 inline-flex items-center gap-1 text-xs ${MUTED}`} title={`${r.attachment_count} bill file(s)`}><Ico n="clip" size={14} />{r.attachment_count}</span>}
                  <span className="ep-go inline-flex items-center gap-0.5 text-sm font-semibold text-[#1F5D46]">View<Ico n="right" size={14} /></span>
                </td>
              </tr>); })}</tbody>
          </table></div>
        ) : <Empty>{rows.length ? "Nothing matches your search or filter." : `No ${kind} entries yet.`}</Empty>}
      </Card></Reveal>

      {open && <EntryDetails key={open.id} r={open} t={tm[open.id]} kind={kind} onClose={() => setOpen(null)} />}
    </>
  );
}