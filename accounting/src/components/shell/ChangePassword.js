"use client";
import { useState } from "react";
import { Btn, Field, Input, Modal, useToast } from "@/components/ui";

// Talks to /api/auth/change-password, which forwards to FastAPI and stores the fresh token it sends back
// (changing a password signs out every other device).
export default function ChangePassword({ onClose }) {
  const toast = useToast();
  const [f, setF] = useState({ old_password: "", new_password: "", confirm: "" }), [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault(); setErr("");
    if (f.new_password !== f.confirm) return setErr("The two new passwords don’t match.");
    if (f.new_password === f.old_password) return setErr("Choose a password different from the current one.");
    setBusy(true);
    try {
      const res = await fetch("/api/auth/change-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ old_password: f.old_password, new_password: f.new_password }) });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) { window.location.href = "/signin"; return; }
      if (!res.ok) throw new Error(typeof data.detail === "string" ? data.detail : Array.isArray(data.detail) ? data.detail.map((d) => d.msg).join("; ") : "Could not change the password.");
      toast("Password changed. Other devices are signed out.");
      onClose();
    } catch (er) { setErr(er.message); setBusy(false); }
  }

  return (
    <Modal title="Change password" sub="Every other device will be signed out." onClose={onClose}>
      <form onSubmit={submit} className="grid gap-4">
        <Field label="Current password"><Input type="password" autoFocus required maxLength={72} autoComplete="current-password" value={f.old_password} onChange={set("old_password")} /></Field>
        <Field label="New password (8 to 72 characters)"><Input type="password" required minLength={8} maxLength={72} autoComplete="new-password" value={f.new_password} onChange={set("new_password")} /></Field>
        <Field label="Confirm new password"><Input type="password" required minLength={8} maxLength={72} autoComplete="new-password" value={f.confirm} onChange={set("confirm")} /></Field>
        {err && <p role="alert" className="text-sm text-[#B3261E]">{err}</p>}
        <div className="flex gap-3"><Btn type="submit" disabled={busy}>{busy ? "Saving…" : "Change password"}</Btn><Btn variant="line" onClick={onClose}>Cancel</Btn></div>
      </form>
    </Modal>
  );
}
