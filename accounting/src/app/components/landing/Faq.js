import Reveal from "../Reveal";
import AccordionItem from "../AccordionItem";
import Eyebrow from "./Eyebrow";
import { FAQS } from "@/content/landing";

export default function Faq() {
  return (
    <section id="faq" className="border-t border-[#132622]/15 bg-[#EFEADB]">
      <div className="mx-auto max-w-3xl px-6 py-24">
        <Reveal className="mb-10">
          <Eyebrow>Questions</Eyebrow>
          <h2 className="font-serif text-[34px] font-medium leading-tight tracking-tight">Before you book a demo</h2>
        </Reveal>
        <Reveal delay={100}>{FAQS.map(([q, a]) => <AccordionItem key={q} question={q} answer={a} />)}</Reveal>
      </div>
    </section>
  );
}
