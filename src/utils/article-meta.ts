import { html, type TemplateResult } from "lit";
import { resolveContributorForArticle } from "../data/contributors.js";
import type { ArticleMeta } from "./articles.js";
import { handleInternalNav, hrefForContributorProfile } from "./router.js";

type MetaRowConfig = {
  key: keyof ArticleMeta;
  iconClass: string;
  title: string;
  format?: (value: string) => string;
};

const ARTICLE_META_ROWS: MetaRowConfig[] = [
  { key: "date", iconClass: "fa-solid fa-fw fa-calendar-days", title: "Date" },
  { key: "author", iconClass: "fa-solid fa-fw fa-user", title: "Author" },
  {
    key: "aiAssisted",
    iconClass: "fa-solid fa-fw fa-robot",
    title: "AI-assisted",
    format: (v) => `AI-assisted: ${v}`,
  },
];

/** Metadata chips for blog list cards (author shows resolved display name, no link). */
export function buildBlogMetaItems(meta: ArticleMeta): TemplateResult[] {
  const items: TemplateResult[] = [];
  for (const row of ARTICLE_META_ROWS) {
    if (row.key === "author") {
      const contributor = resolveContributorForArticle(meta);
      const display = contributor?.name ?? meta.author;
      if (!display?.trim()) continue;
      items.push(html`
        <span class="meta-item" title=${row.title}>
          <i class=${row.iconClass} aria-hidden="true"></i>
          <span>${display}</span>
        </span>
      `);
      continue;
    }
    const raw = meta[row.key];
    if (raw === undefined || raw === "") continue;
    const text = row.format ? row.format(raw) : raw;
    items.push(html`
      <span class="meta-item" title=${row.title}>
        <i class=${row.iconClass} aria-hidden="true"></i>
        <span>${text}</span>
      </span>
    `);
  }
  return items;
}

/** Metadata row for article view; author links to contributors page when a profile matches. */
export function buildArticleViewMetaItems(meta: ArticleMeta): TemplateResult[] {
  const contributor = resolveContributorForArticle(meta);
  const items: TemplateResult[] = [];
  for (const row of ARTICLE_META_ROWS) {
    if (row.key === "author") {
      const display = contributor?.name ?? meta.author;
      if (!display?.trim()) continue;
      items.push(html`
        <span class="meta-item" title=${row.title}>
          <i class=${row.iconClass} aria-hidden="true"></i>
          <span class="meta-item-body">
            ${
              contributor
                ? html`<a
                    class="meta-author-link"
                    href=${hrefForContributorProfile(contributor.id)}
                    @click=${handleInternalNav}
                    >${contributor.name}</a
                  >`
                : html`${display}`
            }
          </span>
        </span>
      `);
      continue;
    }
    const raw = meta[row.key];
    if (raw === undefined || raw === "") continue;
    const text = row.format ? row.format(raw) : raw;
    items.push(html`
      <span class="meta-item" title=${row.title}>
        <i class=${row.iconClass} aria-hidden="true"></i>
        <span>${text}</span>
      </span>
    `);
  }
  return items;
}
