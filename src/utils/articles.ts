export interface ArticleMeta {
  date?: string;
  author?: string;
  /** Explicit contributor id (`> author-id: cs`); overrides guessing from `author`. */
  authorId?: string;
  aiAssisted?: string;
}

export interface ArticleEntry {
  slug: string;
  title: string;
  /** First `##` under the title, or legacy: first `>` line under `#`. */
  catchline: string | undefined;
  /** Parsed `> key: value` lines at the top of the file. */
  meta: ArticleMeta;
  raw: string;
  /** Markdown for rendering (metadata block removed). */
  bodyMarkdown: string;
}

let cache: ArticleEntry[] | null = null;

/** Leading consecutive `> key: value` lines (OpenTentacle front matter). */
function parseMetadataBlock(markdown: string): { meta: ArticleMeta; rest: string } {
  const lines = markdown.split(/\r?\n/);
  let i = 0;
  const meta: ArticleMeta = {};
  while (i < lines.length) {
    const m = lines[i]?.match(/^\s*>\s*([^:]+):\s*(.*)$/);
    if (!m) break;
    const key = m[1]?.trim().toLowerCase().replace(/\s+/g, "-") ?? "";
    const val = m[2]?.trim() ?? "";
    if (key === "date") meta.date = val;
    else if (key === "author") meta.author = val;
    else if (key === "author-id") meta.authorId = val;
    else if (key === "ai-assisted") meta.aiAssisted = val;
    i++;
  }
  const rest = lines.slice(i).join("\n").replace(/^\s+/, "");
  return { meta, rest };
}

/** Markdown without the metadata block (starts at `#` or body). */
function stripMetadataBlock(markdown: string): string {
  return parseMetadataBlock(markdown).rest;
}

function extractTitle(markdown: string, slug: string): string {
  const m = markdown.match(/^#\s+(.+)$/m);
  if (m?.[1]) return m[1].trim();
  return slug.replace(/-/g, " ");
}

function extractCatchline(markdown: string): string | undefined {
  const heading = markdown.match(/^#\s+.+$/m);
  if (!heading || heading.index === undefined) return undefined;
  const afterHeading = markdown.slice(heading.index + heading[0].length);
  const afterWhitespace = afterHeading.replace(/^\s+/, "");
  const h2 = afterWhitespace.match(/^##\s+(.+)$/m);
  if (h2?.[1]) return h2[1].trim();
  const line = afterWhitespace.match(/^>\s*(.+)$/m);
  const text = line?.[1]?.trim();
  return text || undefined;
}

export function getArticles(): ArticleEntry[] {
  if (cache) return cache;

  const modules = import.meta.glob("../assets/articles/*.md", {
    eager: true,
    query: "?raw",
    import: "default",
  }) as Record<string, string>;

  const entries: ArticleEntry[] = [];
  for (const path of Object.keys(modules)) {
    const match = path.match(/\/([^/]+)\.md$/);
    if (!match?.[1]) continue;
    const slug = match[1];
    const raw = modules[path];
    if (typeof raw !== "string") continue;
    const { meta } = parseMetadataBlock(raw);
    const bodyMarkdown = stripMetadataBlock(raw);
    entries.push({
      slug,
      title: extractTitle(raw, slug),
      catchline: extractCatchline(raw),
      meta,
      raw,
      bodyMarkdown,
    });
  }
  entries.sort((a, b) => {
    const diff = publishedTimestamp(b.meta.date) - publishedTimestamp(a.meta.date);
    if (diff !== 0) return diff;
    return a.slug.localeCompare(b.slug);
  });
  cache = entries;
  return entries;
}

/** For sorting: ISO-ish dates parse to ms; missing/invalid → 0 (sort last when newest-first). */
function publishedTimestamp(dateStr: string | undefined): number {
  if (!dateStr) return 0;
  const t = Date.parse(dateStr.trim());
  return Number.isNaN(t) ? 0 : t;
}

export function getArticleBySlug(slug: string): ArticleEntry | undefined {
  return getArticles().find((a) => a.slug === slug);
}
