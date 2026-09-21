import { AdminLoginForm } from "@/components/admin/admin-login-form";
import { currentAdmin } from "@/lib/server/admin-session";
import { redirect } from "next/navigation";

export default async function AdminLoginPage() {
  if (await currentAdmin()) redirect("/");
  return <AdminLoginForm/>;
}
