"use client";
import { useState } from "react";

// UI only for now. Connect onSubmit to your backend when a demo-request endpoint exists.
export default function DemoForm() {
  const [sent, setSent] = useState(false);
  if (sent) return <p className="mt-8 font-serif text-xl text-[#1F5D46]">Thank you. We’ll be in touch to book your walkthrough.</p>;
  return (
    <form onSubmit={(e) => { e.preventDefault(); setSent(true); }} className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
      <input type="email" name="email" required placeholder="you@yourfirm.com" className="w-full max-w-xs rounded-sm border border-[#132622]/25 bg-transparent px-4 py-3 text-[15px] outline-none transition-all placeholder:text-[#132622]/40 focus:border-[#1F5D46] focus:shadow-[0_0_0_4px_rgba(31,93,70,.14)] sm:w-72" />
      <button type="submit" className="w-full rounded-sm bg-[#1F5D46] px-6 py-3 text-[15px] font-medium text-[#F6F3EA] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#17493A] sm:w-auto">Book a demo</button>
    </form>
  );
}
