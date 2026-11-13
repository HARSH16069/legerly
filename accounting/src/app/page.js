import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { homeFor } from "@/lib/roles";
import Landing from "./Landing";

// Not signed in -> the public home page. Signed in -> the page that suits the person's role.
export default async function Home() {
  const session = await getSession();
  if (session.signedIn) redirect(homeFor(session.user.role));
  return <Landing />;
}
