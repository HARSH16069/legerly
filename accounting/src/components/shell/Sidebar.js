"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useUser } from "@/components/Session";
import { useAsync } from "@/hooks/useAsync";
import { api } from "@/lib/api";
import ChangePassword from "@/components/shell/ChangePassword";
import { can, homeFor, ROLE_LABEL } from "@/lib/roles";

const NAV = [
  ["Overview", [["/dashboard", "Dashboard", "dashboard"]]],
  ["Books", [["/accounts", "Accounts", "layers"], ["/ledger", "Ledger", "ledger"], ["/trial-balance", "Trial Balance", "scale"], ["/reports", "Reports", "report"], ["/contacts", "Customers and vendors", "users"]]],
  ["Transactions", [["/sales", "Sales", "trend"], ["/purchases", "Purchases", "bag"], ["/journal", "Journal entries", "pen"]]],
  ["Follow up", [["/reminders", "Reminders", "bell"]]],
  ["Control", [["/audit", "Audit log", "shield"], ["/team", "Team and access", "team"]]],
];

// Colour of the role chip in the footer.
const ROLE_CHIP = {
  owner: "bg-amber-400/20 text-amber-200",
  admin: "bg-violet-400/20 text-violet-200",
  accountant: "bg-emerald-400/20 text-emerald-200",
  sales: "bg-sky-400/20 text-sky-200",
};

const ICONS = {
  dashboard: "M4 4h7v9H4zM13 4h7v5h-7zM13 11h7v9h-7zM4 15h7v5H4z",
  layers: "M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5",
  ledger: "M4 5a2 2 0 012-2h12v16H6a2 2 0 00-2 2V5zm2 14h12M8 7h6M8 11h6",
  users: "M17 20v-1a4 4 0 00-4-4H7a4 4 0 00-4 4v1M10 11a4 4 0 100-8 4 4 0 000 8zM21 20v-1a4 4 0 00-3-3.9M16 3.1a4 4 0 010 7.8",
  trend: "M3 17l6-6 4 4 8-8M14 7h7v7",
  bag: "M6 7h12l1 13H5L6 7zM9 7a3 3 0 016 0",
  pen: "M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4",
  bell: "M6 9a6 6 0 1112 0c0 6 2 7 2 7H4s2-1 2-7zM10 20a2 2 0 004 0",
  shield: "M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6l8-3zM9 12l2 2 4-4",
  chevron: "M15 6l-6 6 6 6",
  x: "M6 6l12 12M18 6L6 18",
  scale: "M12 3v18M7 21h10M5 7h14M5 7l-3 7a3 3 0 006 0L5 7zm14 0l-3 7a3 3 0 006 0l-3-7z",
  report: "M7 3h8l4 4v14H7zM15 3v4h4M10 13h6M10 17h6",
  team: "M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM19 8v6M22 11h-6",
  logout: "M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9",
};

const I = ({ n, size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d={ICONS[n]} />
  </svg>
);

const CSS = `
@keyframes sb-in{from{opacity:0;transform:translateX(-14px)}to{opacity:1;transform:none}}
@keyframes sb-fade{from{opacity:0}to{opacity:1}}
@keyframes sb-float{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(22px,-16px) scale(1.15)}}
@keyframes sb-sheen{0%{transform:translateX(-130%) rotate(20deg)}55%,100%{transform:translateX(230%) rotate(20deg)}}
@keyframes sb-pop{0%{opacity:0;transform:scale(.4)}60%{transform:scale(1.2)}100%{opacity:1;transform:scale(1)}}
@keyframes sb-tip{from{opacity:0;transform:translate(-6px,-50%)}to{opacity:1;transform:translate(0,-50%)}}
.sb-in{animation:sb-in .5s cubic-bezier(.2,.8,.2,1) both}
.sb-fade{animation:sb-fade .35s ease both}
.sb-float{animation:sb-float 11s ease-in-out infinite}
.sb-float2{animation:sb-float 14s ease-in-out infinite reverse}
.sb-sheen{animation:sb-sheen 4.5s ease-in-out infinite}
.sb-pop{animation:sb-pop .45s cubic-bezier(.2,.8,.2,1) both}
.sb-tip{animation:sb-tip .2s ease both}
@media (prefers-reduced-motion:reduce){.sb-in,.sb-fade,.sb-float,.sb-float2,.sb-sheen,.sb-pop,.sb-tip{animation:none!important}}
`;

const d = (i) => ({ animationDelay: `${Math.min(i, 16) * 40 + 60}ms` });
const STORE = "ledgerly.sidebar";

// tone: "rose" for overdue reminders.
function Badge({ n, tone = "rose", className = "" }) {
  const bg = tone === "amber" ? "bg-amber-500" : "bg-rose-500";
  const ping = tone === "amber" ? "bg-amber-500/60" : "bg-rose-500/60";
  return (
    <span className={`sb-pop relative inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-bold leading-none text-white ${bg} ${className}`}>
      <span aria-hidden className={`absolute inset-0 animate-ping rounded-full ${ping}`} style={{ animationDuration: "2.2s" }} />
      <span className="relative">{n > 99 ? "99+" : n}</span>
    </span>
  );
}

function Mark({ size = 40 }) {
  return (
    <span className="relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-[#2B8A66] to-[#1F5D46] shadow-lg shadow-black/30 ring-1 ring-white/20" style={{ width: size, height: size }}>
      <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24" fill="none" stroke="#F1D493" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 5a2 2 0 012-2h12v16H6a2 2 0 00-2 2V5zm2 14h12M8 7h6M8 11h4" />
      </svg>
      <span aria-hidden className="sb-sheen absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-white/40 to-transparent" />
    </span>
  );
}

// Everything inside the sidebar / drawer.
function Panel({ groups, home, path, user, overdue, collapsed, mobile, onNavigate, onToggle, onClose, onSignOut, onChangePassword }) {
  const nav = useRef(null);
  const links = useRef({});
  const [ind, setInd] = useState(null);
  const [hov, setHov] = useState(null);
  const [hovOn, setHovOn] = useState(false);

  const all = groups.flatMap(([, items]) => items.map(([h]) => h));
  const active = all.filter((h) => path === h || path.startsWith(h + "/")).sort((a, b) => b.length - a.length)[0];

  const measure = useCallback(() => {
    const el = links.current[active];
    if (el && el.offsetParent) setInd({ y: el.offsetTop, h: el.offsetHeight });
    else setInd(null);
  }, [active]);

  useEffect(() => {
    measure();
    const t = setTimeout(measure, 420);
    window.addEventListener("resize", measure);
    document.fonts?.ready?.then(measure);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", measure);
    };
  }, [measure, collapsed]);

  const enter = (e, label) => {
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    setHov({ y: el.offsetTop, h: el.offsetHeight, top: r.top + r.height / 2, left: r.right + 14, label });
    setHovOn(true);
  };

  const name = user?.name || "Account";
  const roleLabel = ROLE_LABEL[user?.role] || "Member";
  let c = 0;

  return (
    <div className="relative flex h-full min-h-0 flex-col text-[#F6F3EA]">
      {/* Ambient background */}
      <span aria-hidden className="sb-float pointer-events-none absolute -left-16 -top-10 h-52 w-52 rounded-full bg-emerald-400/20 blur-3xl" />
      <span aria-hidden className="sb-float2 pointer-events-none absolute -bottom-16 -right-16 h-60 w-60 rounded-full bg-amber-300/15 blur-3xl" />
      <span aria-hidden className="pointer-events-none absolute inset-0 opacity-70" style={{ backgroundImage: "radial-gradient(rgba(246,243,234,.07) 1px, transparent 1px)", backgroundSize: "22px 22px", WebkitMaskImage: "linear-gradient(to bottom, black, transparent 65%)", maskImage: "linear-gradient(to bottom, black, transparent 65%)" }} />

      {/* Brand */}
      <div className={`relative flex shrink-0 items-center ${collapsed ? "justify-center px-3 pt-5" : "justify-between gap-3 px-5 pt-6"}`}>
        <Link href={home} onClick={onNavigate} className="group/b flex min-w-0 items-center gap-3" aria-label="Ledgerly home">
          <span className="transition-transform duration-500 group-hover/b:rotate-[-6deg] group-hover/b:scale-105"><Mark /></span>
          {!collapsed && (
            <span className="sb-fade min-w-0">
              <span className="block truncate font-serif text-2xl font-medium leading-none tracking-tight">Ledgerly</span>
              <span className="mt-1 block truncate text-[12px] text-[#F6F3EA]/45">Books, closed on time</span>
            </span>
          )}
        </Link>

        {mobile && (
          <button type="button" onClick={onClose} aria-label="Close menu" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[#F6F3EA]/60 transition hover:rotate-90 hover:bg-white/10 hover:text-white">
            <I n="x" size={18} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav
        ref={nav}
        aria-label="Dashboard"
        onMouseLeave={() => setHovOn(false)}
        onScroll={() => setHovOn(false)}
        className="relative mt-3 flex-1 overflow-y-auto px-3 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {/* Hover pill */}
        {hov && (
          <span
            aria-hidden
            className="pointer-events-none absolute left-3 right-3 top-0 rounded-xl bg-white/[0.07] transition-[transform,height,opacity] duration-300 ease-out"
            style={{ transform: `translateY(${hov.y}px)`, height: hov.h, opacity: hovOn ? 1 : 0 }}
          />
        )}

        {/* Active indicator */}
        {ind && (
          <span
            aria-hidden
            className="sb-fade pointer-events-none absolute left-3 right-3 top-0 rounded-xl bg-gradient-to-r from-[#2B8A66]/80 via-[#1F5D46]/60 to-[#1F5D46]/20 shadow-[0_10px_28px_-10px_rgba(43,138,102,.7)] ring-1 ring-white/15 transition-[transform,height] duration-500 ease-[cubic-bezier(.2,.9,.25,1.1)]"
            style={{ transform: `translateY(${ind.y}px)`, height: ind.h }}
          >
            <span className="absolute bottom-2.5 left-0 top-2.5 w-[3px] rounded-full bg-gradient-to-b from-[#F1D493] to-[#B9852F]" />
          </span>
        )}

        {groups.map(([group, items], gi) => (
          <div key={group}>
            {collapsed ? (
              gi > 0 && <div className="mx-auto my-4 h-px w-6 bg-white/15" />
            ) : (
              <p className="sb-in px-3.5 pb-1.5 pt-5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#F6F3EA]/35" style={d(c++)}>{group}</p>
            )}

            {items.map(([href, label, icon]) => {
              const on = href === active;
              const badge = href === "/reminders" ? { n: overdue, tone: "rose" } : null;
              const showBadge = !!badge && badge.n > 0;
              return (
                <Link
                  key={href}
                  href={href}
                  ref={(el) => { if (el) links.current[href] = el; }}
                  onClick={onNavigate}
                  onMouseEnter={(e) => enter(e, label)}
                  onFocus={(e) => enter(e, label)}
                  aria-current={on ? "page" : undefined}
                  aria-label={collapsed ? label : undefined}
                  style={d(c++)}
                  className={`sb-in group/l relative z-10 my-0.5 flex items-center rounded-xl text-[15px] font-medium outline-none transition-colors duration-300 focus-visible:ring-2 focus-visible:ring-[#F1D493]/60 ${collapsed ? "h-11 justify-center" : "gap-3 px-3.5 py-2.5"} ${on ? "text-white" : "text-[#F6F3EA]/60 hover:text-white"}`}
                >
                  <span className={`relative flex h-5 w-5 shrink-0 items-center justify-center transition-all duration-300 group-hover/l:-rotate-6 group-hover/l:scale-110 ${on ? "text-[#F1D493]" : ""}`}>
                    <I n={icon} />
                    {showBadge && collapsed && <span className={`sb-pop absolute -right-1.5 -top-1.5 h-2.5 w-2.5 rounded-full ring-2 ring-[#0F2722] ${badge.tone === "amber" ? "bg-amber-500" : "bg-rose-500"}`} />}
                  </span>

                  <span className={`flex-1 overflow-hidden whitespace-nowrap transition-[opacity,max-width] duration-300 ${collapsed ? "max-w-0 opacity-0" : "max-w-[180px] opacity-100"}`}>{label}</span>

                  {showBadge && !collapsed && <Badge n={badge.n} tone={badge.tone} />}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Collapsed tooltip (fixed so the scroll area can't clip it) */}
      {collapsed && !mobile && hov && hovOn && (
        <span key={hov.label} className="sb-tip pointer-events-none fixed z-[80] whitespace-nowrap rounded-lg bg-[#0B1C18] px-3 py-1.5 text-sm font-medium text-[#F6F3EA] shadow-xl ring-1 ring-white/10" style={{ top: hov.top, left: hov.left }}>
          {hov.label}
        </span>
      )}

      {/* Footer */}
      <div className={`relative shrink-0 space-y-2 border-t border-white/10 ${collapsed ? "px-3 py-4" : "p-4"}`}>
        {!mobile && (
          <button
            type="button"
            onClick={onToggle}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-pressed={collapsed}
            className={`group/t flex w-full items-center rounded-xl text-[13px] text-[#F6F3EA]/50 outline-none transition hover:bg-white/[0.06] hover:text-white focus-visible:ring-2 focus-visible:ring-[#F1D493]/60 ${collapsed ? "h-10 justify-center" : "gap-2.5 px-3 py-2"}`}
          >
            <I n="chevron" size={18} className={`transition-transform duration-500 ${collapsed ? "rotate-180" : ""} group-hover/t:scale-110`} />
            {!collapsed && (
              <>
                <span className="flex-1 text-left">Collapse</span>
                <kbd className="rounded-md bg-white/10 px-1.5 py-0.5 font-mono text-[11px] text-[#F6F3EA]/50">[</kbd>
              </>
            )}
          </button>
        )}

        {/* Who is signed in */}
        <div className={`group/u flex items-center rounded-2xl bg-white/[0.05] ring-1 ring-white/10 transition duration-300 hover:bg-white/[0.09] hover:ring-white/20 ${collapsed ? "justify-center p-1.5" : "gap-3 p-2.5"}`} title={collapsed ? `${name} (${roleLabel})` : undefined}>
          <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#2B8A66] to-[#B9852F] font-serif text-lg text-white shadow-md transition-transform duration-300 group-hover/u:scale-105 group-hover/u:-rotate-3">
            {name[0]?.toUpperCase()}
            <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
              <span aria-hidden className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/70" style={{ animationDuration: "2.6s" }} />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-[#0F2722]" />
            </span>
          </span>
          {!collapsed && (
            <span className="sb-fade min-w-0 flex-1">
              <span className="block truncate text-[14px] font-medium">{name}</span>
              <span className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${ROLE_CHIP[user?.role] || "bg-white/10 text-[#F6F3EA]/70"}`}>{roleLabel}</span>
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={onChangePassword}
          title={collapsed ? "Change password" : undefined}
          aria-label="Change password"
          className={`group/p flex w-full items-center rounded-xl text-[13px] text-[#F6F3EA]/55 outline-none transition hover:bg-white/[0.06] hover:text-white focus-visible:ring-2 focus-visible:ring-[#F1D493]/60 ${collapsed ? "h-10 justify-center" : "gap-2.5 px-3 py-2"}`}
        >
          <I n="shield" size={17} />
          {!collapsed && <span>Change password</span>}
        </button>

        <button
          type="button"
          onClick={onSignOut}
          title={collapsed ? "Sign out" : undefined}
          aria-label="Sign out"
          className={`group/o flex w-full items-center rounded-xl text-[13px] text-[#F6F3EA]/55 outline-none transition hover:bg-rose-500/15 hover:text-rose-200 focus-visible:ring-2 focus-visible:ring-[#F1D493]/60 ${collapsed ? "h-10 justify-center" : "gap-2.5 px-3 py-2"}`}
        >
          <I n="logout" size={17} className="transition-transform duration-300 group-hover/o:translate-x-0.5" />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
    </div>
  );
}

export default function Sidebar() {
  const user = useUser();
  const path = usePathname() || "";

  const books = can(user.role, "/reminders");

  // Overdue reminders (books roles only).
  const rem = useAsync(() => (books ? api("/reminders?days=7") : Promise.resolve(null)), [path]);
  const overdue = rem.data?.summary?.overdue_count || 0;

  // Only the pages this role may open.
  const groups = NAV
    .map(([g, items]) => [g, items.filter(([href]) => can(user.role, href)).map(([href, label, icon]) => [href, href === "/contacts" && user.role === "sales" ? "Customers" : label, icon])])
    .filter(([, items]) => items.length);

  const home = homeFor(user.role);

  async function signOut() {
    try { await fetch("/api/auth/logout", { method: "POST" }); } catch {}
    window.location.href = "/";
  }

  const [collapsed, setCollapsed] = useState(false);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [drawerKey, setDrawerKey] = useState(0);

  // Restore the saved state (without animating the restore).
  useEffect(() => {
    try { setCollapsed(localStorage.getItem(STORE) === "1"); } catch {}
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const toggle = useCallback(() => {
    setCollapsed((c) => {
      try { localStorage.setItem(STORE, c ? "0" : "1"); } catch {}
      return !c;
    });
  }, []);

  // Optional CSS variable for layouts: var(--sidebar-w)
  useEffect(() => {
    document.documentElement.style.setProperty("--sidebar-w", collapsed ? "84px" : "272px");
  }, [collapsed]);

  // "[" toggles the sidebar.
  useEffect(() => {
    const onKey = (e) => {
      const t = e.target;
      if (e.key !== "[" || e.metaKey || e.ctrlKey || e.altKey) return;
      if (t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      toggle();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle]);

  // Close the drawer on navigation.
  useEffect(() => setOpen(false), [path]);

  // Drawer: Esc to close + lock page scroll.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const openDrawer = () => { setDrawerKey((k) => k + 1); setOpen(true); };

  const [pwOpen, setPwOpen] = useState(false);
  const shared = { groups, home, path, user, overdue, onSignOut: signOut, onChangePassword: () => setPwOpen(true) };

  return (
    <>
      <style>{CSS}</style>
      {pwOpen && <ChangePassword onClose={() => setPwOpen(false)} />}

      {/* Desktop sidebar */}
      <aside
        aria-label="Sidebar"
        className={`sticky top-0 hidden h-screen shrink-0 overflow-hidden bg-gradient-to-b from-[#12302A] via-[#0F2722] to-[#0B1C18] shadow-[8px_0_40px_-12px_rgba(0,0,0,.45)] ring-1 ring-white/5 lg:block ${ready ? "transition-[width] duration-500 ease-[cubic-bezier(.2,.8,.2,1)]" : ""} ${collapsed ? "w-[84px]" : "w-[272px]"}`}
      >
        <Panel {...shared} collapsed={collapsed} onToggle={toggle} />
      </aside>

      {/* Mobile top bar */}
      <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between bg-[#0F2722]/85 px-3 text-[#F6F3EA] shadow-lg shadow-black/20 ring-1 ring-white/5 backdrop-blur-xl lg:hidden">
        <button type="button" onClick={openDrawer} aria-label="Open menu" aria-expanded={open} className="flex h-10 w-10 items-center justify-center rounded-xl transition hover:bg-white/10 active:scale-90">
          <span className="relative block h-5 w-5">
            <span className="absolute left-0 top-[3px] h-0.5 w-5 rounded bg-current" />
            <span className="absolute left-0 top-[9px] h-0.5 w-3.5 rounded bg-current" />
            <span className="absolute left-0 top-[15px] h-0.5 w-5 rounded bg-current" />
          </span>
        </button>

        <Link href={home} className="flex items-center gap-2.5" aria-label="Ledgerly home">
          <Mark size={32} />
          <span className="font-serif text-xl font-medium tracking-tight">Ledgerly</span>
        </Link>

        {books ? (
          <Link href="/reminders" aria-label={overdue ? `Reminders, ${overdue} overdue` : "Reminders"} className="relative flex h-10 w-10 items-center justify-center rounded-xl transition hover:bg-white/10 active:scale-90">
            <I n="bell" size={20} />
            {overdue > 0 && <Badge n={overdue} className="absolute -right-0.5 -top-0.5 !h-[18px] !min-w-[18px] !px-1 !text-[10px]" />}
          </Link>
        ) : (
          <span className="h-10 w-10" aria-hidden />
        )}
      </header>

      {/* Mobile drawer */}
      <div
        aria-hidden={!open}
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-[45] bg-[#06100d]/60 backdrop-blur-sm transition-opacity duration-500 lg:hidden ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        aria-hidden={!open}
        className={`fixed inset-y-0 left-0 z-50 w-[86%] max-w-[300px] overflow-hidden bg-gradient-to-b from-[#12302A] via-[#0F2722] to-[#0B1C18] shadow-2xl ring-1 ring-white/10 transition-[transform,visibility] duration-500 ease-[cubic-bezier(.2,.8,.2,1)] lg:hidden ${open ? "visible translate-x-0" : "invisible -translate-x-full"}`}
      >
        <Panel key={drawerKey} {...shared} collapsed={false} mobile onNavigate={() => setOpen(false)} onClose={() => setOpen(false)} />
      </aside>
    </>
  );
}