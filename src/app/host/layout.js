import { redirect } from "next/navigation";
import { getCurrentUser, getUserDoc } from "@/lib/server/auth";
import { listHostAssignments } from "@/lib/server/hosts";

export const dynamic = "force-dynamic";

export default async function HostLayout({ children }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const userDoc = await getUserDoc(user.uid);
  const role = userDoc?.role;
  if (role === "owner" || role === "moderator") return children;

  const assignments = await listHostAssignments({ userId: user.uid });
  if (assignments.length === 0) redirect("/dashboard");

  return children;
}
