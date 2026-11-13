"use client";
import { useEffect, useRef, useState } from "react";

// Fades an element in when it scrolls into view.
// variant: "up" (default) | "left" | "right" | "scale" | "fade"   delay: milliseconds
export default function Reveal({ children, className = "", delay = 0, variant = "up", as: Tag = "div", ...rest }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag ref={ref} data-v={variant} className={`reveal ${visible ? "visible" : ""} ${className}`} style={{ transitionDelay: `${delay}ms` }} {...rest}>
      {children}
    </Tag>
  );
}
