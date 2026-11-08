// Transactional email templates. Copy lives in the five-language dictionary
// lib/content/messaging.ts — every string here is looked up by key, so no
// English-only copy is hidden in code. `lang` selects the locale; `{name}`
// placeholders are filled with HTML-escaped values for the HTML part and raw
// values for the text/plain part.

import { env } from "@/lib/env";
import { msg, msgCopy, type MsgKey } from "@/lib/content/messaging";
import type { Lang } from "@/lib/i18n-core";
import type { MailTemplate, RenderedMail } from "./types";

export type TemplateData = {
  email: string;
  /** Verification / reset link. Only used by the "verify" and "reset" mails. */
  link?: string;
  hours?: number;
  /** Ticket fields. Only used by the two ticket mails. */
  subject?: string;
  message?: string;
  id?: string;
  /** License delivery / recovery fields. */
  licenseKey?: string;
  plan?: string;
};

function escapeHtml(v: string): string {
  return v
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Fill `{name}` placeholders without escaping (for text/plain bodies). */
function plain(lang: Lang, key: MsgKey, vars: Record<string, string | number>): string {
  const base = msgCopy(lang)[key];
  return base.replace(/\{(\w+)\}/g, (match, k: string) =>
    Object.prototype.hasOwnProperty.call(vars, k) ? String(vars[k]) : match,
  );
}

export function appName(): string {
  return env.mailFromName().trim() || "marketit";
}

function vars(data: TemplateData): Record<string, string | number> {
  return {
    app: appName(),
    email: data.email,
    link: data.link ?? "",
    hours: data.hours ?? env.mailTokenTtlHours(),
    subject: data.subject ?? "",
    message: data.message ?? "",
    id: data.id ?? "",
    key: data.licenseKey ?? "",
    plan: data.plan ?? "",
  };
}

const SUBJECT_KEYS: Record<MailTemplate, MsgKey> = {
  verify: "mail.subject.verify",
  reset: "mail.subject.reset",
  ticketUser: "mail.subject.ticketUser",
  ticketOperator: "mail.subject.ticketOperator",
  licenseKey: "mail.subject.licenseKey",
};

const HEADING_KEYS: Record<MailTemplate, MsgKey> = {
  verify: "mail.heading.verify",
  reset: "mail.heading.reset",
  ticketUser: "mail.heading.ticketUser",
  ticketOperator: "mail.heading.ticketOperator",
  licenseKey: "mail.heading.licenseKey",
};

const BODY_KEYS: Record<MailTemplate, MsgKey> = {
  verify: "mail.body.verify",
  reset: "mail.body.reset",
  ticketUser: "mail.body.ticketUser",
  ticketOperator: "mail.body.ticketOperator",
  licenseKey: "mail.body.licenseKey",
};

/** Minimal, self-contained HTML layout — no external CSS, safe for clients. */
function layout(opts: {
  heading: string;
  bodyHtml: string;
  actionHtml: string;
  noteHtml: string;
  footerHtml: string;
}): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width" /></head>
<body style="margin:0;padding:24px;background:#f6f7f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111827;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:28px;">
    <h1 style="margin:0 0 16px;font-size:20px;font-weight:600;">${opts.heading}</h1>
    <div style="font-size:14px;line-height:1.6;color:#374151;">${opts.bodyHtml}</div>
    ${opts.actionHtml}
    <p style="margin:24px 0 0;font-size:12px;line-height:1.5;color:#6b7280;">${opts.noteHtml}</p>
    <hr style="margin:20px 0;border:0;border-top:1px solid #e5e7eb;" />
    <p style="margin:0;font-size:11px;color:#9ca3af;">${opts.footerHtml}</p>
  </div>
</body></html>`;
}

/** Render one of the four templates into {subject, html, text}. */
export function renderMail(
  template: MailTemplate,
  lang: Lang,
  data: TemplateData,
): RenderedMail {
  const v = vars(data);
  const subject = plain(lang, SUBJECT_KEYS[template], v);
  const heading = msg(lang, HEADING_KEYS[template], v);
  const body = msg(lang, BODY_KEYS[template], v);
  const noteKey: MsgKey = template === "licenseKey" ? "mail.licenseHint" : "mail.note";
  const note = msg(lang, noteKey, v);
  const footer = msg(lang, "mail.footer", v);
  const hasLink = template === "verify" || template === "reset";

  let bodyHtml = `<p>${body}</p>`;
  let bodyText = plain(lang, BODY_KEYS[template], v);

  if (template === "licenseKey") {
    // The key IS the product. Show it in a copy-friendly block and repeat it
    // in text/plain so readers without an HTML client still get their goods.
    const keyBlock = [
      `<div style="margin:18px 0;padding:14px;border:1px solid #e5e7eb;border-radius:8px;background:#f9fafb;">`,
      `<div style="font-size:12px;color:#6b7280;">${msg(lang, "mail.labelPlan", v)}: ${escapeHtml(data.plan ?? "")}</div>`,
      `<div style="font-size:12px;color:#6b7280;margin-top:4px;">${msg(lang, "mail.labelKey", v)}</div>`,
      `<code style="display:block;margin-top:6px;font-size:12px;word-break:break-all;">${escapeHtml(data.licenseKey ?? "")}</code>`,
      `</div>`,
    ].join("");
    bodyHtml += keyBlock;
    bodyText = [
      bodyText,
      "",
      `${msg(lang, "mail.labelPlan", v)}: ${data.plan ?? ""}`,
      `${msg(lang, "mail.labelKey", v)}: ${data.licenseKey ?? ""}`,
    ].join("\n");
  }

  if (template === "ticketOperator") {
    // A small labelled details block, with every value HTML-escaped.
    const rows: [MsgKey, string][] = [
      ["mail.labelFrom", data.email],
      ["mail.labelSubject", data.subject ?? ""],
      ["mail.labelTicket", data.id ?? ""],
    ];
    const detailsHtml = rows
      .map(
        ([k, value]) =>
          `<div style="margin:4px 0;"><strong>${msg(lang, k, v)}:</strong> ${escapeHtml(value)}</div>`,
      )
      .join("");
    const messageHtml = `<div style="margin:12px 0;"><strong>${msg(lang, "mail.labelMessage", v)}:</strong><div style="white-space:pre-wrap;margin-top:6px;padding:10px;background:#f9fafb;border-radius:8px;">${escapeHtml(data.message ?? "")}</div></div>`;
    bodyHtml = `<p>${body}</p>${detailsHtml}${messageHtml}`;
    bodyText = [
      bodyText,
      `${msg(lang, "mail.labelFrom", v)}: ${data.email}`,
      `${msg(lang, "mail.labelSubject", v)}: ${data.subject ?? ""}`,
      `${msg(lang, "mail.labelTicket", v)}: ${data.id ?? ""}`,
      `${msg(lang, "mail.labelMessage", v)}: ${data.message ?? ""}`,
    ].join("\n");
  }

  const actionHtml = hasLink
    ? `<p style="margin:22px 0;"><a href="${escapeHtml(data.link ?? "")}" style="display:inline-block;padding:11px 18px;background:#111827;color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">${msg(lang, "mail.action", v)}</a></p><p style="font-size:11px;color:#9ca3af;word-break:break-all;">${escapeHtml(data.link ?? "")}</p>`
    : "";
  const actionText = hasLink
    ? `\n\n${msg(lang, "mail.action", v)}: ${data.link ?? ""}`
    : "";

  const html = layout({
    heading,
    bodyHtml,
    actionHtml,
    noteHtml: note,
    footerHtml: footer,
  });

  const text = [
    heading,
    "",
    bodyText,
    actionText,
    "",
    plain(lang, noteKey, v),
    "",
    plain(lang, "mail.footer", v),
  ].join("\n");

  return { subject, html, text };
}

/** Convenience wrapper used by the ticket / auth routes. */
export function buildMail(
  template: MailTemplate,
  lang: Lang,
  data: TemplateData,
): RenderedMail {
  return renderMail(template, lang, data);
}
