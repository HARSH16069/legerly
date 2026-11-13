import { today } from "@/lib/format";

export const PERIODS = [["month", "This month"], ["fy", "This financial year"], ["all", "All time"]];

function range(period) {
  const t = today(), y = Number(t.slice(0, 4)), m = Number(t.slice(5, 7));
  if (period === "month") return [`${t.slice(0, 7)}-01`, t];
  if (period === "fy") return [`${m >= 4 ? y : y - 1}-04-01`, t];
  return ["", ""];
}
const within = (d, [from, to]) => (!from || d >= from) && (!to || d <= to);
const sum = (list, key) => list.reduce((t, x) => t + Number(x[key] || 0), 0);

function topParties(rows) {
  const m = new Map();
  rows.forEach((r) => m.set(r.party_name || "Unknown", (m.get(r.party_name || "Unknown") || 0) + Number(r.total_amount || 0)));
  return [...m.entries()].map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount).slice(0, 5);
}

function months6(sales, purchases) {
  const now = new Date(), out = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    out.push({ key, label: d.toLocaleDateString("en-GB", { month: "short" }),
      sales: sum(sales.filter((r) => (r.date || "").startsWith(key)), "taxable_amount"),
      purchases: sum(purchases.filter((r) => (r.date || "").startsWith(key)), "taxable_amount") });
  }
  return out;
}

export function derive({ accts, bals, sales, purchases, rem, customers, vendors }, period) {
  const r = range(period), s = sales.filter((x) => within(x.date, r)), p = purchases.filter((x) => within(x.date, r));
  const bal = (a) => Number(bals[accts.indexOf(a)]?.balance || 0);
  const byName = (n) => { const a = accts.find((x) => x.name.toLowerCase() === n.toLowerCase()); return a ? bal(a) : 0; };

  const types = { asset: 0, liability: 0, equity: 0, income: 0, expense: 0 };
  accts.forEach((a) => { if (a.account_type in types) types[a.account_type] += bal(a); });
  const owed = accts.filter((a) => a.party_type === "customer" || a.party_type === "both").reduce((t, a) => t + bal(a), 0);
  const owe = accts.filter((a) => a.party_type === "supplier" || a.party_type === "both").reduce((t, a) => t + bal(a), 0);
  const dr = bals.reduce((t, b) => t + Number(b?.total_debit || 0), 0), cr = bals.reduce((t, b) => t + Number(b?.total_credit || 0), 0);
  const balanced = Math.abs(dr - cr) < 0.005;
  const cashBank = byName("Cash") + byName("Bank"), netGst = byName("GST Payable") - byName("GST Input");
  const profit = types.income - types.expense;
  const dues = rem ? [...rem.receivables, ...rem.payables].sort((a, b) => (a.due_date < b.due_date ? -1 : 1)).slice(0, 6) : [];
  const overdue = rem?.summary.overdue_count || 0;

  const insights = [];
  if (overdue) insights.push({ tone: "bad", icon: "alert", text: `${overdue} payment${overdue > 1 ? "s are" : " is"} overdue`, href: "/reminders", cta: "Open reminders" });
  if (!balanced) insights.push({ tone: "bad", icon: "shield", text: "Your ledger is out of balance", href: "/audit", cta: "Check the audit log" });
  if (cashBank < 0) insights.push({ tone: "warn", icon: "wallet", text: "Cash and bank are below zero", href: "/ledger", cta: "View the ledger" });
  if (netGst > 0) insights.push({ tone: "warn", icon: "gst", text: "GST is payable this period", href: "/ledger", cta: "See the GST accounts" });
  if (rem && rem.summary.to_collect > 0) insights.push({ tone: "ok", icon: "customer", text: "Money is waiting to be collected", href: "/reminders", cta: "Collect payments" });
  if (!insights.length) insights.push({ tone: "ok", icon: "check", text: "All clear. Nothing needs your attention.", href: null });

  return {
    sales: s, purchases: p, counts: { customers: customers.length, vendors: vendors.length, accounts: accts.length },
    salesTaxable: sum(s, "taxable_amount"), purchTaxable: sum(p, "taxable_amount"), salesCount: s.length, purchCount: p.length,
    salesGst: sum(s, "gst_amount"), purchGst: sum(p, "gst_amount"),
    owed, owe, cashBank, netGst, profit, types, dr, cr, balanced, dues, overdue, insights, rem,
    series: months6(sales, purchases), topCustomers: topParties(s), topSuppliers: topParties(p),
  };
}