"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole, Loader2, ShieldCheck } from "lucide-react";
import { BrandWordmark } from "@/components/layout/brand-wordmark";

export function AdminLoginForm() {
  const router = useRouter();
  const [email,setEmail] = useState("");
  const [password,setPassword] = useState("");
  const [pin,setPin] = useState("");
  const [pinRequired,setPinRequired] = useState(false);
  const [error,setError] = useState<string|null>(null);
  const [submitting,setSubmitting] = useState(false);
  const [remember,setRemember] = useState(true);

  const submit = async (event:FormEvent) => {
    event.preventDefault(); setSubmitting(true); setError(null);
    const response = await fetch("/api/admin/auth/login",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({email,password,pin,remember})}).catch(()=>null);
    if (!response?.ok) {
      const data = response ? await response.json().catch(()=>null) as {error?:string;code?:string}|null : null;
      if(data?.code==="PIN_REQUIRED") setPinRequired(true);
      setError(data?.error??"Не удалось выполнить вход"); setSubmitting(false); return;
    }
    router.replace("/admin"); router.refresh();
  };

  return <main className="grid min-h-dvh place-items-center px-4 py-10">
    <form onSubmit={submit} className="w-full max-w-md rounded-3xl border border-neutral-700/70 bg-neutral-900/80 p-7 shadow-2xl shadow-black/30">
      <div className="mb-7 flex items-start gap-4"><span className="grid size-11 place-items-center rounded-2xl bg-[#FF6F00]/15 text-[#ff8a33]"><ShieldCheck className="size-6"/></span><div><p className="text-xs font-semibold uppercase tracking-[.18em] text-[#ff8a33]">Dev environment</p><BrandWordmark theme="dark" className="mt-1" /><p className="mt-1 text-sm text-neutral-400">Административная панель Genora.art</p></div></div>
      <label className="grid gap-2 text-sm text-neutral-300">Корпоративный email<input autoComplete="username" type="email" required value={email} onChange={(e)=>setEmail(e.target.value)} className="h-11 rounded-xl border border-neutral-700 bg-neutral-950 px-3 outline-none focus:border-[#FF6F00]"/></label>
      <label className="mt-4 grid gap-2 text-sm text-neutral-300">Пароль<input autoComplete="current-password" type="password" required value={password} onChange={(e)=>setPassword(e.target.value)} className="h-11 rounded-xl border border-neutral-700 bg-neutral-950 px-3 outline-none focus:border-[#FF6F00]"/></label>
      {pinRequired?<label className="mt-4 grid gap-2 text-sm text-neutral-300">PIN-код<input autoFocus inputMode="numeric" pattern="[0-9]{4}" maxLength={4} required value={pin} onChange={(e)=>setPin(e.target.value.replace(/\D/g,""))} className="h-11 rounded-xl border border-neutral-700 bg-neutral-950 px-3 tracking-[.4em] outline-none focus:border-[#FF6F00]"/></label>:null}
      <label className="mt-4 flex items-center gap-2 text-sm text-neutral-300"><input type="checkbox" checked={remember} onChange={event=>setRemember(event.target.checked)} className="size-4 accent-[#FF6F00]"/>Запомнить меня</label>
      {error?<p role="alert" className="mt-4 rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>:null}
      <button disabled={submitting} className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#FF6F00] font-semibold text-white hover:bg-[#ff8a33] disabled:opacity-60">{submitting?<Loader2 className="size-4 animate-spin"/>:<LockKeyhole className="size-4"/>}Войти</button>
      <p className="mt-4 text-center text-xs text-neutral-500">Самостоятельная регистрация администраторов отключена. 2FA будет подключена отдельным этапом.</p>
    </form>
  </main>;
}
