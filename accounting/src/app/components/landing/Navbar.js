"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { NAV } from "@/content/landing";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`sticky top-0 z-30 border-b bg-[#F6F3EA]/90 backdrop-blur transition-all duration-300 ${scrolled ? "border-[#132622]/20 shadow-[0_10px_30px_-20px_rgba(19,38,34,.55)]" : "border-[#132622]/10"}`}>
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" className="font-serif text-xl font-medium tracking-tight">Ledgerly</Link>
        <nav aria-label="Main" className="hidden items-center gap-8 md:flex">
          {NAV.map(([label, href]) => (
            <a key={label} href={href} className="group relative text-[15px] text-[#132622]/75 transition-colors hover:text-[#132622]">
              {label}
              <span className="absolute -bottom-1 left-0 h-px w-0 bg-[#B9852F] transition-all duration-300 group-hover:w-full" />
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-5">
          <Link href="/signin" className="hidden text-[15px] text-[#132622]/75 transition-colors hover:text-[#132622] sm:inline">Sign in</Link>
          <a href="#demo" className="rounded-sm bg-[#1F5D46] px-4 py-2 text-[15px] font-medium text-[#F6F3EA] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#17493A]">Book a demo</a>
          <button type="button" aria-label="Menu" aria-expanded={open} onClick={() => setOpen((v) => !v)} className="flex h-9 w-9 flex-col items-center justify-center gap-1.5 md:hidden">
            <span className={`h-0.5 w-5 bg-[#132622] transition-transform duration-300 ${open ? "translate-y-2 rotate-45" : ""}`} />
            <span className={`h-0.5 w-5 bg-[#132622] transition-opacity duration-300 ${open ? "opacity-0" : ""}`} />
            <span className={`h-0.5 w-5 bg-[#132622] transition-transform duration-300 ${open ? "-translate-y-2 -rotate-45" : ""}`} />
          </button>
        </div>
      </div>
      <div className="grid transition-[grid-template-rows] duration-500 md:hidden" style={{ gridTemplateRows: open ? "1fr" : "0fr" }}>
        <nav aria-label="Mobile" className="overflow-hidden">
          <div className="flex flex-col border-t border-[#132622]/10 px-6 py-3">
            {NAV.map(([label, href]) => <a key={label} href={href} onClick={() => setOpen(false)} className="py-3 text-[16px] text-[#132622]/80">{label}</a>)}
            <Link href="/signin" className="py-3 text-[16px] text-[#132622]/80">Sign in</Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
