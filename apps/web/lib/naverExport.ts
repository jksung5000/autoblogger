import { marked } from "marked";

function stripImageAltCaption(html: string) {
  // Remove alt text by replacing alt="..." with alt=""
  html = html.replace(/\salt="[^"]*"/g, ' alt=""');
  // Remove <figcaption>...</figcaption>
  html = html.replace(/<figcaption[\s\S]*?<\/figcaption>/g, "");
  return html;
}

function basicHtmlDoc(body: string, title: string) {
  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Apple SD Gothic Neo,Noto Sans KR,sans-serif;line-height:1.65;color:#111;}
    h1{font-size:28px;margin:0 0 12px;font-weight:800;}
    h2{font-size:20px;margin:22px 0 10px;font-weight:800;}
    h3{font-size:16px;margin:18px 0 8px;font-weight:800;}
    ul,ol{padding-left:22px;}
    blockquote{border-left:3px solid #ddd;padding-left:12px;color:#555;margin:12px 0;}
    hr{margin:18px 0;}
    code{background:#f3f3f3;padding:2px 5px;border-radius:6px;}
    pre{background:#f3f3f3;padding:12px;border-radius:10px;overflow:auto;}
    a{color:inherit;text-decoration:underline;}
  </style>
</head>
<body>
${body}
</body>
</html>`;
}

function escapeHtml(s: string) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;");
}

export function exportNaverFromMarkdown(input: { markdown: string; title: string }) {
  const htmlBody = marked.parse(input.markdown || "") as string;
  const cleaned = stripImageAltCaption(String(htmlBody));

  const credit = `<p style="margin-top:16px;color:#666;font-size:12px">출처: Wikimedia Commons · &lt;License&gt;</p>`;
  const body = cleaned + "\n" + credit;

  const full = basicHtmlDoc(body, input.title);

  // hashtags: naive extract from title words (Korean + english)
  const tags = new Set<string>();
  for (const t of input.title.split(/\s+/)) {
    const x = t.replace(/[\[\]#(){}.,!?]/g, "").trim();
    if (!x) continue;
    if (x.length < 2) continue;
    tags.add(x);
  }
  // add a few defaults
  ["광화문", "종로", "통증의학과", "정형외과"].forEach((t) => tags.add(t));

  const hashtags = Array.from(tags)
    .slice(0, 20)
    .map((t) => (t.startsWith("#") ? t : `#${t}`))
    .join(" ");

  return {
    fullHtml: full,
    bodyHtml: body,
    hashtags,
  };
}
