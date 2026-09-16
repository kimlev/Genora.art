export type ActionEmailContent = {
  locale: string;
  preheader: string;
  kicker: string;
  title: string;
  body: string;
  button: string;
  fallback: string;
  footer: string;
  url: string;
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
  })[character]!);
}

export function mailDirection(locale?: string | null): "rtl" | "ltr" {
  return locale === "ar" ? "rtl" : "ltr";
}

export function renderActionEmailHtml(content: ActionEmailContent): string {
  const dir = mailDirection(content.locale);
  const align = dir === "rtl" ? "right" : "left";
  const locale = escapeHtml(content.locale || "en");
  const url = escapeHtml(content.url);
  const preheader = escapeHtml(content.preheader);
  const kicker = escapeHtml(content.kicker);
  const title = escapeHtml(content.title);
  const body = escapeHtml(content.body);
  const button = escapeHtml(content.button);
  const fallback = escapeHtml(content.fallback);
  const footer = escapeHtml(content.footer);

  return `<!DOCTYPE html>
<html lang="${locale}" dir="${dir}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#e8eef6;font-family:Arial,Helvetica,sans-serif;color:#111111;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#e8eef6;margin:0;padding:0;">
    <tr>
      <td align="center" style="padding:28px 12px;">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="width:560px;max-width:100%;">
          <tr>
            <td align="${align}" style="padding:0 8px 16px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td valign="middle" style="padding-${dir === "rtl" ? "left" : "right"}:10px;">
                    <img src="cid:genora-logo" width="32" height="32" alt="Genora.art" style="display:block;border:0;width:32px;height:32px;">
                  </td>
                  <td valign="middle" style="font-size:18px;font-weight:700;letter-spacing:-0.03em;line-height:1;">
                    <span style="color:#111111;">Genora</span><span style="color:#FF6F00;">.art</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background:#ffffff;border:1px solid #d5e0ed;border-radius:20px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="height:4px;background:#FF6F00;border-radius:20px 20px 0 0;font-size:0;line-height:0;">&nbsp;</td>
                </tr>
                <tr>
                  <td align="${align}" style="padding:32px 32px 36px;">
                    <p style="margin:0 0 10px;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#FF6F00;">${kicker}</p>
                    <h1 style="margin:0 0 12px;font-size:26px;line-height:1.25;font-weight:700;color:#111111;">${title}</h1>
                    <p style="margin:0 0 28px;font-size:16px;line-height:1.65;color:#526174;">${body}</p>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td align="center" style="padding:0 0 24px;">
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td align="center" bgcolor="#111111" style="background:#111111;border-radius:12px;">
                                <a href="${url}" style="display:inline-block;padding:14px 26px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:12px;">${button}</a>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td align="${align}" style="padding:0 0 8px;font-size:12px;line-height:1.6;color:#8290a3;">${fallback}</td>
                      </tr>
                      <tr>
                        <td align="${align}" style="font-size:12px;line-height:1.6;word-break:break-all;">
                          <a href="${url}" style="color:#FF6F00;text-decoration:underline;">${url}</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="${align}" style="padding:18px 8px 0;font-size:12px;line-height:1.6;color:#8290a3;">${footer}</td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
