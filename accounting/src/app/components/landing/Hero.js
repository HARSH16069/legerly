import Reveal from "../Reveal";
import Counter from "../Counter";
import Eyebrow from "./Eyebrow";
import { STATEMENT } from "@/content/landing";

export default function Hero() {
  return (
    <section className="mx-auto max-w-6xl px-6 pb-20 pt-16 md:pt-24">
      <div className="grid gap-14 md:grid-cols-2 md:gap-10">
        <Reveal variant="left" className="flex flex-col justify-center">
          <Eyebrow>For accountants and the businesses they run</Eyebrow>
          <h1 className="font-serif text-[44px] font-medium leading-[1.08] tracking-tight sm:text-[56px]">Books, closed on time. Every time.</h1>
          <p className="mt-6 max-w-md text-[17px] leading-relaxed text-[#132622]/70">Ledgerly reconciles, invoices, and reports so your close reads like a finished statement — not a spreadsheet you’re still chasing.</p>
          <div className="mt-9 flex flex-wrap items-center gap-6">
            <a href="#demo" className="rounded-sm bg-[#132622] px-6 py-3.5 text-[15px] font-medium text-[#F6F3EA] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#0B1712] hover:shadow-lg">Get a free demo</a>
            <a href="#modules" className="draw-link px-1 text-[15px] font-medium">See a sample close</a>
          </div>
        </Reveal>

        <Reveal variant="right" delay={150}>
          <div className="float-slow rounded-sm border border-[#132622]/15 bg-white/60 p-6 shadow-sm transition-shadow duration-300 hover:shadow-2xl sm:p-8">
            <div className="mb-5 flex items-baseline justify-between border-b border-[#132622]/15 pb-4">
              <span className="font-serif text-lg">Running statement</span>
              <span className="font-mono text-xs text-[#132622]/50">SEP 2026</span>
            </div>
            {STATEMENT.map(([label, amount], i) => (
              <Reveal key={label} variant="fade" delay={450 + i * 140} className={`flex items-center justify-between py-3 text-[14px] ${i !== STATEMENT.length - 1 ? "border-b border-[#132622]/10" : ""}`}>
                <span className="text-[#132622]/75">{label}</span>
                <span className="ml-4 shrink-0 font-mono tabular-nums">{amount}</span>
              </Reveal>
            ))}
            <div className="mt-4 flex items-center justify-between border-t-2 border-[#132622] pt-4">
              <span className="font-serif text-[15px]">Ending balance</span>
              <span className="font-mono text-[17px] tabular-nums text-[#1F5D46]"><Counter to={18444.6} decimals={2} prefix="$" /></span>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
