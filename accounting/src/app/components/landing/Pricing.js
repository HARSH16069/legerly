import Reveal from "../Reveal";
import Eyebrow from "./Eyebrow";
import { PLANS } from "@/content/landing";

export default function Pricing() {
  return (
    <section id="pricing" className="border-t border-[#132622]/15 px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <Reveal className="mb-14 max-w-lg">
          <Eyebrow>Pricing</Eyebrow>
          <h2 className="font-serif text-[34px] font-medium leading-tight tracking-tight">One plan for every stage of the business</h2>
        </Reveal>
        <div className="grid gap-6 sm:grid-cols-3">
          {PLANS.map((p, i) => (
            <Reveal key={p.name} variant="scale" delay={i * 120} className={`flex flex-col rounded-sm border p-7 transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl ${p.highlight ? "border-[#1F5D46] bg-[#132622] text-[#F6F3EA]" : "border-[#132622]/15 bg-white/50"}`}>
              <span className="font-serif text-lg font-medium">{p.name}</span>
              <div className="mt-3 flex items-baseline gap-1"><span className="font-mono text-3xl">${p.price}</span><span className={`text-[13px] ${p.highlight ? "text-[#F6F3EA]/60" : "text-[#132622]/50"}`}>/ month</span></div>
              <p className={`mt-3 text-[14px] leading-relaxed ${p.highlight ? "text-[#F6F3EA]/70" : "text-[#132622]/65"}`}>{p.desc}</p>
              <ul className="mt-6 flex-1 space-y-2.5">{p.features.map((f) => <li key={f} className={`text-[14px] ${p.highlight ? "text-[#F6F3EA]/80" : "text-[#132622]/75"}`}>— {f}</li>)}</ul>
              <a href="#demo" className={`mt-8 rounded-sm px-5 py-3 text-center text-[14px] font-medium transition-colors ${p.highlight ? "bg-[#B9852F] text-[#132622] hover:bg-[#A87829]" : "bg-[#132622] text-[#F6F3EA] hover:bg-[#0B1712]"}`}>Start with {p.name}</a>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
