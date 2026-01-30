export type PubmedRef = { pmid: string; title: string; year: string; url: string };

async function eutils(path: string, params: Record<string, string>) {
  const u = new URL(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/${path}`);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  // IMPORTANT: JSON required for esummary
  u.searchParams.set("retmode", params.retmode || "xml");
  const r = await fetch(u.toString(), { headers: { "user-agent": "autoblogger/1.0" } });
  return await r.text();
}

function pickTerms(seedType: string, hint: string) {
  const h = hint.toLowerCase();
  if (seedType === "tennis") {
    // Keep it robust: PubMed query terms that reliably return results.
    // We still bias terms by hint but avoid overly specific/rare combos.
    if (/(hamstring|햄스트링|하체|cold|추위)/.test(h)) {
      return "tennis warm-up injury prevention";
    }
    if (/(warmup|워밍업)/.test(h)) {
      return "tennis warm-up injury prevention";
    }
    return "tennis warm-up injury prevention";
  }
  if (seedType === "weights") return "resistance training delayed onset muscle soreness warm-up";
  return "musculoskeletal pain self management exercise";
}

function extractBetween(s: string, a: string, b: string) {
  const i = s.indexOf(a);
  if (i < 0) return "";
  const j = s.indexOf(b, i + a.length);
  if (j < 0) return "";
  return s.slice(i + a.length, j);
}

export async function fetchPubmedRefs(params: { seedType: string; topicHint: string; limit?: number }): Promise<PubmedRef[]> {
  const limit = params.limit ?? 3;
  const term = pickTerms(params.seedType, params.topicHint);

  const xml = await eutils("esearch.fcgi", {
    db: "pubmed",
    sort: "relevance",
    retmax: String(limit),
    term,
  });

  const idsRaw = xml.match(/<Id>(\d+)<\/Id>/g) || [];
  const ids = idsRaw.map((x) => extractBetween(x, "<Id>", "</Id>")).filter(Boolean);
  if (ids.length === 0) return [];

  const sum = await eutils("esummary.fcgi", { db: "pubmed", id: ids.join(","), retmode: "json" });
  let j: any;
  try {
    j = JSON.parse(sum);
  } catch {
    // sometimes NCBI returns XML error; fail gracefully
    return [];
  }

  const result = j?.result || {};
  const out: PubmedRef[] = [];
  for (const pmid of ids) {
    const it = result[pmid];
    if (!it) continue;
    const title = String(it.title || "").replace(/\.$/, "");
    const pubdate = String(it.pubdate || "");
    const year = (pubdate.match(/\b(19\d\d|20\d\d)\b/) || [""])[0] || "";
    out.push({ pmid, title, year, url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/` });
  }
  return out;
}

export function formatRefsMarkdown(refs: PubmedRef[]) {
  if (!refs.length) return "";
  const lines = refs.map((r, i) => `${i + 1}) ${r.year ? r.year + "년 " : ""}${r.title} ${r.url}`);
  return `\n\n### 참고문헌(논문)\n${lines.join("\n")}\n`;
}

function tokenize(s: string) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 3);
}

export function verifyRefs(params: { topic: string; refs: PubmedRef[] }) {
  const topicTokens = new Set(tokenize(params.topic));
  const failures: string[] = [];

  for (const r of params.refs) {
    const t = tokenize(r.title);
    const hit = t.some((x) => topicTokens.has(x));
    if (!hit) failures.push(`ref not obviously on-topic: PMID ${r.pmid}`);
  }

  return { ok: failures.length === 0, failures };
}
