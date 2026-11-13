"use client";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useUser } from "@/components/Session";
import { can, homeFor } from "@/lib/roles";

// Sends people away from pages their role can't use.
export default function RoleGate({ children }) {
  const user = useUser(), path = usePathname(), router = useRouter();
  const ok = can(user.role, "/" + path.split("/")[1]);
  useEffect(() => { if (!ok) router.replace(homeFor(user.role)); }, [ok, router, user.role]);
  return ok ? children : null;
}
