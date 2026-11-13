import Reveal from "../Reveal";

export default function Quote() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-24">
      <Reveal variant="scale" className="mx-auto max-w-2xl text-center">
        <p className="font-serif text-2xl leading-snug sm:text-[30px]">“Our close went from two weeks to three days. The first time our accountant didn’t ask us to fix anything before filing.”</p>
        <p className="mt-6 text-[15px] text-[#132622]/60">Priya Raman, Founder — Lumen Studio</p>
      </Reveal>
    </section>
  );
}
