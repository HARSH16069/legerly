import Reveal from "../Reveal";
import Eyebrow from "./Eyebrow";
import { MODULES } from "@/content/landing";

export default function Modules() {
  return (
    <section id="modules" className="border-t border-[#132622]/15 bg-[#EFEADB]">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <Reveal className="mb-16 max-w-lg">
          <Eyebrow>A closer look</Eyebrow>
          <h2 className="font-serif text-[34px] font-medium leading-tight tracking-tight">Three modules, one running balance</h2>
        </Reveal>
        <div className="space-y-24">
          {MODULES.map((m, i) => {
            const flip = i % 2 === 1;
            return (
              <div key={m.tag} className="grid items-center gap-12 md:grid-cols-2">
                <Reveal variant={flip ? "right" : "left"} className={flip ? "md:order-2" : ""}>
                  <span className="font-mono text-xs uppercase tracking-wide text-[#B9852F]">{m.tag}</span>
                  <h3 className="mt-3 font-serif text-2xl font-medium leading-snug">{m.title}</h3>
                  <p className="mt-4 max-w-md text-[15px] leading-relaxed text-[#132622]/65">{m.body}</p>
                </Reveal>
                <Reveal variant={flip ? "left" : "right"} delay={120}>
                  <div className="rounded-sm border border-[#132622]/15 bg-white/70 p-6 transition-all duration-500 hover:-translate-y-1.5 hover:shadow-xl">
                    <div className="mb-4 border-b border-[#132622]/15 pb-3 font-serif text-[15px]">{m.heading}</div>
                    {m.lines.map(([label, amount], n) => (
                      <div key={label} className={`flex items-center justify-between py-2.5 text-[13px] ${n !== m.lines.length - 1 ? "border-b border-[#132622]/10" : ""}`}>
                        <span className="text-[#132622]/70">{label}</span>
                        <span className="ml-4 shrink-0 font-mono tabular-nums">{amount}</span>
                      </div>
                    ))}
                    <div className="mt-3 flex items-center justify-between gap-4 border-t-2 border-[#132622] pt-3">
                      <span className="font-mono text-xs text-[#132622]/60">{m.footer}</span>
                      <span className="font-mono text-[15px] tabular-nums text-[#1F5D46]">{m.total}</span>
                    </div>
                  </div>
                </Reveal>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
