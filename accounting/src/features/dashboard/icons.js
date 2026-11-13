const ICONS = {
  sales: "M3 3v18h18 M7 14l4-4 4 4 6-7",
  purchase: "M3 3h18v18H3z M8 8h8 M8 12h8 M8 16h5",
  customer: "M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2 M9 11a4 4 0 100-8 4 4 0 000 8 M20 8v6 M17 11h6",
  scale: "M12 3v18M7 21h10M5 7h14M5 7l-3 7a3 3 0 006 0L5 7zm14 0l-3 7a3 3 0 006 0l-3-7z",
  supplier: "M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2 M9 11a4 4 0 100-8 4 4 0 000 8 M16 11l2 2 4-4",
  cash: "M3 6h18v14H3z M3 10h18 M7 15h3 M17 15h1 M7 3h10",
  gst: "M12 2v20 M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6",
  alert: "M12 9v4 M12 17h.01 M10.3 3.9L1.8 18.5A2 2 0 003.5 21h17a2 2 0 001.7-2.5L13.7 3.9a2 2 0 00-3.4 0z",
  check: "M5 12.5l4.5 4.5L19 7.5",
  book: "M4 4.5A2.5 2.5 0 016.5 2H20v17H6.5A2.5 2.5 0 004 21.5z M4 21.5V4.5 M9 7h7",
  plus: "M12 5v14 M5 12h14",
  journal: "M5 3h11l3 3v15H5z M9 9h7 M9 13h7 M9 17h4",
  bell: "M6 8a6 6 0 0112 0c0 7 3 8 3 8H3s3-1 3-8 M10 21a2 2 0 004 0",
  trend: "M3 17l6-6 4 4 8-9 M15 6h6v6",
  wallet: "M3 7a2 2 0 012-2h13v4 M3 7v11a2 2 0 002 2h15V9H5a2 2 0 01-2-2z M16 14h2",
  clock: "M12 7v5l3 2 M12 21a9 9 0 100-18 9 9 0 000 18z",
  arrow: "M5 12h14 M13 6l6 6-6 6",
  shield: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z M9 12l2 2 4-4",
  
};

export function Icon({ name, size = 19 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={ICONS[name] || ICONS.book} />
    </svg>
  );
}