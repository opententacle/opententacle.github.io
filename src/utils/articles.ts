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
  /** Source directory for relative markdown links/images. */
  sourceDir: string;
}

let cache: ArticleEntry[] | null = null;
let cacheBySlug: Map<string, ArticleEntry> | null = null;

const NON_MD_ASSET_MODULES = import.meta.glob(
  "../assets/articles/**/*.{png,jpg,jpeg,gif,webp,avif,svg,bmp,ico,pdf,mp4,webm,ogg,mp3,wav,m4a,txt,csv,json,xml,zip}",
  {
    eager: true,
    import: "default",
  },
) as Record<string, string>;

const ARTICLE_ASSET_URLS = new Map<string, string>();
for (const [path, value] of Object.entries(NON_MD_ASSET_MODULES)) {
  if (typeof value !== "string") continue;
  ARTICLE_ASSET_URLS.set(normalizePath(path), value);
}

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

function normalizePath(path: string): string {
  return path
    .replace(/\\/g, "/")
    .replace(/\/+/g, "/")
    .replace(/\/\.\//g, "/");
}

function normalizeRelativePath(path: string): string {
  const input = normalizePath(path);
  const out: string[] = [];
  for (const part of input.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") {
      if (out.length > 0) out.pop();
      continue;
    }
    out.push(part);
  }
  return out.join("/");
}

function resolvePathFromDir(sourceDir: string, relativeRef: string): string {
  const base = normalizePath(sourceDir).split("/").filter(Boolean);
  const ref = normalizePath(relativeRef).split("/").filter(Boolean);
  const out = [...base];
  for (const part of ref) {
    if (part === ".") continue;
    if (part === "..") {
      if (out.length > 0) out.pop();
      continue;
    }
    out.push(part);
  }
  return out.join("/");
}

function deriveSlugFromPath(path: string): string | undefined {
  const normalized = normalizePath(path);
  const match = normalized.match(/\/([^/]+)\.md$/i);
  if (!match?.[1]) return undefined;
  const basename = match[1];
  if (basename.toLowerCase() !== "index") return basename;
  const parts = normalized.split("/").filter(Boolean);
  if (parts.length < 2) return undefined;
  return parts[parts.length - 2];
}

export function getArticles(): ArticleEntry[] {
  if (cache) return cache;

  const modules = import.meta.glob("../assets/articles/**/*.md", {
    eager: true,
    query: "?raw",
    import: "default",
  }) as Record<string, string>;

  const entries: ArticleEntry[] = [];
  const usedSlugs = new Set<string>();
  for (const path of Object.keys(modules)) {
    const slug = deriveSlugFromPath(path);
    if (!slug) continue;
    if (usedSlugs.has(slug)) {
      console.warn(`[articles] Duplicate article slug "${slug}" from "${path}". Skipping.`);
      continue;
    }
    usedSlugs.add(slug);
    const raw = modules[path];
    if (typeof raw !== "string") continue;
    const { meta } = parseMetadataBlock(raw);
    const bodyMarkdown = stripMetadataBlock(raw);
    const sourceDir = normalizePath(path.replace(/\/[^/]+$/, ""));
    entries.push({
      slug,
      title: extractTitle(raw, slug),
      catchline: extractCatchline(raw),
      meta,
      raw,
      bodyMarkdown,
      sourceDir,
    });
  }
  entries.sort((a, b) => {
    const diff = publishedTimestamp(b.meta.date) - publishedTimestamp(a.meta.date);
    if (diff !== 0) return diff;
    return a.slug.localeCompare(b.slug);
  });
  cache = entries;
  cacheBySlug = new Map(entries.map((entry) => [entry.slug, entry]));
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

function isExternalReference(ref: string): boolean {
  return /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(ref) || ref.startsWith("//");
}

export function resolveArticleAssetUrl(slug: string, ref: string): string {
  const trimmed = ref.trim();
  if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("/")) return ref;
  if (trimmed.startsWith("data:") || isExternalReference(trimmed)) return ref;

  const [pathPart, hashPart = ""] = trimmed.split("#", 2);
  const [cleanPathPart, queryPart = ""] = pathPart.split("?", 2);
  if (!cleanPathPart) return ref;

  const article = (cacheBySlug ?? new Map()).get(slug) ?? getArticleBySlug(slug);
  if (!article) return ref;

  const resolvedPath = resolvePathFromDir(article.sourceDir, cleanPathPart);
  const url = ARTICLE_ASSET_URLS.get(normalizeRelativePath(resolvedPath));
  if (!url) return ref;

  const query = queryPart ? `?${queryPart}` : "";
  const hash = hashPart ? `#${hashPart}` : "";
  return `${url}${query}${hash}`;
}
