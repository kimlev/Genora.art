import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { parseAdminSection } from "@/components/admin/admin-types";
import { currentAdmin } from "@/lib/server/admin-session";
import { getAdminDashboardData } from "@/lib/server/admin-dashboard-data";
import { redirect } from "next/navigation";

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ section?: string }> }) {
  const admin=await currentAdmin();
  if(!admin) redirect("/login");
  const { section }=await searchParams;
  return <AdminDashboard admin={admin} initialData={await getAdminDashboardData()} initialSection={parseAdminSection(section)}/>;
}
