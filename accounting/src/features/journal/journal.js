"use client";

import Link from "next/link";
import { Fragment, useState } from "react";

import Reveal from "@/app/components/Reveal";
import NewAccountModal from "./popup";
import {
  Btn,
  Card,
  Confirm,
  CountUp,
  Empty,
  Field,
  Input,
  Modal,
  PageHeader,
  Pill,
  Side,
  Select,
  useToast,
} from "@/components/ui"

import { useAsync } from "@/hooks/useAsync";
import { api, send } from "@/lib/api";
import { day, drcr, inr, today } from "@/lib/format";

// --------------------------------------------------
// Helpers & constants
// --------------------------------------------------

const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const line = () => ({ k: Math.random().toString(36).slice(2), name: "", dr: "", cr: "" });
const fresh = () => ({ date: today(), narration: "", reference: "" });
const csvCell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;

const PAGE_SIZES = [10, 25, 50, 100];
const FILTERS = { search: "", from: "", to: "", sort: "newest", page: 1, size: 25 };

const SIDES = [
  { key: "dr", other: "cr", label: "Debit", tag: "Dr", on: "bg-emerald-50 ring-emerald-600/40", hover: "hover:ring-emerald-600/30", badge: "bg-emerald-600 text-white", text: "text-emerald-700", tile: "ring-emerald-600/15" },
  { key: "cr", other: "dr", label: "Credit", tag: "Cr", on: "bg-sky-50 ring-sky-600/40", hover: "hover:ring-sky-600/30", badge: "bg-sky-600 text-white", text: "text-sky-700", tile: "ring-sky-600/15" },
];

const HEAD_FIELDS = [
  ["date", "Date", { type: "date" }],
  ["narration", "Narration", { placeholder: "What is this entry for?" }],
  ["reference", "Reference", { placeholder: "Optional" }],
];

const AMOUNT_INPUT =
  "w-full min-w-0 bg-transparent text-right text-sm font-semibold tabular-nums outline-none placeholder:font-normal placeholder:text-[#132622]/25 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

const BOX = "rounded-xl border border-[#132622]/10 bg-[#132622]/[0.025]";
const MUTED = "text-[#132622]/55";
const ROW_BTN = "rounded-lg border px-2.5 py-1.5 transition";

const byDate = (a, b) => new Date(a.date) - new Date(b.date) || Number(a.id) - Number(b.id);
const SORTS = {
  newest: (a, b) => byDate(b, a),
  oldest: byDate,
  highest: (a, b) => Number(b.total || 0) - Number(a.total || 0),
  lowest: (a, b) => Number(a.total || 0) - Number(b.total || 0),
};

function getEntryTotals(entry) {
  const lines = Array.isArray(entry?.lines) ? entry.lines : [];

  if (lines.length) {
    const sum = (k) => r2(lines.reduce((s, l) => s + Number(l[k] || 0), 0));
    return { debit: sum("debit"), credit: sum("credit") };
  }

  const fallback = Number(entry?.total || 0);
  return {
    debit: Number(entry?.total_debit ?? fallback),
    credit: Number(entry?.total_credit ?? fallback),
  };
}

const isBalanced = (t) => r2(t.debit) === r2(t.credit);

// --------------------------------------------------
// Page
// --------------------------------------------------

export default function Journal() {
  const toast = useToast();

  // Journal form
  const [head, setHead] = useState(fresh);
  const [lines, setLines] = useState([line(), line()]);
  const [editId, setEditId] = useState(null);

  // Account lookup
  const [bal, setBal] = useState({});
  const [look, setLook] = useState("");
  const [newAcct, setNewAcct] = useState(false);

  // Confirmation + details
  const [ask, setAsk] = useState(null);
  const [busy, setBusy] = useState(false);
  const [detailId, setDetailId] = useState(null);
  const [detailEntry, setDetailEntry] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Register filters
  const [f, setF] = useState(FILTERS);
  const setFilter = (patch) => setF((s) => ({ ...s, page: 1, ...patch }));
  const onFilter = (k) => (e) => setFilter({ [k]: e.target.value });

  // API data
  const accounts = useAsync(() => api("/accounts"), []);
  const reg = useAsync(() => api("/manual-journal"), []);

  const contacts = useAsync(async () => {
    const [c, v] = await Promise.all([
      api("/customers").catch(() => []),
      api("/vendors").catch(() => []),
    ]);

    const m = {};
    c.forEach((p) => (m[p.account_id] = { ...p, kind: "Customer" }));
    v.forEach((p) => (m[p.account_id] = { ...p, kind: "Vendor" }));
    return m;
  }, []);

  const list = Array.isArray(accounts.data) ? accounts.data : [];
  const byName = Object.fromEntries(list.map((a) => [a.name, a]));
  const byId = Object.fromEntries(list.map((a) => [a.id, a]));
  const register = Array.isArray(reg.data) ? reg.data.filter((e) => e && e.id != null) : [];

  // --------------------------------------------------
  // Line editing
  // --------------------------------------------------

  async function loadBal(account) {
    if (!account || bal[account.id]) return;

    try {
      const result = await api(`/accounts/${account.id}/balance`);
      setBal((s) => ({ ...s, [account.id]: result }));
    } catch (error) {
      console.error("Account balance error:", error);
    }
  }

  const upd = (k, patch) =>
    setLines((cur) => cur.map((l) => (l.k === k ? { ...l, ...patch } : l)));

  function setName(l, name) {
    upd(l.k, { name });
    setLook(name);
    loadBal(byName[name]);
  }

  const remove = (l) =>
    lines.length <= 2
      ? upd(l.k, { name: "", dr: "", cr: "" })
      : setLines((cur) => cur.filter((x) => x.k !== l.k));

  // After a new account is created: refresh the list and drop it into the first empty line
  function accountCreated(name) {
    accounts.reload();
    setNewAcct(false);
    setLook(name);
    setLines((cur) => {
      const i = cur.findIndex((l) => !l.name);
      return i < 0
        ? [...cur, { ...line(), name }]
        : cur.map((l, j) => (j === i ? { ...l, name } : l));
    });
    toast(`Account “${name}” created.`);
  }

  const setHeadK = (k) => (e) => setHead((cur) => ({ ...cur, [k]: e.target.value }));

  // --------------------------------------------------
  // Debit / credit calculations
  // --------------------------------------------------

  const sum = (k) => r2(lines.reduce((s, l) => s + r2(l[k]), 0));
  const dr = sum("dr");
  const cr = sum("cr");
  const diff = r2(dr - cr);
  const ok = dr > 0 && diff === 0;

  const filled = lines.filter((l) => l.name || l.dr || l.cr);
  const valid =
    filled.length >= 2 &&
    filled.every((l) => byName[l.name] && r2(l.dr) > 0 !== r2(l.cr) > 0);

  const pct = Math.max(dr, cr) ? (Math.min(dr, cr) / Math.max(dr, cr)) * 100 : 0;

  const [tone, badge, hint] = ok
    ? ["ok", "Balanced", "Debits and credits are equal."]
    : dr || cr
      ? ["bad", "Not balanced", `${diff > 0 ? "Credits" : "Debits"} are short by ${inr(Math.abs(diff))}`]
      : ["mute", "Add amounts", "Add account amounts to begin."];

  function fill() {
    if (!diff) return;

    const target = [...lines].reverse().find((l) => !l.dr && !l.cr);
    const patch = diff > 0 ? { cr: diff.toFixed(2), dr: "" } : { dr: (-diff).toFixed(2), cr: "" };

    target ? upd(target.k, patch) : setLines((cur) => [...cur, { ...line(), ...patch }]);
  }

  function projection(l) {
    const account = byName[l.name];
    const balance = account && bal[account.id];
    if (!balance) return null;

    const now = Number(balance.balance);
    const debitNature = account.account_type === "asset" || account.account_type === "expense";
    const after = r2(now + (debitNature ? r2(l.dr) - r2(l.cr) : r2(l.cr) - r2(l.dr)));

    const a = drcr(account.account_type, now);
    const b = drcr(account.account_type, after);

    return {
      now: `${a.text} ${a.side}`,
      after: `${b.text} ${b.side}`,
      warn: after < 0 && account.allow_negative === false,
    };
  }

  // --------------------------------------------------
  // Post / edit / delete
  // --------------------------------------------------

  function reset() {
    setHead(fresh());
    setLines([line(), line()]);
    setEditId(null);
  }

  async function post(reason) {
    const body = {
      date: head.date,
      narration: head.narration.trim() || null,
      reference: head.reference.trim() || null,
      lines: filled.map((l) => ({
        account_id: byName[l.name].id,
        debit: r2(l.dr),
        credit: r2(l.cr),
      })),
    };

    if (editId) body.reason = reason;

    const result = await api(
      editId ? `/manual-journal/${editId}` : "/manual-journal",
      send(editId ? "PUT" : "POST", body)
    );

    toast(
      editId
        ? `Entry #${editId} updated.`
        : `Journal entry #${result.id ?? result.journal_entry_id} posted.`
    );

    reset();
    setBal({});
    setAsk(null);
    reg.reload();
  }

  async function submit() {
    if (editId) return setAsk({ type: "edit" });

    setBusy(true);
    try {
      await post();
    } catch (error) {
      toast(error.message || "Unable to post entry.", true);
    }
    setBusy(false);
  }

  async function startEdit(id) {
    try {
      const entry = await api(`/manual-journal/${id}`);
      const entryLines = entry.lines || [];

      setHead({
        date: entry.date,
        narration: entry.narration || "",
        reference: entry.reference || "",
      });

      setLines(
        entryLines.map((l) => ({
          ...line(),
          name: byId[l.account_id]?.name || "",
          dr: Number(l.debit) || "",
          cr: Number(l.credit) || "",
        }))
      );

      entryLines.forEach((l) => loadBal(byId[l.account_id]));

      setEditId(id);
      setDetailId(null);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      toast(error.message || "Unable to load entry.", true);
    }
  }

  async function del(reason) {
    if (!ask?.id) return;

    try {
      await api(`/entries/${ask.id}?reason=${encodeURIComponent(reason)}`, { method: "DELETE" });

      toast(`Entry #${ask.id} deleted.`);
      if (String(editId) === String(ask.id)) reset();

      setBal({});
      setAsk(null);
      setDetailId(null);
      reg.reload();
    } catch (error) {
      toast(error.message || "Unable to delete entry.", true);
    }
  }

  // --------------------------------------------------
  // Journal details
  // --------------------------------------------------

  function closeDetail() {
    setDetailId(null);
    setDetailEntry(null);
  }

  async function showDetails(id) {
    setDetailId(id);
    setDetailEntry(null);
    setDetailLoading(true);

    try {
      setDetailEntry(await api(`/manual-journal/${id}`));
    } catch (error) {
      toast(error.message || "Unable to load journal details.", true);
      setDetailId(null);
    } finally {
      setDetailLoading(false);
    }
  }

  // --------------------------------------------------
  // Register filters / sorting / paging
  // --------------------------------------------------

  const q = f.search.trim().toLowerCase();

  const filteredEntries = register
    .filter((e) => {
      const d = String(e.date || "").slice(0, 10);

      return (
        (!q || [e.id, e.narration, e.reference, e.date].join(" ").toLowerCase().includes(q)) &&
        (!f.from || d >= f.from) &&
        (!f.to || d <= f.to)
      );
    })
    .sort(SORTS[f.sort] || ((a, b) => Number(b.id) - Number(a.id)));

  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / f.size));
  const currentPage = Math.min(f.page, totalPages);
  const visibleEntries = filteredEntries.slice((currentPage - 1) * f.size, currentPage * f.size);
  const goPage = (page) => setF((s) => ({ ...s, page }));

  const summary = filteredEntries.reduce(
    (r, e) => {
      const t = getEntryTotals(e);
      return { debit: r.debit + t.debit, credit: r.credit + t.credit };
    },
    { debit: 0, credit: 0 }
  );

  const safeText = (s) => (/^[=+\-@]/.test(s) ? `'${s}` : s); // stops Excel running typed formulas

  function exportRows() {
    return filteredEntries.map((e) => {
      const t = getEntryTotals(e);

      return {
        id: e.id,
        date: String(e.date || "").slice(0, 10),
        narration: e.narration || "",
        reference: e.reference || "",
        debit: r2(t.debit),
        credit: r2(t.credit),
        difference: r2(t.debit - t.credit),
        balanced: isBalanced(t),
        lines: (Array.isArray(e.lines) ? e.lines : []).map((l) => ({
          account: byId[l.account_id]?.name || `Account #${l.account_id}`,
          debit: r2(l.debit),
          credit: r2(l.credit),
        })),
      };
    });
  }

  function download(content, type, ext) {
    const range = f.from || f.to ? `${f.from || "start"}_to_${f.to || today()}` : today();
    const url = URL.createObjectURL(new Blob([content], { type }));
    const a = document.createElement("a");

    a.href = url;
    a.download = `journal-register-${range}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);

    toast(`Journal register exported as ${ext.toUpperCase()}.`);
  }

  function exportCSV() {
    const rows = exportRows();

    const header = [
      "Entry No.", "Date", "Narration", "Reference",
      "Accounts", "Debit (₹)", "Credit (₹)", "Difference (₹)", "Status",
    ];

    const body = rows.map((r) => [
      r.id,
      `="${r.date}"`, // keeps Excel from showing ######## in a narrow date column
      safeText(r.narration),
      safeText(r.reference),
      r.lines
        .map((l) => `${l.account} ${l.debit ? `Dr ${l.debit}` : `Cr ${l.credit}`}`)
        .join("; "),
      r.debit,
      r.credit,
      r.difference,
      r.balanced ? "Balanced" : "Not balanced",
    ]);

    const total = ["", "", "TOTAL", "", "", r2(summary.debit), r2(summary.credit), r2(summary.debit - summary.credit), ""];

    const csv = [header, ...body, total].map((row) => row.map(csvCell).join(",")).join("\r\n");

    download("\uFEFF" + csv, "text/csv;charset=utf-8;", "csv");
  }

  function exportJSON() {
    const rows = exportRows();

    const data = {
      exported_at: new Date().toISOString(),
      filters: { search: f.search, from: f.from || null, to: f.to || null },
      summary: {
        entries: rows.length,
        total_debit: r2(summary.debit),
        total_credit: r2(summary.credit),
      },
      entries: rows,
    };

    download(JSON.stringify(data, null, 2), "application/json;charset=utf-8;", "json");
  }

  // --------------------------------------------------
  // Account lookup + detail data
  // --------------------------------------------------

  const la = byName[look];
  const lb = la && bal[la.id];
  const party = la && contacts.data?.[la.id];
  const lbal = lb && drcr(la.account_type, lb.balance);

  const detailTotals = detailEntry ? getEntryTotals(detailEntry) : { debit: 0, credit: 0 };
  const detailBalanced = isBalanced(detailTotals);

  const registerStats = [
    ["TOTAL ENTRIES", filteredEntries.length, "Matching transactions", "border-[#132622]/10 bg-[#132622]/[0.025]", MUTED, "font-serif text-2xl"],
    ["TOTAL DEBIT", inr(summary.debit), "Debit transactions", "border-emerald-600/15 bg-emerald-500/[0.04]", "text-emerald-700", "num text-xl text-emerald-700"],
    ["TOTAL CREDIT", inr(summary.credit), "Credit transactions", "border-sky-600/15 bg-sky-500/[0.04]", "text-sky-700", "num text-xl text-sky-700"],
  ];

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <>
      <PageHeader eyebrow="Transactions" title="Journal entries">
        {editId && <Pill tone="warn">Editing entry #{editId}</Pill>}
      </PageHeader>

      <datalist id="acct-list">
        {list.map((a) => (
          <option key={a.id} value={a.name}>
            {a.account_type}
          </option>
        ))}
      </datalist>

      {/* ------------------------------------------ */}
      {/* Journal form + account lookup */}
      {/* ------------------------------------------ */}

      <div className="grid items-start gap-6 lg:grid-cols-[1.7fr_1fr]">
        <Card>
          {/* Header fields */}
          <div className="grid gap-4 sm:grid-cols-[170px_1fr_1fr]">
            {HEAD_FIELDS.map(([k, label, props]) => (
              <Field key={k} label={label}>
                <Input value={head[k]} onChange={setHeadK(k)} {...props} />
              </Field>
            ))}
          </div>

          {/* Lines heading */}
          <div className="mt-8 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="font-serif text-lg font-medium">Entry lines</h2>
              <p className={`mt-0.5 text-xs ${MUTED}`}>
                Enter an amount on the debit or credit side of each account.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#132622]/[0.05] px-3 py-1 text-xs font-medium text-[#132622]/60">
                {filled.length} of {lines.length} lines filled
              </span>
              <Btn variant="line" className="btn-sm" onClick={() => setNewAcct(true)}>
                + New account
              </Btn>
            </div>
          </div>

          {/* Journal lines */}
          <div className="mt-4 space-y-3">
            {lines.map((l, i) => {
              const p = projection(l);

              return (
                <div
                  key={l.k}
                  className="grid grid-cols-[28px_minmax(0,1fr)_36px] gap-x-3 gap-y-3 rounded-2xl border border-[#132622]/10 bg-white/70 p-3 shadow-sm transition focus-within:border-[#1F5D46]/40 focus-within:shadow-md sm:grid-cols-[28px_minmax(0,1fr)_160px_160px_36px] sm:items-start"
                >
                  <span className="mt-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-[#132622]/[0.06] text-xs font-semibold text-[#132622]/60">
                    {i + 1}
                  </span>

                  <div className="min-w-0">
                    <Input
                      list="acct-list"
                      value={l.name}
                      placeholder="Choose account"
                      onFocus={() => setLook(l.name)}
                      onChange={(e) => setName(l, e.target.value)}
                    />

                    {p && (
                      <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-[#132622]/60">
                        <span className="rounded-md bg-[#132622]/[0.05] px-2 py-0.5 font-mono">Now {p.now}</span>
                        <span aria-hidden>→</span>
                        <span className="rounded-md bg-emerald-50 px-2 py-0.5 font-mono font-semibold text-emerald-700">After {p.after}</span>
                        {p.warn && (
                          <span className="rounded-md bg-red-50 px-2 py-0.5 font-medium text-red-600">Goes negative</span>
                        )}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    aria-label="Remove line"
                    title="Remove line"
                    onClick={() => remove(l)}
                    className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl text-lg text-[#132622]/35 transition hover:bg-red-50 hover:text-red-600 sm:order-last"
                  >
                    ×
                  </button>

                  {/* Debit / Credit */}
                  <div className="col-span-3 grid grid-cols-2 gap-3 sm:contents">
                    {SIDES.map((s) => {
                      const active = Number(l[s.key]) > 0;

                      return (
                        <label
                          key={s.key}
                          className={`flex min-w-0 items-center gap-2 rounded-xl px-2.5 py-2 ring-1 transition focus-within:ring-2 ${
                            active ? s.on : `bg-[#132622]/[0.03] ring-[#132622]/10 ${s.hover}`
                          } ${Number(l[s.other]) > 0 ? "opacity-40" : ""}`}
                        >
                          <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${active ? s.badge : "bg-[#132622]/10 text-[#132622]/55"}`}>
                            {s.tag}
                          </span>
                          <span className="text-sm text-[#132622]/40">₹</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            inputMode="decimal"
                            placeholder="0.00"
                            aria-label={`${s.label} amount`}
                            value={l[s.key]}
                            onChange={(e) =>
                              upd(l.k, {
                                [s.key]: e.target.value,
                                [s.other]: e.target.value ? "" : l[s.other],
                              })
                            }
                            className={`${AMOUNT_INPUT} ${active ? s.text : ""}`}
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add lines */}
          <div className="mt-4 flex flex-wrap gap-3">
            <Btn variant="line" onClick={() => setLines((c) => [...c, line()])}>
              + Add line
            </Btn>
            <Btn variant="line" onClick={fill} disabled={!diff}>
              Fill the difference
            </Btn>
          </div>

          {/* Totals + balance */}
          <div className="mt-7 rounded-2xl border border-[#132622]/10 bg-[#132622]/[0.025] p-4">
            <div className="grid grid-cols-2 gap-3">
              {SIDES.map((s, i) => (
                <div key={s.key} className={`rounded-xl bg-white/70 p-3 ring-1 ${s.tile}`}>
                  <p className={`text-xs font-medium ${s.text}`}>Total {s.label.toLowerCase()}</p>
                  <p className={`num mt-1 text-lg font-semibold ${s.text}`}>{inr([dr, cr][i])}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#132622]/10">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  ok ? "bg-emerald-500" : "bg-gradient-to-r from-violet-500 to-cyan-500"
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="text-[#132622]/60">{hint}</span>
              <Pill tone={tone}>{badge}</Pill>
            </div>
          </div>

          {/* Submit */}
          <div className="mt-5 flex flex-wrap gap-3">
            <Btn className="min-w-48" disabled={!(ok && valid) || busy} onClick={submit}>
              {busy ? "Posting..." : editId ? `Save changes to #${editId}` : "Post journal entry"}
            </Btn>

            {editId && (
              <Btn variant="line" onClick={reset}>
                Cancel editing
              </Btn>
            )}
          </div>
        </Card>

        {/* Account lookup */}
        <Card className="lg:sticky lg:top-8">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-serif text-xl font-medium">Account lookup</h2>
            <button
              type="button"
              onClick={() => setNewAcct(true)}
              className="text-sm font-medium text-[#1F5D46] underline decoration-[#B9852F] underline-offset-4"
            >
              + New account
            </button>
          </div>

          <Field label="Find an account">
            <Input
              list="acct-list"
              value={look}
              placeholder="Type to search accounts"
              onChange={(e) => {
                setLook(e.target.value);
                loadBal(byName[e.target.value]);
              }}
            />
          </Field>

          {!la ? (
            <p className="mt-6 text-center text-sm text-[#132622]/55">
              Pick an account here, or click into a journal line, to see its balance and details.
            </p>
          ) : !lb ? (
            <Empty>Loading...</Empty>
          ) : (
            <Reveal key={la.id} variant="fade" className="mt-6">
              <div className="flex items-center justify-between gap-3">
                <b className="font-serif text-lg">{la.name}</b>
                <Pill>{party ? party.kind : la.account_type}</Pill>
              </div>

              <div className="big-bal mt-2">
                <CountUp value={Math.abs(Number(lb.balance))} /> <Side side={lbal.side} />
              </div>

              <p className="text-[13px] text-[#132622]/60">
                {party && (party.kind === "Vendor" ? "Amount you owe this vendor. " : "Amount this customer owes you. ")}
                {lbal.side === "Dr" ? "Debit" : "Credit"} balance
              </p>

              <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-5 gap-y-2 text-sm">
                {[
                  ["Opening", inr(lb.opening_balance), "num"],
                  ["Total debit", inr(lb.total_debit), "num"],
                  ["Total credit", inr(lb.total_credit), "num"],
                  ...(party
                    ? [
                        ["Company", party.company_name],
                        ["Email", party.email],
                        ["Mobile", party.mobile],
                        ["GSTIN", party.gstin],
                        ["PAN", party.pan],
                      ]
                        .filter((x) => x[1])
                        .map(([k, v]) => [k, v, "break-all"])
                    : []),
                ].map(([k, v, cls]) => (
                  <Fragment key={k}>
                    <dt className={MUTED}>{k}</dt>
                    <dd className={`${cls} text-right`}>{v}</dd>
                  </Fragment>
                ))}
              </dl>

              <Link
                href={`/ledger?account=${la.id}`}
                className="mt-4 inline-block font-medium text-[#1F5D46] underline decoration-[#B9852F] underline-offset-4"
              >
                Open full ledger →
              </Link>
            </Reveal>
          )}
        </Card>
      </div>

      {/* ------------------------------------------ */}
      {/* Journal register */}
      {/* ------------------------------------------ */}

      <Reveal className="mt-10">
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="font-serif text-xl font-medium">Journal register</h2>
              <p className={`mt-1 text-sm ${MUTED}`}>Search, review and manage your journal entries.</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Btn variant="line" onClick={() => reg.reload()}>
                ↻ Refresh
              </Btn>
              <Btn variant="line" onClick={exportCSV} disabled={!filteredEntries.length}>
                ↓ Export CSV
              </Btn>
              <Btn variant="line" onClick={exportJSON} disabled={!filteredEntries.length}>
                ↓ Export JSON
              </Btn>
            </div>
          </div>

          {/* Summary cards */}
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {registerStats.map(([label, value, sub, box, labelCls, valueCls]) => (
              <div key={label} className={`rounded-xl border p-4 ${box}`}>
                <p className={`text-xs font-medium ${labelCls}`}>{label}</p>
                <p className={`mt-2 font-semibold ${valueCls}`}>{value}</p>
                <p className="mt-1 text-xs text-[#132622]/50">{sub}</p>
              </div>
            ))}
          </div>

          {/* Search and filters */}
          <div className={`mt-6 p-4 ${BOX}`}>
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_1fr_1fr_170px]">
              <Field label="Search journal entries">
                <Input
                  value={f.search}
                  onChange={onFilter("search")}
                  placeholder="Search entry no., narration, reference..."
                />
              </Field>

              <Field label="From date">
                <Input type="date" value={f.from} onChange={onFilter("from")} />
              </Field>

              <Field label="To date">
                <Input type="date" value={f.to} onChange={onFilter("to")} />
              </Field>

              <Field label="Sort by">
                <Select value={f.sort} onChange={onFilter("sort")}>
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="highest">Highest amount</option>
                  <option value="lowest">Lowest amount</option>
                </Select>
              </Field>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <p className={`text-xs ${MUTED}`}>Showing {filteredEntries.length} matching entries</p>

              <button
                type="button"
                onClick={() => setF(FILTERS)}
                className="text-sm font-medium text-[#1F5D46] underline underline-offset-4 transition hover:text-[#132622]"
              >
                Clear filters
              </button>
            </div>
          </div>

          {/* Table */}
          {reg.loading && !reg.data ? (
            <Empty>Loading journal entries...</Empty>
          ) : reg.error ? (
            <Empty error>{reg.error}</Empty>
          ) : filteredEntries.length ? (
            <>
              <div className="mt-6 overflow-x-auto rounded-xl border border-[#132622]/10">
                <table className="w-full min-w-[850px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-[#132622]/15 bg-[#132622]/[0.035] text-left">
                      <th className="px-4 py-4 font-semibold">Entry</th>
                      <th className="px-4 py-4 font-semibold">Date</th>
                      <th className="px-4 py-4 font-semibold">Narration / Reference</th>
                      <th className="px-4 py-4 text-right font-semibold text-emerald-700">Debit (₹)</th>
                      <th className="px-4 py-4 text-right font-semibold text-sky-700">Credit (₹)</th>
                      <th className="px-4 py-4 text-center font-semibold">Status</th>
                      <th className="px-4 py-4 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {visibleEntries.map((e) => {
                      const t = getEntryTotals(e);
                      const balanced = isBalanced(t);

                      const actions = [
                        ["View", "View details", () => showDetails(e.id), "border-[#132622]/15 hover:bg-[#132622]/10"],
                        ["Edit", "Edit entry", () => startEdit(e.id), "border-[#132622]/15 hover:bg-[#132622]/10"],
                        ["Delete", "Delete entry", () => setAsk({ type: "delete", id: e.id }), "border-red-500/20 text-red-600 hover:bg-red-50"],
                      ];

                      return (
                        <tr
                          key={e.id}
                          onClick={() => showDetails(e.id)}
                          className="cursor-pointer border-b border-[#132622]/10 transition last:border-0 hover:bg-[#132622]/[0.035]"
                        >
                          <td className="px-4 py-4 font-semibold">#{e.id}</td>

                          <td className="whitespace-nowrap px-4 py-4 text-[#132622]/65">{day(e.date)}</td>

                          <td className="max-w-[260px] px-4 py-4">
                            <p className="truncate font-medium">{e.narration || "No narration"}</p>
                            <p className="mt-1 truncate text-xs text-[#132622]/50">
                              {e.reference ? `Ref: ${e.reference}` : "No reference"}
                            </p>
                          </td>

                          <td className="num whitespace-nowrap px-4 py-4 text-right font-medium text-emerald-700">
                            {inr(t.debit)}
                          </td>

                          <td className="num whitespace-nowrap px-4 py-4 text-right font-medium text-sky-700">
                            {inr(t.credit)}
                          </td>

                          <td className="px-4 py-4 text-center">
                            <Pill tone={balanced ? "ok" : "bad"}>{balanced ? "Balanced" : "Difference"}</Pill>
                          </td>

                          <td className="px-4 py-4">
                            <div className="flex justify-end gap-2">
                              {actions.map(([label, title, fn, cls]) => (
                                <button
                                  key={label}
                                  type="button"
                                  title={title}
                                  onClick={(ev) => {
                                    ev.stopPropagation();
                                    fn();
                                  }}
                                  className={`${ROW_BTN} ${cls}`}
                                >
                                  {label}
                                </button>
                              ))}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3 text-sm text-[#132622]/60">
                  <span>Rows per page</span>
                  <Select value={String(f.size)} onChange={(e) => setFilter({ size: Number(e.target.value) })}>
                    {PAGE_SIZES.map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`text-xs ${MUTED}`}>
                    Page {currentPage} of {totalPages}
                  </span>
                  <Btn variant="line" disabled={currentPage <= 1} onClick={() => goPage(currentPage - 1)}>
                    Previous
                  </Btn>
                  <Btn variant="line" disabled={currentPage >= totalPages} onClick={() => goPage(currentPage + 1)}>
                    Next
                  </Btn>
                </div>
              </div>
            </>
          ) : (
            <div className="mt-6">
              <Empty>No journal entries match your search or filters.</Empty>
            </div>
          )}
        </Card>
      </Reveal>

      {/* ------------------------------------------ */}
      {/* Journal detail modal */}
      {/* ------------------------------------------ */}

      {detailId !== null && (
        <Modal wide title={`Journal Entry #${detailId}`} sub="Complete transaction information" onClose={closeDetail}>
          {detailLoading ? (
            <Empty>Loading journal details...</Empty>
          ) : detailEntry ? (
            <>
              <div className={`grid gap-4 p-4 sm:grid-cols-3 ${BOX}`}>
                {[
                  ["DATE", day(detailEntry.date)],
                  ["NARRATION", detailEntry.narration || "—"],
                  ["REFERENCE", detailEntry.reference || "—"],
                ].map(([k, v]) => (
                  <div key={k}>
                    <p className="text-xs text-[#132622]/50">{k}</p>
                    <p className="mt-1 font-semibold">{v}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6">
                <h3 className="mb-3 font-serif text-lg font-medium">Transaction breakdown</h3>

                <div className="overflow-x-auto rounded-xl border border-[#132622]/10">
                  <table className="w-full min-w-[500px] text-sm">
                    <thead>
                      <tr className="border-b border-[#132622]/15 bg-[#132622]/[0.035]">
                        <th className="px-4 py-3 text-left">Account</th>
                        <th className="px-4 py-3 text-right text-emerald-700">Debit (₹)</th>
                        <th className="px-4 py-3 text-right text-sky-700">Credit (₹)</th>
                      </tr>
                    </thead>

                    <tbody>
                      {(detailEntry.lines || []).map((l, i) => (
                        <tr key={i} className="border-b border-[#132622]/10 last:border-0">
                          <td className="px-4 py-3 font-medium">
                            {byId[l.account_id]?.name || `Account #${l.account_id}`}
                          </td>
                          <td className="num px-4 py-3 text-right text-emerald-700">
                            {Number(l.debit) ? inr(l.debit) : "—"}
                          </td>
                          <td className="num px-4 py-3 text-right text-sky-700">
                            {Number(l.credit) ? inr(l.credit) : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>

                    <tfoot>
                      <tr className="bg-[#132622]/[0.035] font-semibold">
                        <td className="px-4 py-4">Total</td>
                        <td className="num px-4 py-4 text-right text-emerald-700">{inr(detailTotals.debit)}</td>
                        <td className="num px-4 py-4 text-right text-sky-700">{inr(detailTotals.credit)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#132622]/10 p-4">
                <div>
                  <p className={`text-xs ${MUTED}`}>DIFFERENCE</p>
                  <p className="num mt-1 font-semibold">
                    {inr(Math.abs(detailTotals.debit - detailTotals.credit))}
                  </p>
                </div>

                <Pill tone={detailBalanced ? "ok" : "bad"}>
                  {detailBalanced ? "Debit = Credit" : "Not balanced"}
                </Pill>
              </div>

              <div className="mt-6 flex flex-wrap justify-end gap-3">
                <Btn variant="line" onClick={() => startEdit(detailId)}>
                  Edit entry
                </Btn>
                <Btn
                  variant="line"
                  onClick={() => {
                    setAsk({ type: "delete", id: detailId });
                    setDetailId(null);
                  }}
                >
                  Delete entry
                </Btn>
                <Btn onClick={closeDetail}>Close</Btn>
              </div>
            </>
          ) : (
            <Empty>Journal entry not found.</Empty>
          )}
        </Modal>
      )}

      {/* ------------------------------------------ */}
      {/* Confirmations */}
      {/* ------------------------------------------ */}

      {newAcct && (
        <NewAccountModal
          names={list.map((a) => a.name)}
          onClose={() => setNewAcct(false)}
          onCreated={accountCreated}
        />
      )}

      {ask?.type === "edit" && (
        <Confirm
          title={`Save changes to entry #${editId}`}
          sub="The old and new values are kept in the audit log."
          reasonLabel="Reason for the change"
          confirmText="Save changes"
          onConfirm={post}
          onClose={() => setAsk(null)}
        />
      )}

      {ask?.type === "delete" && (
        <Confirm
          danger
          title={`Delete entry #${ask.id}`}
          sub="It can be brought back from the audit log."
          reasonLabel="Why are you deleting it?"
          confirmText="Delete entry"
          onConfirm={del}
          onClose={() => setAsk(null)}
        />
      )}
    </>
  );
}