"use client";
import { useMemo, useState } from "react";
import Reveal from "@/app/components/Reveal";
import { CountUp, Empty, PageHeader } from "@/components/ui";
import { useAsync } from "@/hooks/useAsync";
import { api } from "@/lib/api";
import { inr } from "@/lib/format";
import "./dashboard.css";
import { derive, PERIODS } from "./derive";
import { Activity, DueSoon, Icon, Insights, Panel, Position, QuickActions, Recent, StatCard, TopList, TrendChart } from "./widgets";

async function load() {
  const accts = await api("/accounts");
  const [bals, sales, purchases, rem, customers, vendors, audit] = await Promise.all([
    Promise.all(accts.map((a) => api(`/accounts/${a.id}/balance`).catch(() => null))),
    api("/sales-entries").catch(() => []), api("/purchase-entries").catch(() => []), api("/reminders?days=30").catch(() => null),
    api("/customers").catch(() => []), api("/vendors").catch(() => []), api("/audit-logs?limit=6").catch(() => null),
  ]);
  return { accts, bals, sales, purchases, rem, customers, vendors, audit: audit?.items || [] };
}

const greeting = () => { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; };
const Section = ({ title, sub, right }) => (
  <div className="mb-3 mt-9 flex items-end justify-between gap-3"><div><h2 className="font-serif text-xl font-medium text-[#132622]">{title}</h2>{sub && <p className="mt-0.5 text-xs text-[#132622]/55">{sub}</p>}</div>{right}</div>
);

export default function Dashboard() {
  const { data, error, loading, reload } = useAsync(load);
  const [period, setPeriod] = useState("month");
  const d = useMemo(() => (data ? derive(data, period) : null), [data, period]);
  const label = PERIODS.find((p) => p[0] === period)[1].toLowerCase();

  if (loading && !data) return (
    <><PageHeader eyebrow="Overview" title="Dashboard" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{Array.from({ length: 10 }).map((_, i) => <div key={i} className="dash-skeleton h-[116px] rounded-2xl" style={{ animationDelay: `${i * 70}ms` }} />)}</div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2"><div className="dash-skeleton h-72 rounded-2xl" /><div className="dash-skeleton h-72 rounded-2xl" /></div></>
  );
  if (error) return <><PageHeader eyebrow="Overview" title="Dashboard" /><Empty error>{error}</Empty></>;

  const stats = [
    { label: `Sales (${label})`, value: d.salesTaxable, icon: "sales", color: "green", hint: `${d.salesCount} invoice${d.salesCount === 1 ? "" : "s"}` },
    { label: `Purchases (${label})`, value: d.purchTaxable, icon: "purchase", color: "gold", hint: `${d.purchCount} bill${d.purchCount === 1 ? "" : "s"}` },
    { label: "Customers owe you", value: d.owed, icon: "customer", color: "blue", hint: `${d.counts.customers} customers` },
    { label: "You owe suppliers", value: d.owe, icon: "supplier", color: "violet", hint: `${d.counts.vendors} vendors` },
    { label: "Cash and bank", value: d.cashBank, icon: "wallet", color: "green", bad: d.cashBank < 0 },
    { label: "Net profit (all time)", value: d.profit, icon: "trend", color: "green", bad: d.profit < 0 },
    { label: "Net GST payable", value: d.netGst, icon: "gst", color: "gold", hint: `Collected ${inr(d.salesGst)} · paid ${inr(d.purchGst)}` },
    { label: "To collect (30 days)", value: d.rem?.summary.to_collect || 0, icon: "bell", color: "blue" },
    { label: "Overdue payments", value: d.overdue, money: false, icon: "alert", color: "rose", bad: d.overdue > 0 },
    { label: "Ledger check", money: false, text: d.balanced ? "Balanced ✓" : `Off by ${inr(d.dr - d.cr)}`, icon: "check", color: d.balanced ? "green" : "rose", bad: !d.balanced },
  ];

  return (
    <>
      <PageHeader eyebrow="Overview" title="Dashboard">
        <button type="button" onClick={reload} className="btn btn-line btn-sm" aria-label="Refresh the numbers">Refresh</button>
      </PageHeader>

      <Reveal>
        <div className="relative mb-6 overflow-hidden rounded-3xl border border-[#1F5D46]/10 bg-gradient-to-br from-[#1F5D46] via-[#194B3A] to-[#132622] p-6 text-white shadow-lg shadow-[#132622]/10 sm:p-8">
          <span className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full border border-white/[0.08]" />
          <span className="pointer-events-none absolute -right-5 -top-14 h-52 w-52 rounded-full border border-white/[0.08]" />
          <span className="dash-orb pointer-events-none absolute -right-10 bottom-[-100px] h-64 w-64 rounded-full bg-emerald-300/10 blur-3xl" />
          <div className="relative z-10 grid items-end gap-6 lg:grid-cols-[1.3fr_1fr]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-100/65">{new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
              <h2 className="mt-3 font-serif text-3xl font-medium tracking-tight sm:text-4xl">{greeting()}. Here are your books.</h2>
              <div className="mt-5 flex flex-wrap gap-2">
                {[["book", `${d.counts.accounts} accounts`], ["customer", `${d.counts.customers} customers`], ["supplier", `${d.counts.vendors} vendors`]].map(([ic, t]) => (
                  <span key={t} className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs text-white/85 backdrop-blur"><Icon name={ic} size={14} />{t}</span>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-white/12 bg-white/[0.07] p-5 backdrop-blur">
              <p className="text-xs text-white/60">Net profit, all time</p>
              <p className="num mt-1 text-3xl font-semibold tracking-tight"><CountUp value={d.profit} /></p>
              <svg viewBox="0 0 200 40" className="mt-3 w-full" aria-hidden="true"><path className="dash-spark" d={`M0 ${34 - d.series[0].sales / (Math.max(1, ...d.series.map((s) => s.sales)) ) * 28} ${d.series.map((s, i) => `L${(i / 5) * 200} ${34 - (s.sales / Math.max(1, ...d.series.map((x) => x.sales))) * 28}`).join(" ")}`} fill="none" stroke="#E7C27A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              <p className="mt-1 text-[11px] text-white/50">Sales trend, last 6 months</p>
            </div>
          </div>
        </div>
      </Reveal>

      <QuickActions />

      <Section title="Needs your attention" sub="Things worth a look today" />
      <Insights items={d.insights} />

      <Section title="Business overview" sub="Key figures from your books"
        right={<div className="flex flex-wrap gap-2">{PERIODS.map(([v, l]) => <button key={v} type="button" className={`chip ${period === v ? "on" : ""}`} onClick={() => setPeriod(v)}>{l}</button>)}</div>} />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{stats.map((s, i) => <StatCard key={s.label} {...s} delay={i * 50} />)}</div>

      <Section title="Performance" sub="How the business is moving" />
      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <Panel title="Sales and purchases" sub="Last six months, before GST" icon="trend"><TrendChart series={d.series} /></Panel>
        <Panel title="Due soon" sub="Overdue and upcoming payments" icon="clock" tone="gold" right={<a href="/reminders" className="text-xs font-semibold text-[#1F5D46] underline-offset-4 hover:underline">View all</a>}><DueSoon items={d.dues} /></Panel>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Panel title="Top customers" sub={`By sales, ${label}`} icon="customer" tone="blue"><TopList rows={d.topCustomers} color="#1F5D46" empty="No sales in this period." /></Panel>
        <Panel title="Top suppliers" sub={`By purchases, ${label}`} icon="supplier" tone="violet"><TopList rows={d.topSuppliers} color="#B9852F" empty="No purchases in this period." /></Panel>
      </div>

      <div className="mt-5"><Panel title="Position and profit" sub="Balances across your accounts" icon="wallet"><Position types={d.types} profit={d.profit} /></Panel></div>

      <Section title="Accounting health" />
      <Reveal>
        <div className="overflow-hidden rounded-2xl border border-[#132622]/10 bg-white/75 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div><h2 className="font-serif text-xl font-medium text-[#132622]">Trial balance overview</h2><p className="mt-1 text-xs text-[#132622]/55">Total debit and credit movement across your accounts</p></div>
            <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${d.balanced ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}><span className={`h-2 w-2 rounded-full ${d.balanced ? "bg-emerald-500" : "bg-rose-500"}`} />{d.balanced ? "Books balanced" : "Difference detected"}</span>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {[["Total debit", d.dr, "text-[#1F5D46]", "bg-[#1F5D46]/[0.045]", "bg-emerald-600"], ["Total credit", d.cr, "text-amber-700", "bg-amber-500/[0.055]", "bg-amber-500"]].map(([l, v, c, bg, bar]) => (
              <div key={l} className={`rounded-xl p-4 ${bg}`}><p className="text-xs text-[#132622]/55">{l}</p><p className={`num mt-2 text-2xl font-semibold ${c}`}>{inr(v)}</p><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-black/5"><div className={`bar-wide h-full w-full rounded-full ${bar}`} /></div></div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-[#132622]/10 pt-4 text-xs"><span className="text-[#132622]/55">Difference</span><span className={`num font-semibold ${d.balanced ? "text-emerald-700" : "text-rose-600"}`}>{inr(Math.abs(d.dr - d.cr))}</span></div>
        </div>
      </Reveal>

      <Section title="Recent activity" sub="Latest transactions and changes" />
      <div className="grid gap-5 lg:grid-cols-2 2xl:grid-cols-3">
        <Panel title="Latest sales" sub={label[0].toUpperCase() + label.slice(1)} icon="sales"><Recent rows={d.sales} who="Customer" /></Panel>
        <Panel title="Latest purchases" sub={label[0].toUpperCase() + label.slice(1)} icon="purchase" tone="gold"><Recent rows={d.purchases} who="Supplier" /></Panel>
        <Panel className="lg:col-span-2 2xl:col-span-1" title="Recent changes" sub="From the audit log" icon="shield" tone="violet" right={<a href="/audit" className="text-xs font-semibold text-[#1F5D46] underline-offset-4 hover:underline">Open</a>}><Activity items={data.audit} /></Panel>
      </div>
    </>
  );
}