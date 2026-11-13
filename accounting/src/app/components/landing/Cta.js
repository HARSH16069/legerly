import Reveal from "../Reveal";
import DemoForm from "./DemoForm";

export default function Cta() {
  return (
    <section id="demo" className="mx-auto max-w-6xl px-6 py-24">
      <Reveal variant="scale" className="rounded-sm border border-[#132622]/15 bg-white/60 px-8 py-14 text-center sm:px-16">
        <h2 className="font-serif text-[30px] font-medium tracking-tight sm:text-[38px]">See your first close in a live walkthrough</h2>
        <p className="mx-auto mt-4 max-w-md text-[16px] text-[#132622]/65">Bring last month’s books. We’ll show you what Ledgerly would have closed, and by when.</p>
        <DemoForm />
      </Reveal>
    </section>
  );
}
