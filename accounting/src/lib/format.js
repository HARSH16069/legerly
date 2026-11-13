export const inr = (n) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(n || 0));
export const ymd = (d) => { const x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 10); };
export const today = () => ymd(new Date());
export const day = (d) => (d ? new Date(d + "T00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "");
export const addDays = (s, n) => { const d = new Date(s + "T00:00"); d.setDate(d.getDate() + n); return ymd(d); };
export const diffDays = (a, b) => Math.round((new Date(b + "T00:00") - new Date(a + "T00:00")) / 864e5);
export const sum = (list, key) => list.reduce((t, x) => t + Number(x[key] || 0), 0);

// Asset and expense accounts normally carry a debit balance, the rest a credit balance.
export function drcr(type, value) {
  const v = Number(value || 0), nat = type === "asset" || type === "expense" ? "Dr" : "Cr";
  return { text: inr(Math.abs(v)), side: v >= 0 ? nat : nat === "Dr" ? "Cr" : "Dr" };
}

export function payStatus(t) {
  if (!t) return { tone: "mute", label: "No record" };
  if (t.payment_mode === "cash") return { tone: "ok", label: "Cash, settled" };
  if (t.is_paid) return { tone: "ok", label: "Paid" };
  const d = diffDays(today(), t.due_date), part = Number(t.paid_amount) > 0 ? "Part paid, " : "";
  if (d < 0) return { tone: "bad", label: `${part}Overdue ${-d} day${d === -1 ? "" : "s"}` };
  if (d === 0) return { tone: "warn", label: `${part}Due today` };
  if (d <= 7) return { tone: "warn", label: `${part}Due in ${d} days` };
  return { tone: "mute", label: `${part}Due ${day(t.due_date)}` };
}
