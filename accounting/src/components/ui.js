"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import Reveal from "@/app/components/Reveal";
import { inr } from "@/lib/format";

export const cx = (...a) => a.filter(Boolean).join(" ");

export function PageHeader({ eyebrow, title, children }) {
  return (
    <div className="mb-9 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="font-serif text-[34px] font-medium leading-tight tracking-tight">{title}</h1>
      </div>
      <div className="flex items-center gap-3">{children}</div>
    </div>
  );
}
export const Card = ({ className, children, ...p }) => <div className={cx("card", className)} {...p}>{children}</div>;
export const Field = ({ label, children, className }) => <label className={cx("field", className)}><span>{label}</span>{children}</label>;
export const Input = (p) => <input className="input" {...p} />;
export const Select = ({ children, ...p }) => <select className="input" {...p}>{children}</select>;
export const Btn = ({ variant = "solid", className, ...p }) => <button type="button" className={cx("btn", `btn-${variant}`, className)} {...p} />;
export const Pill = ({ tone = "mute", children }) => <span className={`pill pill-${tone}`}>{children}</span>;
export const Empty = ({ children, error }) => <div className={cx("empty", error && "empty-err")}>{children}</div>;
export const Side = ({ side }) => <span className={`side-tag side-${side.toLowerCase()}`} title={side === "Dr" ? "Debit balance" : "Credit balance"}>{side}</span>;

export function CountUp({ value, money = true }) {
  const [shown, setShown] = useState(0), from = useRef(0);
  useEffect(() => {
    const start = from.current, end = Number(value) || 0, t0 = performance.now();
    let raf;
    const step = (t) => {
      const k = Math.min(1, (t - t0) / 700), e = 1 - Math.pow(1 - k, 3);
      setShown(start + (end - start) * e);
      if (k < 1) raf = requestAnimationFrame(step); else from.current = end;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{money ? inr(shown) : Math.round(shown)}</>;
}

export function Stat({ label, value, text, bad, money = true, delay = 0 }) {
  return (
    <Reveal delay={delay} className={cx("stat", bad && "stat-bad")}>
      <span className="text-[13px] text-[#132622]/60">{label}</span>
      <b className="stat-n">{text ?? <CountUp value={value} money={money} />}</b>
    </Reveal>
  );
}

export function Modal({ title, sub, onClose, children, wide }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);
  return (
    <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title} className={cx("modal", wide && "modal-wide")}>
        <div className="mb-5 flex items-start justify-between gap-4">
          <div><h2 className="font-serif text-2xl font-medium">{title}</h2>{sub && <p className="text-sm text-[#132622]/60">{sub}</p>}</div>
          <Btn variant="line" onClick={onClose}>Close</Btn>
        </div>
        {children}
      </div>
    </div>
  );
}

const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);
export function ToastProvider({ children }) {
  const [t, setT] = useState(null), timer = useRef();
  const push = useCallback((msg, bad) => { setT({ msg, bad, k: Date.now() }); clearTimeout(timer.current); timer.current = setTimeout(() => setT(null), 4200); }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      {t && <div key={t.k} role="status" className={cx("toast", t.bad && "toast-bad")}>{t.msg}</div>}
    </ToastCtx.Provider>
  );
}

export function Confirm({
  open,
  title = "Are you sure?",
  message = "This action cannot be undone.",
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  danger = false,
  busy = false,
}) {
  if (!open) return null;

  return (
    <Modal
      title={title}
      sub={message}
      onClose={onCancel}
    >
      <div className="flex justify-end gap-3 pt-4">
        <Btn
          variant="line"
          onClick={onCancel}
          disabled={busy}
        >
          {cancelText}
        </Btn>

        <Btn
          variant={danger ? "danger" : "solid"}
          onClick={onConfirm}
          disabled={busy}
        >
          {busy ? "Please wait..." : confirmText}
        </Btn>
      </div>
    </Modal>
  );
}
