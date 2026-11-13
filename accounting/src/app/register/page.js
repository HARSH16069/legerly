import { redirect } from "next/navigation";
import AuthForm from "@/components/AuthForm";
import { getSession } from "@/lib/auth";
import { homeFor } from "@/lib/roles";

export const metadata = { title: "Create account" };
export default async function Page() {
  const s = await getSession();
  if (s.signedIn) redirect(homeFor(s.user.role));
  return <AuthForm mode="register" />;
}
