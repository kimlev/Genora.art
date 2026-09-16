import "server-only";

import { getAuthMailCopy } from "@/lib/mail-auth-copy";
import { getMailCopy, supportTopicLabel } from "@/lib/mail-copy";
import { renderActionEmailHtml } from "@/lib/mail-layout";
import { applyPublicContactEmail } from "@/lib/public-contact";
import { getAuthMailboxEmail, getPrimarySupportEmail } from "@/lib/server/support-mailboxes";
import nodemailer from "nodemailer";
import path from "node:path";

function smtpConfig() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  if (!host || !user || !pass) throw new Error("SMTP_NOT_CONFIGURED");
  const port = Number(process.env.SMTP_PORT ?? 465);
  return { host, port, secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : port === 465, auth: { user, pass } };
}

function transport() {
  return nodemailer.createTransport(smtpConfig());
}

async function sender(kind: "auth" | "support" = "auth") {
  const fromEmail = kind === "auth" ? await getAuthMailboxEmail() : await getPrimarySupportEmail();
  const fromName = process.env.SMTP_FROM_NAME ?? (kind === "support" ? "Support Service" : "Genora.art");
  return {
    from: { name: fromName, address: fromEmail },
    replyTo: process.env.SMTP_REPLY_TO ?? fromEmail,
  };
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
  })[character]!);
}

const brandAttachment={filename:"genora-logo.png",path:path.join(process.cwd(),"public","logo-mark.png"),cid:"genora-logo"};
const brandHeader=`<div style="display:flex;align-items:center;gap:10px;margin-bottom:24px"><img src="cid:genora-logo" width="30" height="30" alt="" style="display:block;width:30px;height:30px"><div style="font-size:18px;font-weight:700;letter-spacing:-.02em"><span style="color:#FF6F00">Model</span><span style="color:#111111">Station</span></div></div>`;
const mailShell=(content:string)=>`<div style="background:#f4f7fb;padding:32px 16px;font-family:Arial,sans-serif;color:#111111"><div style="max-width:560px;margin:auto;background:#fff;border:1px solid #dbe4ef;border-radius:18px;padding:32px">${brandHeader}${content}</div></div>`;

export async function verifySmtpConnection(): Promise<void> {
  await transport().verify();
}

export async function sendEmailVerification(email: string, verificationUrl: string, locale?: string | null): Promise<void> {
  const copy = getAuthMailCopy(locale).verification;
  const contact = await getPrimarySupportEmail();
  await transport().sendMail({
    ...await sender("auth"),
    to: email,
    attachments: [brandAttachment],
    subject: copy.subject,
    text: applyPublicContactEmail(copy.text(verificationUrl), contact),
    html: renderActionEmailHtml({ locale: locale ?? "en", url: verificationUrl, ...copy, footer: applyPublicContactEmail(copy.footer, contact) }),
  });
}

export async function sendPasswordReset(email: string, resetUrl: string, locale?: string | null): Promise<void> {
  const copy = getAuthMailCopy(locale).reset;
  const contact = await getPrimarySupportEmail();
  await transport().sendMail({
    ...await sender("auth"),
    to: email,
    attachments: [brandAttachment],
    subject: copy.subject,
    text: applyPublicContactEmail(copy.text(resetUrl), contact),
    html: renderActionEmailHtml({ locale: locale ?? "en", url: resetUrl, ...copy, footer: applyPublicContactEmail(copy.footer, contact) }),
  });
}

export async function sendAdminInvitation(email: string, invitationUrl: string): Promise<void> {
  await transport().sendMail({
    ...await sender("auth"),
    to: email,
    attachments:[brandAttachment],
    subject: "Приглашение в Genora.art Admin",
    text: `Вас пригласили в Genora.art Admin. Задайте пароль по ссылке: ${invitationUrl}\n\nСсылка действует 24 часа.`,
    html: mailShell(`<h1 style="font-size:22px;margin:0">Приглашение в Genora.art Admin</h1><p>Для завершения создания администратора задайте пароль.</p><p><a href="${invitationUrl}" style="display:inline-block;padding:12px 18px;background:#3b82f6;color:white;text-decoration:none;border-radius:10px">Задать пароль</a></p><p style="color:#64748b;font-size:13px">Ссылка действует 24 часа. Если вы не ожидали это письмо, ничего не делайте.</p>`),
  });
}

export async function sendSupportReply(email:string,subject:string,reply:string,locale?:string|null):Promise<void>{
  const copy = getMailCopy(locale);
  const signOff = escapeHtml(copy.supportSignOff).replace(/\n/g, "<br>");
  const safeReply=escapeHtml(reply).replace(/\n/g,"<br>");
  await transport().sendMail({...await sender("support"),to:email,attachments:[brandAttachment],subject,text:`${reply}\n\n${copy.supportSignOff}`,html:mailShell(`<div style="font-size:15px;line-height:1.7;color:#334155">${safeReply}</div><p style="margin-top:28px;font-size:13px;color:#64748b">${signOff}</p>`)});
}

export async function sendSupportReceipt(input: { email: string; publicId: string; topic: string; message: string; locale?: string | null }): Promise<void> {
  const copy = getMailCopy(input.locale);
  const topic = supportTopicLabel(input.topic, input.locale);
  const safeId = escapeHtml(input.publicId);
  const safeTopic = escapeHtml(topic);
  const safeMessage = escapeHtml(input.message).replace(/\n/g, "<br>");
  await transport().sendMail({
    ...await sender("support"),
    to: input.email,
    attachments: [brandAttachment],
    subject: copy.supportReceiptSubject(input.publicId),
    text: copy.supportReceiptText(input.publicId, topic, input.message),
    html: mailShell(`<p style="font-size:13px;font-weight:700;color:#526174">№ ${safeId}</p><h1 style="font-size:24px;margin:8px 0 12px">${escapeHtml(copy.supportReceiptTitle)}</h1><p style="font-size:13px;line-height:1.6;color:#8290a3">${escapeHtml(copy.supportReceiptDoNotReply)}</p><p style="font-size:15px;line-height:1.6;color:#526174">${escapeHtml(copy.supportReceiptTopic)}: <strong style="color:#111111">${safeTopic}</strong></p><div style="margin:20px 0;padding:16px;border-radius:12px;background:#f4f7fb;font-size:14px;line-height:1.65;color:#334155">${safeMessage}</div><p style="font-size:15px;line-height:1.6;color:#111111"><strong>${escapeHtml(copy.supportReceiptWorking)}</strong></p>`),
  });
}
