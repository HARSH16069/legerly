import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { SessionProvider } from "@/components/Session";
import RoleGate from "@/components/shell/RoleGate";
import Sidebar from "@/components/shell/Sidebar";
import { ToastProvider } from "@/components/ui";

export default async function AppLayout({ children }) {
  const session = await getSession();
  if (!session.signedIn) redirect("/signin");
  return (
    <SessionProvider user={session.user}>
      <ToastProvider>
        <div className="app-shell">
          <Sidebar />
          <main className="main"><RoleGate>{children}</RoleGate></main>
        </div>
      </ToastProvider>
    </SessionProvider>
  );
}
