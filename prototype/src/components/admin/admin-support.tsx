"use client";

import { renderEmailHtml } from "@/lib/email-html";
import { useEffect, useState } from "react";
import { Download, Languages, Loader2, Mail, Pencil, Plus, Send, Sparkles, Trash2, X } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { SUPPORT_MAIL_PROVIDERS } from "@/lib/support-mail-providers";
import { looksLikeRussian } from "@/lib/support-translation";
import { acquireScrollLock } from "@/lib/scroll-lock";
import { AdminSelect } from "@/components/admin/admin-select";

type SupportMessage = { id: string; direction: "inbound" | "outbound"; authorType: "client" | "agent" | "administrator"; content: string; createdAt: string };
type Item = { id: string; publicId: string; name: string; email: string; inboxEmail?: string | null; topic: string; status: "new" | "in_progress" | "requires_human"; draftReply: string | null; createdAt: string; repliedAt: string | null; translationRu: string | null; translatedAt: string | null; readAt: string | null; messages: SupportMessage[] };
type Mailbox = { id: string; email: string; provider: string; providerLabel: string; enabled: boolean; lastError: string | null; isPrimary?: boolean; isAuth?: boolean };

const statusLabels = { new: "Новое", in_progress: "В работе", requires_human: "Требуется сотрудник" } as const;
const statusStyles = {
  new: "bg-orange-100 text-orange-900 dark:bg-orange-500/20 dark:text-orange-200",
  in_progress: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200",
  requires_human: "bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200",
} as const;
const topicLabels: Record<string, string> = { cooperation: "Сотрудничество", "billing-refund": "Оплата и возврат", other: "Другой вопрос", "inbound-email": "Письмо на почту" };

function date(value: string): string {
  return new Intl.DateTimeFormat("ru-RU", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

export function AdminSupport() {
  const [items, setItems] = useState<Item[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [working, setWorking] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([]);
  const [filterInbox, setFilterInbox] = useState("");
  const [appliedInbox, setAppliedInbox] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formProvider, setFormProvider] = useState(SUPPORT_MAIL_PROVIDERS[0].id);
  const [formPrimary, setFormPrimary] = useState(false);
  const [formAuth, setFormAuth] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [savingMailbox, setSavingMailbox] = useState(false);
  const [mailboxBusy, setMailboxBusy] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const selected = items.find((item) => item.id === selectedId) ?? null;
  const deleteMailbox = mailboxes.find((item) => item.id === deleteId) ?? null;

  const load = async (inbox = appliedInbox) => {
    setLoading(true);
    const query = inbox ? `?inbox=${encodeURIComponent(inbox)}` : "";
    const response = await fetch(`/api/admin/support${query}`, { cache: "no-store" });
    if (response.ok) {
      const data = await response.json() as { requests: Item[] };
      setItems(data.requests);
      setSelectedId((current) => current && data.requests.some((item) => item.id === current) ? current : null);
    }
    setLoading(false);
  };

  useEffect(() => {
    let active = true;
    void Promise.all([
      fetch("/api/admin/support", { cache: "no-store" }).then((response) => response.ok ? response.json() : null),
      fetch("/api/admin/support/mailboxes", { cache: "no-store" }).then((response) => response.ok ? response.json() : null),
    ]).then(([support, boxes]: [{ requests: Item[] } | null, { mailboxes?: Mailbox[] } | null]) => {
      if (!active) return;
      if (support) setItems(support.requests);
      if (boxes?.mailboxes) setMailboxes(boxes.mailboxes);
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const openMailboxForm = (mailbox?: Mailbox) => {
    setEditingId(mailbox?.id ?? null);
    setFormEmail(mailbox?.email ?? "");
    setFormPassword("");
    setFormProvider((mailbox?.provider as typeof SUPPORT_MAIL_PROVIDERS[number]["id"]) ?? SUPPORT_MAIL_PROVIDERS[0].id);
    setFormPrimary(mailbox?.isPrimary ?? false);
    setFormAuth(mailbox?.isAuth ?? false);
    setFormError(null);
    setFormOpen(true);
  };

  const saveMailbox = async () => {
    setSavingMailbox(true);
    setFormError(null);
    const response = await fetch("/api/admin/support/mailboxes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: editingId, email: formEmail, provider: formProvider, appPassword: formPassword, isPrimary: formPrimary, isAuth: formAuth }),
    });
    const data = await response.json().catch(() => null) as { error?: string; mailboxes?: Mailbox[] } | null;
    if (!response.ok) setFormError(data?.error ?? "Не удалось сохранить почту");
    else {
      setMailboxes(data?.mailboxes ?? []);
      setFormOpen(false);
      setMessage(editingId ? "Почта обновлена" : "Почта подключена");
    }
    setSavingMailbox(false);
  };

  const removeMailbox = async () => {
    if (!deleteId) return;
    setMailboxBusy(deleteId);
    const response = await fetch("/api/admin/support/mailboxes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "delete", id: deleteId }),
    });
    const data = await response.json().catch(() => null) as { error?: string; mailboxes?: Mailbox[] } | null;
    if (!response.ok) setMessage(data?.error ?? "Не удалось удалить почту");
    else {
      setMailboxes(data?.mailboxes ?? []);
      if (appliedInbox && !data?.mailboxes?.some((item) => item.email === appliedInbox)) {
        setFilterInbox("");
        setAppliedInbox("");
        await load("");
      }
      setMessage("Почта отключена. Новые письма с неё больше не попадут в обращения.");
    }
    setDeleteId(null);
    setMailboxBusy(null);
  };

  const syncMailbox = async (id: string) => {
    setMailboxBusy(id);
    setMessage(null);
    const response = await fetch("/api/admin/support/mailboxes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "sync", id, full: true }),
    });
    const data = await response.json().catch(() => null) as { error?: string; result?: { tickets?: number; ignored?: number; error?: string }; mailboxes?: Mailbox[] } | null;
    if (!response.ok) setMessage(data?.error ?? "Не удалось загрузить письма");
    else {
      if (data?.mailboxes) setMailboxes(data.mailboxes);
      const result = data?.result;
      setMessage(result && "error" in result && result.error
        ? `Не удалось загрузить письма: ${result.error}`
        : `Загружено новых писем: ${result?.tickets ?? 0}. Уже были в обращениях: ${result?.ignored ?? 0}.`);
      await load();
    }
    setMailboxBusy(null);
  };

  const applyFilter = () => {
    setAppliedInbox(filterInbox);
    void load(filterInbox);
  };

  useEffect(() => {
    if (!selected) return;
    return acquireScrollLock();
  }, [selected]);

  const open = (item: Item) => {
    const openedAt = item.readAt ?? new Date().toISOString();
    setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, readAt: openedAt } : entry));
    setSelectedId(item.id);
    setReply(item.draftReply ?? "");
    setMessage(null);
    setShowTranslation(false);
    setLoadingDetail(true);
    void fetch("/api/admin/support", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "read", id: item.id }),
    })
      .then((response) => response.ok ? response.json() : null)
      .then((data: { request?: Item } | null) => {
        if (!data?.request) {
          setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, readAt: item.readAt } : entry));
          return;
        }
        setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, ...data.request } : entry));
        setReply(data.request.draftReply ?? "");
      })
      .catch(() => setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, readAt: item.readAt } : entry)))
      .finally(() => setLoadingDetail(false));
  };

  const close = () => {
    setSelectedId(null);
    setReply("");
    setMessage(null);
    setShowTranslation(false);
  };

  const action = async (kind: "draft" | "send") => {
    if (!selected) return;
    setWorking(true);
    setMessage(null);
    const response = await fetch("/api/admin/support", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: kind, id: selected.id, reply }) });
    const data = await response.json().catch(() => null) as { error?: string; draft?: string } | null;
    if (!response.ok) setMessage(data?.error ?? "Не удалось выполнить действие");
    else if (kind === "draft" && data?.draft) {
      setReply(data.draft);
      setMessage("Черновик подготовлен. Проверьте его перед отправкой.");
    } else {
      setReply("");
      setMessage("Ответ отправлен");
      await load();
    }
    setWorking(false);
  };

  const translate = async () => {
    if (!selected || translating) return;
    if (selected.translationRu && looksLikeRussian(selected.translationRu)) {
      setShowTranslation((open) => !open);
      return;
    }
    setTranslating(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/support", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "translate", id: selected.id, force: Boolean(selected.translationRu) }) });
      const data = await response.json().catch(() => null) as { error?: string; translationRu?: string } | null;
      if (!response.ok || !data?.translationRu) {
        setMessage(data?.error ?? "Не удалось перевести письмо");
        return;
      }
      setItems((current) => current.map((item) => item.id === selected.id ? { ...item, translationRu: data.translationRu ?? "", translatedAt: new Date().toISOString() } : item));
      setShowTranslation(true);
    } catch {
      setMessage("Не удалось перевести письмо");
    } finally {
      setTranslating(false);
    }
  };

  if (loading) return <div className="grid min-h-72 place-items-center"><Loader2 className="size-6 animate-spin text-orange-400"/></div>;

  return <>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <button type="button" onClick={() => openMailboxForm()} className="inline-flex h-10 items-center gap-2 rounded-xl bg-orange-600 px-4 text-xs font-semibold text-white">
        <Plus className="size-4"/>Подключить почту
      </button>
      <div className="flex flex-wrap items-center gap-2">
        <AdminSelect label="Почта" value={filterInbox} options={mailboxes.map((mailbox) => ({ value: mailbox.email, label: mailbox.email }))} emptyLabel="Все подключённые" onChange={setFilterInbox} className="min-w-56" />
        <button type="button" onClick={applyFilter} className="inline-flex h-10 items-center rounded-xl border border-slate-300 px-4 text-xs font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">Применить</button>
      </div>
    </div>

    {mailboxes.length ? (
      <div className="mb-4 flex flex-wrap gap-2">
        {mailboxes.map((mailbox) => (
          <div key={mailbox.id} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
            <Mail className="size-3.5 text-orange-600"/>
            <span className="font-medium">{mailbox.email}</span>
            {mailbox.isPrimary ? <span className="rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-semibold text-orange-700 dark:bg-orange-500/20 dark:text-orange-200">Главная</span> : null}
            {mailbox.isAuth ? <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">2ФА</span> : null}
            <span className="text-slate-500">{mailbox.providerLabel}</span>
            <button type="button" aria-label={`Редактировать ${mailbox.email}`} onClick={() => openMailboxForm(mailbox)} className="grid size-7 place-items-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"><Pencil className="size-3.5"/></button>
            <button type="button" aria-label={`Удалить ${mailbox.email}`} onClick={() => setDeleteId(mailbox.id)} className="grid size-7 place-items-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"><Trash2 className="size-3.5"/></button>
            <button type="button" aria-label={`Загрузить письма ${mailbox.email}`} disabled={mailboxBusy === mailbox.id} onClick={() => void syncMailbox(mailbox.id)} className="grid size-7 place-items-center rounded-full hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-slate-800">{mailboxBusy === mailbox.id ? <Loader2 className="size-3.5 animate-spin"/> : <Download className="size-3.5"/>}</button>
          </div>
        ))}
      </div>
    ) : <p className="mb-4 text-xs text-slate-500">Подключённых почт пока нет. Новые письма не будут попадать в обращения.</p>}
    {message && !selected ? <p className="mb-3 text-xs text-orange-700 dark:text-orange-300">{message}</p> : null}

    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60">
      <table className="w-full min-w-[860px] border-collapse">
        <thead><tr>
          <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">ID</th>
          <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">Почта</th>
          <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">Дата и время</th>
          <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">Почта для обратной связи</th>
          <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">Тема</th>
          <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">Статус</th>
        </tr></thead>
        <tbody>{items.map((item) => <tr key={item.id} onClick={() => open(item)} className={`cursor-pointer border-t border-slate-200 text-xs text-slate-950 transition hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800/55 ${item.readAt ? "font-normal" : "font-semibold"}`}>
          <td className="px-4 py-3 font-semibold text-orange-700 dark:text-orange-300">{item.publicId}</td>
          <td className="px-4 py-3">{item.inboxEmail || "—"}</td>
          <td className="px-4 py-3">{date(item.createdAt)}</td>
          <td className="px-4 py-3">{item.email}</td>
          <td className="px-4 py-3">{topicLabels[item.topic] ?? item.topic}</td>
          <td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${statusStyles[item.status]}`}>{statusLabels[item.status]}</span></td>
        </tr>)}</tbody>
      </table>
      {!items.length ? <p className="p-10 text-center text-sm text-slate-500">Обращений пока нет</p> : null}
    </div>

    {selected ? <div className="fixed inset-0 z-50 grid place-items-center overflow-hidden overscroll-none bg-slate-900/30 p-4 backdrop-blur-sm dark:bg-slate-950/75" role="dialog" aria-modal="true" aria-label={`Обращение ${selected.publicId}`} onWheel={(event) => event.stopPropagation()} onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
      <section className="flex h-[min(92dvh,880px)] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white text-slate-950 shadow-2xl dark:border-slate-700 dark:bg-[#0b1626] dark:text-slate-100">
        <header className="shrink-0 flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div>
            <p className="text-xs font-semibold text-orange-700 dark:text-orange-300">Обращение № {selected.publicId}</p>
            <h2 className="mt-1 font-semibold">{selected.name} · {selected.email}</h2>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-500">{topicLabels[selected.topic] ?? selected.topic} · {date(selected.createdAt)}{selected.inboxEmail ? ` · на ${selected.inboxEmail}` : ""}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={translating}
              onClick={() => void translate()}
              className="inline-flex h-9 items-center gap-2 rounded-xl bg-orange-600 px-3 text-xs font-semibold text-white disabled:opacity-50"
            >
              {translating ? <Loader2 className="size-4 animate-spin"/> : <Languages className="size-4"/>}
              {translating ? "Перевод" : selected.translationRu ? (showTranslation ? "Оригинал" : "Показать перевод") : "Перевод"}
            </button>
            <button type="button" aria-label="Закрыть обращение" onClick={close} className="grid size-9 place-items-center rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"><X className="size-4"/></button>
          </div>
        </header>
        <div className="relative min-h-0 flex-1 overflow-hidden bg-slate-50/60 dark:bg-transparent">
          <div className="h-full space-y-3 overflow-y-auto overscroll-contain p-5">{loadingDetail && !selected.messages.length ? <div className="grid min-h-40 place-items-center"><Loader2 className="size-5 animate-spin text-orange-400"/></div> : selected.messages.map((entry) => (
            <div key={entry.id} className={`flex ${entry.direction === "outbound" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[min(100%,42rem)] overflow-x-auto rounded-2xl px-4 py-3 ${entry.direction === "outbound" ? "bg-orange-600 text-white" : "border border-slate-200 bg-white text-black dark:border-transparent dark:bg-slate-900 dark:text-slate-200"}`}>
                {entry.direction === "outbound" ? <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{entry.content}</p> : <div className="email-body max-w-full overflow-x-auto break-words text-sm leading-relaxed [overflow-wrap:anywhere] [&_a]:text-orange-700 [&_a]:underline [&_img]:h-auto [&_img]:max-w-full [&_table]:w-full [&_td]:align-top" dangerouslySetInnerHTML={{ __html: renderEmailHtml(entry.content) }} />}
                <p className={`mt-2 text-[10px] ${entry.direction === "outbound" ? "text-orange-100" : "text-slate-600 dark:text-slate-500"}`}>{entry.direction === "outbound" ? "Агент поддержки" : "Клиент"} · {date(entry.createdAt)}</p>
              </div>
            </div>
          ))}</div>
          {showTranslation && selected.translationRu ? (
            <div className="absolute inset-0 z-10 overflow-y-auto overscroll-contain bg-white/95 p-5 dark:bg-[#0b1626]/95">
              <div className="mx-auto max-w-[42rem] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-black dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
                <div className="email-body max-w-full overflow-x-auto break-words text-sm leading-relaxed [overflow-wrap:anywhere] [&_a]:text-orange-700 [&_a]:underline" dangerouslySetInnerHTML={{ __html: renderEmailHtml(selected.translationRu) }} />
                <p className="mt-2 text-[10px] text-slate-600 dark:text-slate-500">Переведено на русский{selected.translatedAt ? ` · ${date(selected.translatedAt)}` : ""}</p>
              </div>
            </div>
          ) : null}
        </div>
        <div className="relative z-20 shrink-0 border-t border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0b1626]"><label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-500">Ответ<textarea value={reply} onChange={(event) => setReply(event.target.value)} className="mt-2 min-h-32 w-full rounded-xl border border-slate-300 bg-white p-4 text-sm normal-case text-black outline-none focus:border-orange-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white" placeholder="Подготовьте ответ вручную или через AI-агента"/></label>{selected.status === "requires_human" ? <p className="mt-3 rounded-xl bg-amber-100 px-3 py-2 text-xs font-medium text-amber-900 dark:bg-amber-500/15 dark:text-amber-200">AI-ответы остановлены. Обращение должен продолжить сотрудник.</p> : null}{message ? <p className="mt-3 text-xs text-orange-700 dark:text-orange-300">{message}</p> : null}<div className="mt-4 flex flex-wrap gap-3"><button onClick={() => void action("draft")} disabled={working || selected.status === "requires_human"} className="inline-flex h-10 items-center gap-2 rounded-xl border border-orange-600 px-4 text-xs font-semibold text-orange-700 disabled:opacity-50 dark:border-orange-500 dark:text-orange-300"><Sparkles className="size-4"/>Подготовить через AI</button><button onClick={() => void action("send")} disabled={working || !reply.trim()} className="inline-flex h-10 items-center gap-2 rounded-xl bg-orange-600 px-4 text-xs font-semibold text-white disabled:opacity-50">{working ? <Loader2 className="size-4 animate-spin"/> : <Send className="size-4"/>}Отправить письмо</button><span className="ml-auto inline-flex items-center gap-2 text-xs text-slate-600 dark:text-slate-500"><Mail className="size-4"/>{selected.email}</span></div></div>
      </section>
    </div> : null}

    {formOpen ? <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/30 p-4 backdrop-blur-sm dark:bg-slate-950/75" role="dialog" aria-modal="true" aria-label="Подключить почту" onMouseDown={(event) => { if (event.target === event.currentTarget) setFormOpen(false); }}>
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-5 text-slate-950 shadow-2xl dark:border-slate-700 dark:bg-[#0b1626] dark:text-slate-100">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{editingId ? "Редактировать почту" : "Подключить почту"}</h2>
            <p className="mt-1 text-xs text-slate-500">Пароль приложения проверяется при сохранении. Если он неверный, почта не будет добавлена.</p>
          </div>
          <button type="button" aria-label="Закрыть" onClick={() => setFormOpen(false)} className="grid size-9 place-items-center rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"><X className="size-4"/></button>
        </div>
        <label className="mt-4 block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">Почта
          <input value={formEmail} onChange={(event) => setFormEmail(event.target.value)} type="email" autoComplete="off" className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm normal-case text-slate-950 outline-none focus:border-orange-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white" placeholder="support@example.com"/>
        </label>
        <label className="mt-3 block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">Пароль приложения
          <input value={formPassword} onChange={(event) => setFormPassword(event.target.value)} type="password" autoComplete="new-password" className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm normal-case text-slate-950 outline-none focus:border-orange-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white" placeholder={editingId ? "Оставьте пустым, чтобы не менять" : "Пароль приложения"}/>
        </label>
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">Главная</span>
          <Switch checked={formPrimary} onCheckedChange={setFormPrimary} className="data-checked:bg-orange-600" />
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">2ФА</span>
          <Switch checked={formAuth} onCheckedChange={setFormAuth} className="data-checked:bg-orange-600" />
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-slate-500">Главной и 2ФА может быть только по одной почте. Главная — футер, документы и форма. 2ФА — письма регистрации и рассылки.</p>
        <AdminSelect label="Провайдер" value={formProvider} options={SUPPORT_MAIL_PROVIDERS.map((provider) => ({ value: provider.id, label: provider.label }))} emptyLabel="Выберите провайдера" onChange={(value) => setFormProvider(value as typeof SUPPORT_MAIL_PROVIDERS[number]["id"])} clearable={false} className="mt-3 w-full" />
        {formError ? <p className="mt-3 text-xs text-red-600 dark:text-red-300">{formError}</p> : null}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={() => setFormOpen(false)} className="inline-flex h-10 items-center rounded-xl border border-slate-300 px-4 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-300">Отмена</button>
          <button type="button" onClick={() => void saveMailbox()} disabled={savingMailbox} className="inline-flex h-10 items-center gap-2 rounded-xl bg-orange-600 px-4 text-xs font-semibold text-white disabled:opacity-50">{savingMailbox ? <Loader2 className="size-4 animate-spin"/> : null}Сохранить</button>
        </div>
      </section>
    </div> : null}

    {deleteMailbox ? <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/30 p-4 backdrop-blur-sm dark:bg-slate-950/75" role="dialog" aria-modal="true" aria-label="Удалить почту" onMouseDown={(event) => { if (event.target === event.currentTarget) setDeleteId(null); }}>
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-5 text-slate-950 shadow-2xl dark:border-slate-700 dark:bg-[#0b1626] dark:text-slate-100">
        <h2 className="text-lg font-semibold">Удалить почту?</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Удалить {deleteMailbox.email}? После удаления письма с этой почты больше не будут попадать в общую папку обращений.</p>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={() => setDeleteId(null)} className="inline-flex h-10 items-center rounded-xl border border-slate-300 px-4 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-300">Отмена</button>
          <button type="button" onClick={() => void removeMailbox()} disabled={mailboxBusy === deleteMailbox.id} className="inline-flex h-10 items-center gap-2 rounded-xl bg-red-600 px-4 text-xs font-semibold text-white disabled:opacity-50">{mailboxBusy === deleteMailbox.id ? <Loader2 className="size-4 animate-spin"/> : <Trash2 className="size-4"/>}Удалить</button>
        </div>
      </section>
    </div> : null}
  </>;
}
