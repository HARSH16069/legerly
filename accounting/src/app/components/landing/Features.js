import Reveal from "../Reveal";
import Eyebrow from "./Eyebrow";
import { FEATURES } from "@/content/landing";

export default function Features() {
  return (
    <section id="features" className="mx-auto max-w-6xl px-6 py-24">
      <Reveal className="mb-14 max-w-lg">
        <Eyebrow>Everything the close touches</Eyebrow>
        <h2 className="font-serif text-[34px] font-medium leading-tight tracking-tight">One ledger, twelve modules, zero spreadsheets</h2>
      </Reveal>
      <div className="grid gap-x-10 gap-y-10 sm:grid-cols-2">
        {FEATURES.map(([number, title, body], i) => (
          <Reveal key={number} delay={(i % 2) * 110} className="group border-t border-[#132622]/20 pt-5 transition-colors duration-300 hover:border-[#B9852F]">
            <div className="flex items-baseline gap-3">
              <span className="font-mono text-sm text-[#B9852F] transition-transform duration-300 group-hover:translate-x-1">{number}</span>
              <h3 className="font-serif text-xl font-medium">{title}</h3>
            </div>
            <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-[#132622]/65">{body}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
