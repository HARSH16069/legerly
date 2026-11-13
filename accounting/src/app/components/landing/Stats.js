import Reveal from "../Reveal";
import Counter from "../Counter";
import { STATS } from "@/content/landing";

export default function Stats() {
  return (
    <section className="border-y border-[#132622]/15 bg-[#132622] text-[#F6F3EA]">
      <div className="mx-auto grid max-w-6xl grid-cols-1 divide-y divide-[#F6F3EA]/15 px-6 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {STATS.map((s, i) => (
          <Reveal key={s.label} delay={i * 120} className="px-2 py-9 sm:px-8">
            <div className="font-mono text-3xl tabular-nums text-[#B9852F]"><Counter to={s.to} decimals={s.decimals} suffix={s.suffix} /></div>
            <div className="mt-2 text-[14px] text-[#F6F3EA]/70">{s.label}</div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
