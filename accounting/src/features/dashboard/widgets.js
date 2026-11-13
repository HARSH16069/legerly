"use client";
import Link from "next/link";
import Reveal from "@/app/components/Reveal";
import { Card, CountUp, Pill } from "@/components/ui";
import { day, inr } from "@/lib/format";

const ICONS = {
  sales: "M3 3v18h18 M7 14l4-4 4 4 6-7",
  purchase: "M3 3h18v18H3z M8 8h8 M8 12h8 M8 16h5",
  customer: "M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2 M9 11a4 4 0 100-8 4 4 0 000 8 M20 8v6 M17 11h6",
  supplier: "M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2 M9 11a4 4 0 100-8 4 4 0 000 8 M16 11l2 2 4-4",
  cash: "M3 6h18v14H3z M3 10h18 M7 15h3 M17 15h1 M7 3h10",
  gst: "M12 2v20 M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6",
  alert: "M12 9v4 M12 17h.01 M10.3 3.9L1.8 18.5A2 2 0 003.5 21h17a2 2 0 001.7-2.5L13.7 3.9a2 2 0 00-3.4 0z",
  check: "M5 12.5l4.5 4.5L19 7.5",
  book: "M4 4.5A2.5 2.5 0 016.5 2H20v17H6.5A2.5 2.5 0 004 21.5z M4 21.5V4.5 M9 7h7",
  plus: "M12 5v14 M5 12h14",
  journal: "M5 3h11l3 3v15H5z M9 9h7 M9 13h7 M9 17h4",
  bell: "M6 8a6 6 0 0112 0c0 7 3 8 3 8H3s3-1 3-8 M10 21a2 2 0 004 0",
  trend: "M3 17l6-6 4 4 8-9 M15 6h6v6",
  wallet: "M3 7a2 2 0 012-2h13v4 M3 7v11a2 2 0 002 2h15V9H5a2 2 0 01-2-2z M16 14h2",
  clock: "M12 7v5l3 2 M12 21a9 9 0 100-18 9 9 0 000 18z",
  arrow: "M5 12h14 M13 6l6 6-6 6",
  shield: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z M9 12l2 2 4-4",
};

export function Icon({ name, size = 19 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={ICONS[name] || ICONS.book} />
    </svg>
  );
}

const MUTED = "text-[#132622]/55";
const compact = (n) => new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 }).format(n);
const TONE = { overdue: "bad", due_today: "warn", due_soon: "warn" };

export function Panel({ title, sub, icon, tone = "green", right, children, className = "" }) {
  const tones = { green: "bg-emerald-600/10 text-emerald-700", gold: "bg-amber-500/10 text-amber-700", blue: "bg-sky-600/10 text-sky-700", violet: "bg-violet-600/10 text-violet-700" };
  return (
    <Reveal className={className}>
      <Card className="dash-panel card-hover h-full overflow-hidden !rounded-2xl !border !border-[#132622]/10 !bg-white/75 !p-0">
        <div className="flex items-center justify-between gap-3 border-b border-[#132622]/10 px-5 py-5 sm:px-6">
          <div className="flex items-center gap-3">
            <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tones[tone]}`}><Icon name={icon} /></span>
            <div><h2 className="font-serif text-xl font-medium text-[#132622]">{title}</h2>{sub && <p className={`mt-0.5 text-xs ${MUTED}`}>{sub}</p>}</div>
          </div>
          {right}
        </div>
        <div className="p-5 sm:p-6">{children}</div>
      </Card>
    </Reveal>
  );
}

export function StatCard({ label, value, icon, delay = 0, color = "green", money = true, text, bad = false, hint }) {
  const colors = { green: "bg-emerald-600", gold: "bg-amber-500", blue: "bg-sky-600", violet: "bg-violet-600", rose: "bg-rose-600" };
  return (
    <Reveal delay={delay}>
      <div className={`dash-stat group relative h-full overflow-hidden rounded-2xl border bg-white/75 p-4 transition-all duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-xl hover:shadow-[#132622]/[0.06] ${bad ? "border-rose-500/25" : "border-[#132622]/10 hover:border-[#1F5D46]/30"}`}>
        <span className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-[#1F5D46]/[0.06] blur-2xl transition-transform duration-700 group-hover:scale-150" />
        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-[#132622]/55">{label}</p>
            <p className={`mt-3 truncate text-[21px] font-semibold tracking-tight ${bad ? "text-rose-600" : "text-[#132622]"}`}>{text ?? <CountUp value={value} money={money} />}</p>
            {hint && <p className={`mt-1 text-[11px] ${MUTED}`}>{hint}</p>}
          </div>
          <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-sm transition duration-300 group-hover:-rotate-6 group-hover:scale-110 ${bad ? colors.rose : colors[color]}`}><Icon name={icon} /></span>
        </div>
        <div className="relative mt-4 h-1 overflow-hidden rounded-full bg-[#132622]/[0.06]"><span className={`block h-full w-2/3 rounded-full transition-all duration-700 group-hover:w-full ${bad ? "bg-rose-500" : "bg-[#1F5D46]/60"}`} /></div>
      </div>
    </Reveal>
  );
}

export function QuickActions() {
  const items = [["/sales", "New sale", "sales"], ["/purchases", "New purchase", "purchase"], ["/journal", "Journal entry", "journal"], ["/contacts", "Add contact", "customer"], ["/reminders", "Receive payment", "wallet"], ["/ledger", "Open ledger", "book"]];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {items.map(([href, label, icon], i) => (
        <Reveal key={label} delay={i * 50}>
          <Link href={href} className="group flex items-center gap-3 rounded-2xl border border-[#132622]/10 bg-white/75 px-4 py-3.5 text-sm font-medium transition-all duration-300 hover:-translate-y-1 hover:border-[#1F5D46]/30 hover:bg-white hover:shadow-lg hover:shadow-[#132622]/[0.06]">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1F5D46]/[0.08] text-[#1F5D46] transition-all duration-300 group-hover:bg-[#1F5D46] group-hover:text-white"><Icon name={icon} size={17} /></span>
            {label}
          </Link>
        </Reveal>
      ))}
    </div>
  );
}

export function Insights({ items }) {
  const tone = { bad: "border-rose-500/25 bg-rose-50/80 text-rose-700", warn: "border-amber-500/30 bg-amber-50/80 text-amber-800", ok: "border-emerald-600/20 bg-emerald-50/70 text-emerald-800" };
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {items.map((x, i) => (
        <Reveal key={x.text} delay={i * 70}>
          <div className={`flex items-center gap-3 rounded-2xl border px-4 py-3.5 ${tone[x.tone]}`}>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/70"><Icon name={x.icon} size={17} /></span>
            <div className="min-w-0 flex-1"><p className="text-sm font-medium">{x.text}</p>{x.href && <Link href={x.href} className="inline-flex items-center gap-1 text-xs font-semibold underline-offset-4 hover:underline">{x.cta} <Icon name="arrow" size={12} /></Link>}</div>
          </div>
        </Reveal>
      ))}
    </div>
  );
}

export function TrendChart({ series }) {
  const W = 620, H = 240, t = 14, b = 30, l = 46, r = 8, ph = H - t - b, max = Math.max(1, ...series.flatMap((s) => [s.sales, s.purchases]));
  const gap = (W - l - r) / series.length, bw = Math.min(24, gap / 3);
  const y = (v) => t + ph - (v / max) * ph;
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Sales and purchases for the last six months">
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <g key={f}><line x1={l} x2={W - r} y1={y(max * f)} y2={y(max * f)} stroke="#132622" strokeOpacity={f ? 0.08 : 0.2} strokeDasharray={f ? "3 5" : ""} /><text x={l - 8} y={y(max * f) + 4} textAnchor="end" fontSize="10" fill="#132622" fillOpacity="0.5">{compact(max * f)}</text></g>
        ))}
        {series.map((s, i) => {
          const cx = l + gap * i + gap / 2;
          return (
            <g key={s.key} className="bar-group">
              <rect className="bar" x={cx - bw - 2} y={y(s.sales)} width={bw} height={Math.max(0, t + ph - y(s.sales))} rx="5" fill="#1F5D46" style={{ animationDelay: `${i * 90}ms` }}><title>{`${s.label} sales: ${inr(s.sales)}`}</title></rect>
              <rect className="bar" x={cx + 2} y={y(s.purchases)} width={bw} height={Math.max(0, t + ph - y(s.purchases))} rx="5" fill="#B9852F" style={{ animationDelay: `${i * 90 + 45}ms` }}><title>{`${s.label} purchases: ${inr(s.purchases)}`}</title></rect>
              <text x={cx} y={H - 10} textAnchor="middle" fontSize="11" fill="#132622" fillOpacity="0.6">{s.label}</text>
            </g>
          );
        })}
      </svg>
      <div className="mt-2 flex items-center gap-5 text-xs text-[#132622]/60">
        <span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-sm bg-[#1F5D46]" />Sales (taxable)</span>
        <span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-sm bg-[#B9852F]" />Purchases (taxable)</span>
      </div>
    </div>
  );
}

export function TopList({ rows, color = "#1F5D46", empty }) {
  if (!rows.length) return <p className={`py-6 text-center text-sm ${MUTED}`}>{empty}</p>;
  const max = Math.max(...rows.map((r) => r.amount), 1);
  return (
    <ol className="space-y-4">
      {rows.map((r, i) => (
        <li key={r.name}>
          <div className="mb-1.5 flex items-center justify-between gap-3 text-sm"><span className="flex min-w-0 items-center gap-2.5"><b className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#132622]/[0.06] text-[11px]">{i + 1}</b><span className="truncate font-medium">{r.name}</span></span><span className="num font-semibold tabular-nums">{inr(r.amount)}</span></div>
          <div className="h-1.5 overflow-hidden rounded-full bg-[#132622]/[0.06]"><span className="bar-wide block h-full rounded-full" style={{ width: `${(r.amount / max) * 100}%`, background: color, animationDelay: `${i * 90}ms` }} /></div>
        </li>
      ))}
    </ol>
  );
}

export function DueSoon({ items }) {
  if (!items.length) return <div className="py-8 text-center"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600/10 text-emerald-700"><Icon name="check" size={22} /></span><p className="mt-3 text-sm font-semibold">Nothing due soon</p><p className={`mt-1 text-xs ${MUTED}`}>No payments are overdue or due this week.</p></div>;
  return (
    <ul className="divide-y divide-[#132622]/[0.07]">
      {items.map((i, n) => (
        <li key={i.id} className="flex items-center justify-between gap-3 py-3.5" style={{ animation: "dash-row-in .45s ease both", animationDelay: `${n * 60}ms` }}>
          <div className="min-w-0"><p className="truncate text-sm font-medium">{i.party_name}</p><p className={`text-xs ${MUTED}`}>{i.invoice_no ? `${i.invoice_no} · ` : ""}due {day(i.due_date)}</p></div>
          <div className="shrink-0 text-right"><p className="num text-sm font-semibold">{inr(i.amount)}</p><Pill tone={TONE[i.status]}>{i.action === "collect" ? "Collect" : "Pay"} · {i.status === "overdue" ? `${i.days_overdue}d late` : i.status === "due_today" ? "today" : `in ${i.days_left}d`}</Pill></div>
        </li>
      ))}
    </ul>
  );
}

function Bar({ label, value, max, color }) {
  return (
    <div>
      <div className="mb-1.5 flex justify-between text-sm"><span>{label}</span><span className="num font-semibold"><CountUp value={value} /></span></div>
      <div className="h-2 overflow-hidden rounded-full bg-[#132622]/[0.06]"><span className="bar-wide block h-full rounded-full" style={{ width: `${Math.min(100, (Math.abs(value) / max) * 100)}%`, background: color }} /></div>
    </div>
  );
}
export function Position({ types, profit }) {
  const max = Math.max(1, ...Object.values(types).map(Math.abs)), net = types.asset - types.liability;
  const income = types.income, margin = income ? (profit / income) * 100 : 0;
  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#132622]/45">Financial position</p>
        <Bar label="Assets" value={types.asset} max={max} color="#1F5D46" /><Bar label="Liabilities" value={types.liability} max={max} color="#B9852F" /><Bar label="Equity" value={types.equity} max={max} color="#6D4AC7" />
        <div className="flex items-center justify-between border-t border-[#132622]/10 pt-3 text-sm"><span className={MUTED}>Assets minus liabilities</span><b className={`num ${net < 0 ? "text-rose-600" : "text-[#1F5D46]"}`}>{inr(net)}</b></div>
      </div>
      <div className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#132622]/45">Profit snapshot</p>
        <Bar label="Income" value={types.income} max={max} color="#1F5D46" /><Bar label="Expenses" value={types.expense} max={max} color="#C2410C" />
        <div className="flex items-center justify-between border-t border-[#132622]/10 pt-3 text-sm"><span className={MUTED}>Net profit{income ? ` (${margin.toFixed(1)}% margin)` : ""}</span><b className={`num ${profit < 0 ? "text-rose-600" : "text-[#1F5D46]"}`}>{inr(profit)}</b></div>
      </div>
    </div>
  );
}

const ago = (iso) => { const s = (Date.now() - new Date(iso.endsWith("Z") ? iso : iso + "Z")) / 1000; if (s < 60) return "just now"; if (s < 3600) return `${Math.floor(s / 60)} min ago`; if (s < 86400) return `${Math.floor(s / 3600)} h ago`; return `${Math.floor(s / 86400)} d ago`; };
export function Activity({ items }) {
  if (!items.length) return <p className={`py-6 text-center text-sm ${MUTED}`}>No activity recorded yet.</p>;
  const tone = { create: "bg-emerald-500", update: "bg-amber-500", delete: "bg-rose-500" }, word = { create: "Created", update: "Edited", delete: "Deleted" };
  return (
    <ol className="relative ml-2 border-l border-[#132622]/12">
      {items.map((a, i) => (
        <li key={a.id} className="relative pb-5 pl-6 last:pb-0" style={{ animation: "dash-row-in .45s ease both", animationDelay: `${i * 70}ms` }}>
          <span className={`absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-[#F6F3EA] ${tone[a.action]}`} />
          <p className="text-sm"><b>{word[a.action]}</b> <span className="text-[#132622]/70">{a.summary}</span></p>
          <p className={`mt-0.5 text-xs ${MUTED}`}>{a.user} · {ago(a.at)}{a.reason ? ` · ${a.reason}` : ""}</p>
        </li>
      ))}
    </ol>
  );
}

export function Recent({ rows }) {
  if (!rows.length) return <p className={`py-6 text-center text-sm ${MUTED}`}>Nothing in this period yet.</p>;
  return (
    <ul className="divide-y divide-[#132622]/[0.07]">
      {rows.slice(0, 5).map((r, i) => (
        <li key={r.id} className="flex items-center justify-between gap-3 py-3.5" style={{ animation: "dash-row-in .45s ease both", animationDelay: `${i * 65}ms` }}>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{r.party_name || "-"}</p>
            <p className={`truncate text-xs ${MUTED}`}>{day(r.date)}{r.invoice_no ? ` · ${r.invoice_no}` : ""}</p>
          </div>
          <span className="num shrink-0 text-sm font-semibold tabular-nums text-[#1F5D46]">{inr(r.total_amount)}</span>
        </li>
      ))}
    </ul>
  );
}