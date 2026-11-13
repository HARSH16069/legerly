"use client";
import { Select } from "@/components/ui";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Reveal from "@/app/components/Reveal";

import {
  Btn,
  Card,
  Empty,
  Field,
  Input,
  Modal,
  PageHeader,
  Pill,
  Side,
} from "@/components/ui";

import { useAsync } from "@/hooks/useAsync";
import { api, API_URL } from "@/lib/api";
import { day, drcr, inr, today } from "@/lib/format";

const ORDER = ["asset", "liability", "equity", "income", "expense"];

const TONE = {
  Sales: "ok",
  Purchase: "warn",
  Journal: "mute",
  Payment: "ok",
};

const fyStart = () => {
  const d = new Date();
  return `${d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1}-04-01`;
};

const RANGES = [
  ["All time", () => ["", ""]],
  ["This month", () => [`${today().slice(0, 7)}-01`, today()]],
  ["This financial year", () => [fyStart(), today()]],
];

function Icon({ name, size = 18 }) {
  const paths = {
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5M12 15V3"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></>,
    wallet: <><rect x="3" y="5" width="18" height="15" rx="2"/><path d="M3 9h18M16 14h2"/></>,
    arrow: <><path d="M7 17 17 7M7 7h10v10"/></>,
    chart: <><path d="M3 3v18h18"/><path d="m7 14 4-4 4 4 6-7"/></>,
    filter: <><path d="M4 6h16M7 12h10M10 18h4"/></>,
    close: <><path d="m18 6-12 12M6 6l12 12"/></>,
    file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h8"/></>,
    book: <><path d="M4 4h16v16H4z"/><path d="M8 4v16M12 8h5M12 12h5"/></>,
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] || paths.file}
    </svg>
  );
}

function SummaryCard({ label, value, icon, color, delay = 0, subtitle }) {
  const [shown, setShown] = useState(false);

  return (
    <div
      className="ledger-summary group relative overflow-hidden rounded-2xl border border-[#132622]/10 bg-white p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-[#132622]/[0.06]"
      style={{ animationDelay: `${delay}ms` }}
      onMouseEnter={() => setShown(true)}
      onMouseLeave={() => setShown(false)}
    >
      <div className={`absolute -right-8 -top-8 h-28 w-28 rounded-full blur-2xl opacity-20 ${color}`} />

      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-[#132622]/50">{label}</p>
          <p className="mt-3 text-xl font-semibold tracking-tight text-[#132622] sm:text-2xl">
            {value}
          </p>
          {subtitle && (
            <p className="mt-2 text-[11px] text-[#132622]/40">{subtitle}</p>
          )}
        </div>

        <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${color} bg-opacity-10 text-[#1F5D46] transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110`}>
          <Icon name={icon} />
        </span>
      </div>

      <div className="relative mt-5 h-1 overflow-hidden rounded-full bg-[#132622]/[0.06]">
        <div
          className="h-full w-2/3 rounded-full bg-[#1F5D46]/60 transition-all duration-700 group-hover:w-full"
        />
      </div>
    </div>
  );
}

function EntryModal({ id, onClose }) {
  const { data, error, loading } = useAsync(
    () => api(`/journal-entries/${id}`),
    [id]
  );

  return (
    <Modal
      title={`Transaction #${id}`}
      sub={data ? `${day(data.date)}${data.narration ? ` · ${data.narration}` : ""}` : "Transaction details"}
      onClose={onClose}
    >
      {loading ? (
        <Empty>Loading transaction...</Empty>
      ) : error ? (
        <Empty error>{error}</Empty>
      ) : (
        <>
          <div className="mb-4 rounded-xl bg-[#1F5D46]/[0.05] p-4">
            <p className="text-xs text-[#132622]/50">Transaction date</p>
            <p className="mt-1 font-semibold text-[#132622]">{day(data.date)}</p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#132622]/10">
            <table className="tbl w-full">
              <thead>
                <tr>
                  <th>Account</th>
                  <th className="num">Debit</th>
                  <th className="num">Credit</th>
                </tr>
              </thead>
              <tbody>
                {data.lines.map((line, i) => (
                  <tr key={i}>
                    <td className="font-medium">{line.account_name}</td>
                    <td className="num">{Number(line.debit) ? inr(line.debit) : "—"}</td>
                    <td className="num">{Number(line.credit) ? inr(line.credit) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Modal>
  );
}

function exportCsv(acct, rows) {
  if (!acct) return;

  const q = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;

  const head = [
    "Date", "Voucher", "No.", "Reference",
    "Particulars", "Narration", "Debit",
    "Credit", "Balance", "Side",
  ];

  const body = rows.map((r) =>
    [
      r.date,
      r.voucher,
      r.entry_id,
      r.invoice_no,
      r.particulars.join("; "),
      r.narration,
      r.debit || "",
      r.credit || "",
      Math.abs(r.balance).toFixed(2),
      drcr(acct.account_type, r.balance).side,
    ].map(q).join(",")
  );

  const blob = new Blob(
    [[head.map(q).join(","), ...body].join("\n")],
    { type: "text/csv;charset=utf-8;" }
  );

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ledger-${acct.name}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function FinancialBadge({ side }) {
  const debit = String(side).toLowerCase().includes("dr");

  return (
    <span className={`ml-2 inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold ${
      debit
        ? "bg-emerald-50 text-emerald-700"
        : "bg-amber-50 text-amber-700"
    }`}>
      {side}
    </span>
  );
}

export default function Ledger() {
  const router = useRouter();
  const id = useSearchParams().get("account") || "";

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [find, setFind] = useState("");
  const [entry, setEntry] = useState(null);
  const [voucherFilter, setVoucherFilter] = useState("All");

  const accounts = useAsync(() => api("/accounts"), []);

  const contacts = useAsync(async () => {
    const [c, v] = await Promise.all([
      api("/customers").catch(() => []),
      api("/vendors").catch(() => []),
    ]);

    const m = {};

    c.forEach((p) => {
      m[p.account_id] = { ...p, kind: "Customer" };
    });

    v.forEach((p) => {
      m[p.account_id] = { ...p, kind: "Vendor" };
    });

    return m;
  }, []);

  const led = useAsync(() => {
    if (!id) return Promise.resolve(null);

    const q = new URLSearchParams();
    if (from) q.set("date_from", from);
    if (to) q.set("date_to", to);

    return api(`/account-ledger/${id}?${q}`);
  }, [id, from, to]);

  const raw = led.data;
  const valid = !!(raw && raw.account && Array.isArray(raw.rows));

  const d =
    valid && String(raw.account.id) === String(id) ? raw : null;

  const acct = d?.account;
  const party = acct && contacts.data?.[acct.id];

  const text = find.trim().toLowerCase();

  const rows = useMemo(() => {
    if (!d) return [];

    return d.rows.filter((r) => {
      const matchesText =
        !text ||
        [
          r.narration,
          r.invoice_no,
          r.voucher,
          r.particulars.join(" "),
        ].join(" ").toLowerCase().includes(text);

      const matchesVoucher =
        voucherFilter === "All" || r.voucher === voucherFilter;

      return matchesText && matchesVoucher;
    });
  }, [d, text, voucherFilter]);

  const fmtText = (v) => {
    const b = drcr(acct?.account_type, v);
    return `${b.text} ${b.side}`;
  };

  const totalDebit = Number(d?.total_debit || 0);
  const totalCredit = Number(d?.total_credit || 0);

  const netMovement = totalDebit - totalCredit;

  return (
    <div className="ledger-page min-w-0 max-w-full pb-8">
      <style>{`
        @keyframes ledger-enter {
          from {
            opacity: 0;
            transform: translateY(15px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes ledger-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        .ledger-summary {
          animation: ledger-enter .55s cubic-bezier(.2,.7,.2,1) both;
        }

        .ledger-row {
          animation: ledger-enter .35s ease both;
        }

        .ledger-table tbody tr {
          transition: background .2s ease;
        }

        .ledger-table tbody tr:hover {
          background: rgba(31,93,70,.045);
        }

        .ledger-skeleton {
          background: linear-gradient(
            100deg,
            rgba(19,38,34,.04) 30%,
            rgba(19,38,34,.10) 50%,
            rgba(19,38,34,.04) 70%
          );
          background-size: 200% 100%;
          animation: ledger-shimmer 1.4s infinite linear;
        }

        @media (prefers-reduced-motion: reduce) {
          .ledger-summary,
          .ledger-row,
          .ledger-skeleton {
            animation: none !important;
          }

          .ledger-table tbody tr {
            transition: none !important;
          }
        }
      `}</style>

      <PageHeader eyebrow="BOOKS / FINANCIAL RECORDS" title="Account Ledger">
        {d && (
          <Btn variant="line" onClick={() => exportCsv(acct, rows)}>
            <span className="flex items-center gap-2">
              <Icon name="download" size={15} />
              Export CSV
            </span>
          </Btn>
        )}
      </PageHeader>

      {/* ACCOUNT SELECTOR */}
      <Reveal>
        <Card className="mb-6 overflow-hidden !rounded-2xl !border !border-[#132622]/10 !bg-white/80">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-serif text-xl font-medium text-[#132622]">
                Ledger workspace
              </h2>
              <p className="mt-1 text-xs text-[#132622]/50">
                Select an account and explore its financial history.
              </p>
            </div>

            <span className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold text-emerald-700">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              Live records
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)]">
            <Field label="Select account" className="sm:col-span-2 xl:col-span-1">
              <Select
                value={id}
                onChange={(e) =>
                  router.push(
                    e.target.value
                      ? `/ledger?account=${e.target.value}`
                      : "/ledger"
                  )
                }
              >
                <option value="">
                  {accounts.loading ? "Loading accounts..." : "Choose an account"}
                </option>

                {ORDER.map((type) => {
                  const list = (
                    Array.isArray(accounts.data) ? accounts.data : []
                  ).filter((a) => a && a.account_type === type);

                  return list.length > 0 ? (
                    <optgroup
                      key={type}
                      label={type.charAt(0).toUpperCase() + type.slice(1)}
                    >
                      {list.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </optgroup>
                  ) : null;
                })}
              </Select>
            </Field>

            <Field label="From date">
              <Input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </Field>

            <Field label="To date">
              <Input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </Field>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#132622]/[0.07] pt-4">
            <span className="mr-1 text-xs font-medium text-[#132622]/45">
              Quick filters:
            </span>

            {RANGES.map(([label, fn]) => {
              const [a, b] = fn();

              const active = from === a && to === b;

              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    setFrom(a);
                    setTo(b);
                  }}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                    active
                      ? "border-[#1F5D46] bg-[#1F5D46] text-white shadow-sm"
                      : "border-[#132622]/10 bg-white text-[#132622]/60 hover:border-[#1F5D46]/40 hover:text-[#1F5D46]"
                  }`}
                >
                  {label}
                </button>
              );
            })}

            {(from || to) && (
              <button
                type="button"
                onClick={() => {
                  setFrom("");
                  setTo("");
                }}
                className="ml-auto text-xs font-semibold text-rose-600 hover:text-rose-700"
              >
                Clear dates
              </button>
            )}
          </div>
        </Card>
      </Reveal>

      {!id ? (
        <Reveal>
          <div className="rounded-3xl border border-dashed border-[#1F5D46]/25 bg-white/60 px-6 py-16 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#1F5D46]/[0.08] text-[#1F5D46]">
              <Icon name="book" size={30} />
            </div>
            <h2 className="mt-5 font-serif text-2xl text-[#132622]">
              Your ledger starts here
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#132622]/50">
              Choose an account above to explore transactions, balances,
              debit and credit movements.
            </p>
          </div>
        </Reveal>
      ) : led.loading && !d ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="ledger-skeleton h-32 rounded-2xl"
            />
          ))}
        </div>
      ) : led.error ? (
        <Empty error>{led.error}</Empty>
      ) : raw && !valid ? (
        <Empty error>
          The server answered, but not with ledger data. Open{" "}
          {`${API_URL}/account-ledger/${id}`} in your browser to inspect its
          response. Check routers/ledger.py and main.py.
        </Empty>
      ) : !d ? (
        <Empty>Loading ledger...</Empty>
      ) : (
        <>
          {/* ACCOUNT HERO */}
          <Reveal>
            <div className="relative mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-[#1F5D46] via-[#194B3A] to-[#132622] p-6 text-white shadow-lg shadow-[#132622]/10 sm:p-8">
              <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full border border-white/10" />
              <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full border border-white/10" />

              <div className="relative z-10 flex flex-wrap items-start justify-between gap-6">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-emerald-100">
                      {acct.account_type}
                    </span>
                    <span className="rounded-full bg-emerald-300/15 px-3 py-1 text-[10px] font-medium text-emerald-100">
                      Account active
                    </span>
                  </div>

                  <h2 className="mt-5 break-words font-serif text-3xl font-medium tracking-tight sm:text-4xl">
                    {acct.name}
                  </h2>

                  <p className="mt-2 text-sm text-white/55">
                    Account ID: #{acct.id}
                    {party ? ` · ${party.kind}` : ""}
                  </p>
                </div>

                <div className="min-w-[190px] max-w-full rounded-2xl border border-white/15 bg-white/[0.08] p-5 backdrop-blur-sm">
                  <p className="text-xs text-white/55">Closing balance</p>
                  <p className="mt-2 text-2xl font-semibold tracking-tight">
                    {inr(d.closing)}
                  </p>
                  <p className="mt-2 text-xs font-medium text-emerald-200">
                    {fmtText(d.closing)}
                  </p>
                </div>
              </div>

              <div className="relative z-10 mt-8 flex flex-wrap items-center gap-x-7 gap-y-3 border-t border-white/15 pt-5 text-xs text-white/60">
                <span className="flex items-center gap-2">
                  <Icon name="calendar" size={15} />
                  Ledger statement
                </span>
                <span className="flex items-center gap-2">
                  <Icon name="file" size={15} />
                  {d.rows.length} transactions
                </span>
                <span className="flex items-center gap-2">
                  <Icon name="chart" size={15} />
                  Financial records
                </span>
              </div>
            </div>
          </Reveal>

          {/* SUMMARY */}
          <div className="mb-7">
            <div className="mb-3">
              <h2 className="font-serif text-xl font-medium text-[#132622]">
                Financial summary
              </h2>
              <p className="mt-1 text-xs text-[#132622]/45">
                Account position for the selected period
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryCard
                label={from ? "Brought forward" : "Opening balance"}
                value={inr(d.opening)}
                icon="wallet"
                color="bg-sky-500"
                delay={0}
              />

              <SummaryCard
                label="Total debit"
                value={inr(d.total_debit)}
                icon="arrow"
                color="bg-emerald-500"
                delay={70}
                subtitle="Debit movement"
              />

              <SummaryCard
                label="Total credit"
                value={inr(d.total_credit)}
                icon="chart"
                color="bg-amber-500"
                delay={140}
                subtitle="Credit movement"
              />

              <SummaryCard
                label="Closing balance"
                value={inr(d.closing)}
                icon="wallet"
                color="bg-violet-500"
                delay={210}
                subtitle={fmtText(d.closing)}
              />
            </div>
          </div>

          {/* PARTY DETAILS */}
          {party && (
            <Reveal>
              <Card className="mb-6 !rounded-2xl !border !border-[#132622]/10 !bg-white/80">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-[#132622]/40">
                      Account contact
                    </p>
                    <h2 className="mt-1 font-serif text-xl font-medium text-[#132622]">
                      {party.display_name}
                    </h2>
                  </div>
                  <Pill>{party.kind}</Pill>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {[
                    ["Company", party.company_name],
                    ["Email", party.email],
                    ["Mobile", party.mobile],
                    ["GSTIN", party.gstin],
                    ["PAN", party.pan],
                    [
                      "City",
                      party.addresses?.[0] &&
                        [
                          party.addresses[0].city,
                          party.addresses[0].state,
                        ].filter(Boolean).join(", "),
                    ],
                  ]
                    .filter((item) => item[1])
                    .map(([label, value]) => (
                      <div key={label}>
                        <p className="text-[11px] text-[#132622]/40">
                          {label}
                        </p>
                        <p className="mt-1 break-words text-sm font-medium text-[#132622]">
                          {value}
                        </p>
                      </div>
                    ))}
                </div>
              </Card>
            </Reveal>
          )}

          {/* REGISTER */}
          <Reveal>
            <Card className="overflow-hidden !rounded-2xl !border !border-[#132622]/10 !bg-white/80 !p-0">
              <div className="border-b border-[#132622]/10 p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-[#132622]/40">
                      Transaction history
                    </p>
                    <h2 className="mt-1 font-serif text-2xl font-medium text-[#132622]">
                      Ledger register
                    </h2>
                    <p className="mt-1 text-xs text-[#132622]/45">
                      {rows.length} of {d.rows.length} transactions
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => exportCsv(acct, rows)}
                    className="inline-flex items-center gap-2 rounded-xl border border-[#1F5D46]/20 bg-[#1F5D46]/[0.05] px-4 py-2.5 text-xs font-semibold text-[#1F5D46] transition hover:bg-[#1F5D46] hover:text-white"
                  >
                    <Icon name="download" size={15} />
                    Export
                  </button>
                </div>

                <div className="mt-5 flex flex-col gap-3 lg:flex-row">
                  <div className="relative min-w-0 flex-1">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#132622]/35">
                      <Icon name="search" size={17} />
                    </span>
                    <input
                      value={find}
                      onChange={(e) => setFind(e.target.value)}
                      placeholder="Search narration, voucher, reference..."
                      className="h-11 w-full rounded-xl border border-[#132622]/10 bg-[#F7F7F3] pl-10 pr-4 text-sm text-[#132622] outline-none transition focus:border-[#1F5D46]/50 focus:bg-white focus:ring-4 focus:ring-[#1F5D46]/[0.06]"
                    />
                  </div>

                  <select
                    value={voucherFilter}
                    onChange={(e) => setVoucherFilter(e.target.value)}
                    className="h-11 rounded-xl border border-[#132622]/10 bg-[#F7F7F3] px-4 text-sm text-[#132622] outline-none transition focus:border-[#1F5D46]/50"
                  >
                    <option value="All">All vouchers</option>
                    <option value="Sales">Sales</option>
                    <option value="Purchase">Purchase</option>
                    <option value="Journal">Journal</option>
                    <option value="Payment">Payment</option>
                  </select>
                </div>
              </div>

              {/* TABLE */}
              <div className="w-0 min-w-full overflow-x-auto">
                <table className="ledger-table w-full min-w-[1050px] border-collapse text-left">
                  <thead>
                    <tr className="bg-[#F7F7F3] text-[10px] font-semibold uppercase tracking-wider text-[#132622]/45">
                      <th className="px-5 py-4">Date</th>
                      <th className="px-4 py-4">Voucher</th>
                      <th className="px-4 py-4">Particulars</th>
                      <th className="px-4 py-4">Reference</th>
                      <th className="px-4 py-4">Narration</th>
                      <th className="px-4 py-4 text-right">Debit</th>
                      <th className="px-4 py-4 text-right">Credit</th>
                      <th className="px-5 py-4 text-right">Balance</th>
                    </tr>
                  </thead>

                  <tbody className="text-sm">
                    <tr className="border-b border-[#132622]/[0.07] bg-[#1F5D46]/[0.035]">
                      <td colSpan={7} className="px-5 py-4 text-xs font-semibold text-[#132622]/65">
                        Opening balance
                      </td>
                      <td className="px-5 py-4 text-right font-semibold text-[#132622]">
                        {fmtText(d.opening)}
                      </td>
                    </tr>

                    {rows.map((r, i) => (
                      <tr
                        key={`${r.entry_id}-${i}`}
                        onClick={() => setEntry(r.entry_id)}
                        className="ledger-row cursor-pointer border-b border-[#132622]/[0.06]"
                        style={{
                          animationDelay: `${Math.min(i, 15) * 35}ms`,
                        }}
                      >
                        <td className="whitespace-nowrap px-5 py-4 text-xs text-[#132622]/60">
                          {day(r.date)}
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <Pill tone={TONE[r.voucher] || "mute"}>
                              {r.voucher}
                            </Pill>
                          </div>
                          <p className="mt-1 text-[10px] text-[#132622]/40">
                            #{r.entry_id}
                          </p>
                        </td>

                        <td className="max-w-[200px] truncate px-4 py-4 font-medium text-[#132622]">
                          {r.particulars.join(", ") || "—"}
                        </td>

                        <td className="px-4 py-4 text-xs text-[#132622]/55">
                          {r.invoice_no || "—"}
                        </td>

                        <td className="max-w-[220px] truncate px-4 py-4 text-xs text-[#132622]/55">
                          {r.narration || "—"}
                        </td>

                        <td className="whitespace-nowrap px-4 py-4 text-right font-medium tabular-nums text-emerald-700">
                          {r.debit ? inr(r.debit) : "—"}
                        </td>

                        <td className="whitespace-nowrap px-4 py-4 text-right font-medium tabular-nums text-amber-700">
                          {r.credit ? inr(r.credit) : "—"}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-right">
                          <p className="font-semibold tabular-nums text-[#132622]">
                            {inr(Math.abs(r.balance))}
                          </p>
                          <p className="mt-0.5 text-[10px] text-[#1F5D46]">
                            {drcr(acct.account_type, r.balance).side}
                          </p>
                        </td>
                      </tr>
                    ))}

                    {!rows.length && (
                      <tr>
                        <td colSpan={8} className="px-5 py-12 text-center">
                          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#1F5D46]/[0.07] text-[#1F5D46]">
                            <Icon name="search" size={22} />
                          </div>
                          <p className="mt-3 text-sm font-semibold text-[#132622]">
                            No transactions found
                          </p>
                          <p className="mt-1 text-xs text-[#132622]/45">
                            Try another search or change the voucher filter.
                          </p>
                        </td>
                      </tr>
                    )}

                    <tr className="bg-[#F7F7F3]">
                      <td colSpan={5} className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-[#132622]/65">
                        Total movement
                      </td>
                      <td className="px-4 py-4 text-right font-bold tabular-nums text-emerald-700">
                        {inr(d.total_debit)}
                      </td>
                      <td className="px-4 py-4 text-right font-bold tabular-nums text-amber-700">
                        {inr(d.total_credit)}
                      </td>
                      <td className="px-5 py-4 text-right font-bold text-[#132622]">
                        {fmtText(d.closing)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#132622]/10 px-5 py-4 text-[11px] text-[#132622]/45">
                <span>Showing {rows.length} transactions</span>
                <span>Click any transaction to view its details</span>
              </div>
            </Card>
          </Reveal>
        </>
      )}

      {entry && (
        <EntryModal
          id={entry}
          onClose={() => setEntry(null)}
        />
      )}
    </div>
  );
}