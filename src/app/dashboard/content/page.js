import { redirect } from "next/navigation";
import { getCurrentUser, getUserDoc } from "@/lib/server/auth";
import Nav from "@/components/Nav";
import DashboardShell from "@/components/dashboard/DashboardShell";

export const dynamic = "force-dynamic";

export default async function DashboardContentPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const userDoc = await getUserDoc(user.uid);

  return (
    <Nav role={userDoc?.role}>
      <DashboardShell view="content" />
    </Nav>
  );
}