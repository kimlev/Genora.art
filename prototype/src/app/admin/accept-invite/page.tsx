import { createHash } from "node:crypto";
import { AdminInvitationForm } from "@/components/admin/admin-invitation-form";
import { query } from "@/lib/server/db";

export default async function AcceptAdminInvitationPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const token=(await searchParams).token??""; const tokenHash=createHash("sha256").update(token).digest("hex");
  const rows=token?await query<{email:string}>("SELECT email FROM admin_invitations WHERE token_hash=$1 AND accepted_at IS NULL AND expires_at>now()",[tokenHash]):[];
  if(!rows[0]) return <main className="grid min-h-dvh place-items-center px-4"><div className="max-w-md rounded-3xl border border-slate-700 bg-slate-900 p-8 text-center"><h1 className="text-xl font-semibold">Ссылка недействительна</h1><p className="mt-2 text-sm text-slate-400">Запросите новое приглашение у администратора Genora.art.</p></div></main>;
  return <AdminInvitationForm token={token} email={rows[0].email}/>;
}
