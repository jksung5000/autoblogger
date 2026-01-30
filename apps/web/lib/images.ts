import fs from "fs/promises";
import path from "path";
import { artifactDir } from "./artifactFiles";

export type ImagePlaceholder = {
  query: string;
  alt: string;
  caption: string;
  slot: string;
};

const PH_RE = /^\[IMAGE:\s*([^\]]+)\]$/gm;

function parseAttrs(s: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /(\w+)="([^"]*)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) out[m[1]] = m[2];
  return out;
}

export function extractPlaceholders(md: string): ImagePlaceholder[] {
  const out: ImagePlaceholder[] = [];
  let m: RegExpExecArray | null;
  while ((m = PH_RE.exec(md))) {
    const attrs = parseAttrs(m[1]);
    if (!attrs.query) continue;
    out.push({
      query: attrs.query,
      alt: attrs.alt || "",
      caption: attrs.caption || "",
      slot: attrs.slot || "misc",
    });
  }
  return out;
}

export function hasAnyPlaceholder(md: string) {
  return /^\[IMAGE:\s*[^\]]+\]$/m.test(md);
}

export function ensurePlaceholders(md: string, placeholders: ImagePlaceholder[]) {
  if (hasAnyPlaceholder(md) || placeholders.length === 0) return md;

  const lines = md.split(/\r?\n/);
  const h1 = lines.findIndex((l) => l.startsWith("# "));
  const insertAt = h1 >= 0 ? h1 + 2 : 0;
  const phLines = placeholders.map(
    (p) => `[IMAGE: query="${p.query}" alt="${p.alt}" caption="${p.caption}" slot="${p.slot}"]`
  );
  lines.splice(insertAt, 0, ...phLines, "");
  return lines.join("\n");
}

// Wikimedia Commons search + download (simple MVP)
async function commonsSearch(query: string) {
  const url =
    "https://commons.wikimedia.org/w/api.php?origin=*&format=json&action=query&list=search" +
    `&srnamespace=6&srsearch=${encodeURIComponent(query)}&srlimit=5`;
  const r = await fetch(url);
  const j = (await r.json()) as any;
  const title = j?.query?.search?.[0]?.title;
  return title as string | null;
}

async function commonsImageInfo(title: string) {
  const url =
    "https://commons.wikimedia.org/w/api.php?origin=*&format=json&action=query&prop=imageinfo&iiprop=url|extmetadata" +
    `&titles=${encodeURIComponent(title)}`;
  const r = await fetch(url);
  const j = (await r.json()) as any;
  const pages = j?.query?.pages || {};
  const first = Object.values(pages)[0] as any;
  const ii = first?.imageinfo?.[0];
  if (!ii?.url) return null;
  const meta = ii.extmetadata || {};
  const license = meta.LicenseShortName?.value || meta.License?.value || "";
  const artist = meta.Artist?.value || "";
  const credit = meta.Credit?.value || "";
  const attributionUrl = meta.AttributionURL?.value || first?.canonicalurl || "";
  return { url: ii.url as string, license: String(license), artist: String(artist), credit: String(credit), attributionUrl: String(attributionUrl) };
}

function extFromUrl(url: string) {
  const u = new URL(url);
  const base = path.basename(u.pathname);
  const m = base.match(/\.(jpg|jpeg|png|webp)$/i);
  return m ? m[1].toLowerCase() : "jpg";
}

export async function fetchImagesForDraft(params: { baseId: string; draftMd: string }) {
  const placeholders = extractPlaceholders(params.draftMd);
  if (placeholders.length === 0) return { downloaded: [], creditsMd: "" };

  const outDir = path.join(artifactDir(params.baseId), "images");
  await fs.mkdir(outDir, { recursive: true });

  const credits: string[] = [];
  const downloaded: Array<{ file: string; url: string; license: string }> = [];

  for (let i = 0; i < placeholders.length; i++) {
    const ph = placeholders[i];
    const title = await commonsSearch(ph.query);
    if (!title) continue;
    const info = await commonsImageInfo(title);
    if (!info) continue;

    const ext = extFromUrl(info.url);
    const filename = `img_${String(i + 1).padStart(2, "0")}.${ext}`;
    const filePath = path.join(outDir, filename);

    const imgRes = await fetch(info.url);
    const buf = Buffer.from(await imgRes.arrayBuffer());
    await fs.writeFile(filePath, buf);

    downloaded.push({ file: `images/${filename}`, url: info.url, license: info.license || "" });

    credits.push(
      `## ${filename}\n- Source: ${info.attributionUrl || title}\n- License: ${info.license || ""}\n- Author/Artist: ${info.artist || ""}\n- Retrieved: ${new Date().toISOString()}\n`
    );
  }

  const creditsMd = credits.length ? `# CREDITS\n\n${credits.join("\n")}` : "";
  if (creditsMd) {
    await fs.writeFile(path.join(outDir, "CREDITS.md"), creditsMd, "utf-8");
  }

  return { downloaded, creditsMd };
}

export function injectImages(md: string, downloaded: Array<{ file: string; license: string }>) {
  if (downloaded.length === 0) return md;

  let idx = 0;
  const replaced = md.replace(PH_RE, () => {
    const d = downloaded[idx++];
    if (!d) return "";
    const credit = d.license ? `출처: Wikimedia Commons · ${d.license}` : "출처: Wikimedia Commons";
    return `![](${d.file})\n\n<div style="text-align:right;font-size:12px;color:#6b7280;margin-top:4px">${credit}</div>`;
  });

  return replaced;
}
