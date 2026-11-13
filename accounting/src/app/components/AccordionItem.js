"use client";
import { useId, useState } from "react";

export default function AccordionItem({ question, answer }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div className={`border-b border-[#132622]/15 transition-colors duration-300 ${open ? "bg-white/40" : ""}`}>
      <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-6 px-1 py-5 text-left font-serif text-lg transition-colors hover:text-[#1F5D46]">
        <span>{question}</span>
        <span aria-hidden className={`faq-chevron text-xl text-[#B9852F] ${open ? "rotate-180" : ""}`}>⌄</span>
      </button>
      <div id={id} role="region" className="grid transition-[grid-template-rows,opacity] duration-500 ease-out" style={{ gridTemplateRows: open ? "1fr" : "0fr", opacity: open ? 1 : 0 }}>
        <div className="overflow-hidden">
          <p className="max-w-2xl px-1 pb-5 text-[15px] leading-relaxed text-[#132622]/65">{answer}</p>
        </div>
      </div>
    </div>
  );
}
