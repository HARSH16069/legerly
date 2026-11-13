import { api } from "@/lib/api";

// One request for every account's balance (the backend's trial balance already totals them all),
// instead of one /accounts/{id}/balance request per account.
// Returns { [account_id]: { account, account_type, opening_balance, total_debit, total_credit, balance } }.
export async function loadBalances() {
  const tb = await api("/trial-balance?hide_zero=false");
  const out = {};
  for (const r of tb.rows || []) {
    const sign = r.account_type === "asset" || r.account_type === "expense" ? 1 : -1;
    const net = Number(r.closing_debit || 0) - Number(r.closing_credit || 0);          // debit positive
    const openNet = Number(r.opening_debit || 0) - Number(r.opening_credit || 0);
    out[r.account_id] = {
      account: r.account_name,
      account_type: r.account_type,
      opening_balance: sign * openNet,
      total_debit: Number(r.period_debit || 0),
      total_credit: Number(r.period_credit || 0),
      balance: sign * net,
    };
  }
  return out;
}