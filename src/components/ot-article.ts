import DOMPurify from "dompurify";
import { html, LitElement, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { marked } from "marked";
import { captureArticleViewed } from "../analytics/posthog.js";
import { resolveContributorForArticle } from "../data/contributors.js";
import "./ot-share-links.js";
import { buildArticleViewMetaItems } from "../utils/article-meta.js";
import { type ArticleEntry, getArticleBySlug, resolveArticleAssetUrl } from "../utils/articles.js";
import { base, handleInternalNav, hrefForArticle, hrefForHome } from "../utils/router.js";

@customElement("ot-article")
export class OtArticle extends LitElement {
  /**
   * Light DOM so global Font Awesome CSS applies (same as ot-app / ot-blog).
   * Shadow roots do not receive document stylesheets.
   */
  createRenderRoot() {
    return this;
  }

  @property({ type: String }) slug = "";

  @state() private sanitizedHtml = "";

  @state() private notFound = false;
  private lastTrackedSlug = "";

  connectedCallback() {
    super.connectedCallback();
    this.renderArticle();
  }

  protected updated(changed: PropertyValues) {
    super.updated(changed);
    if (changed.has("slug")) {
      this.renderArticle();
    }
  }

  private renderArticle() {
    if (!this.slug) {
      this.notFound = true;
      this.sanitizedHtml = "";
      return;
    }
    const article = getArticleBySlug(this.slug);
    if (!article) {
      this.notFound = true;
      this.sanitizedHtml = "";
      return;
    }
    this.notFound = false;
    const referenceIndexByHref = new Map<string, number>();
    const references: Array<{ href: string; label: string }> = [];
    const renderer = new marked.Renderer();
    renderer.link = function ({ href, title, tokens }) {
      const text = this.parser.parseInline(tokens);
      const safeHref = cleanHref(resolveArticleAssetUrl(article.slug, href ?? ""));
      if (!safeHref) return text;
      const refNumber = getReferenceNumber(safeHref, stripHtml(text), referenceIndexByHref, references);
      const titleAttr = title ? ` title="${escapeHtml(title)}"` : "";
      const marker = `<sup class="article-ref-marker"><a href="#article-ref-${refNumber}">[${refNumber}]</a></sup>`;
      return `<a href="${escapeHtml(safeHref)}"${titleAttr}>${text}</a>${marker}`;
    };
    renderer.image = ({ href, title, text }) => {
      const safeSrc = cleanHref(resolveArticleAssetUrl(article.slug, href ?? ""));
      if (!safeSrc) return "";
      const titleAttr = title ? ` title="${escapeHtml(title)}"` : "";
      return `<img src="${escapeHtml(safeSrc)}" alt="${escapeHtml(text)}"${titleAttr}>`;
    };
    const markdownWithImageAttrs = transformAttributedImages(article.bodyMarkdown, article.slug);
    const bodyHtml = marked.parse(markdownWithImageAttrs, { async: false, renderer }) as string;
    const referencesHtml = buildReferencesHtml(references);
    this.sanitizedHtml = DOMPurify.sanitize(`${bodyHtml}${referencesHtml}`);
    if (this.lastTrackedSlug !== article.slug) {
      captureArticleViewed({
        slug: article.slug,
        title: article.title,
        hasAuthorProfile: Boolean(resolveContributorForArticle(article.meta)),
      });
      this.lastTrackedSlug = article.slug;
    }
  }

  private renderMissingArticle() {
    return html`
      <section class="wrap">
        <a class="back" href=${hrefForHome()} @click=${handleInternalNav}><i class="fa-solid fa-arrow-left"></i> Unpopular Opinions</a>
        <p class="missing">No article found for <code>${this.slug}</code>.</p>
      </section>
    `;
  }

  render() {
    if (this.notFound) {
      return this.renderMissingArticle();
    }
    const article = getArticleBySlug(this.slug);
    if (!article) {
      return this.renderMissingArticle();
    }
    const metaItems = buildArticleViewMetaItems(article.meta);
    const metaRow = metaItems.length > 0 ? html`<div class="meta article-meta">${metaItems}</div>` : "";
    const noAiSupport = isExplicitlyNotAiAssisted(article.meta.aiAssisted);
    const jsonLd = buildArticleJsonLd(article);
    return html`
      <section class="wrap">
        <a class="back" href=${hrefForHome()} @click=${handleInternalNav}><i class="fa-solid fa-arrow-left"></i> Unpopular Opinions</a>
        ${metaRow}
        ${
          noAiSupport
            ? html`
          <p class="quality-disclaimer" role="note" aria-label="Writing quality note">
            This article was written <b>without</b> support of LLMs or <i>"AI"</i>
          </p>
        `
            : ""
        }
        <ot-share-links .slug=${article.slug} .title=${article.title}></ot-share-links>
        <script type="application/ld+json">
          ${jsonLd}
        </script>
        <article class="prose">${unsafeHTML(this.sanitizedHtml)}</article>
      </section>
    `;
  }
}

function buildArticleJsonLd(article: ArticleEntry): string {
  const canonical = new URL(hrefForArticle(article.slug), window.location.origin).toString();
  const image = new URL(`${base}opententacle.png`, window.location.origin).toString();
  const authorName = resolveContributorForArticle(article.meta)?.name ?? article.meta.author?.trim();
  const payload: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: article.title,
    description: article.catchline ?? article.title,
    mainEntityOfPage: canonical,
    url: canonical,
    image,
    publisher: {
      "@type": "Organization",
      name: "OpenTentacle",
      url: new URL(base, window.location.origin).toString(),
    },
  };
  if (article.meta.date?.trim()) payload.datePublished = article.meta.date.trim();
  if (authorName) payload.author = { "@type": "Person", name: authorName };
  return JSON.stringify(payload);
}

function isExplicitlyNotAiAssisted(value: string | undefined): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return ["no", "false", "0", "none", "n"].includes(normalized);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function cleanHref(value: string): string {
  const href = value.trim();
  if (!href) return "";
  if (/^javascript:/i.test(href)) return "";
  return href;
}

function getReferenceNumber(
  href: string,
  label: string,
  indexByHref: Map<string, number>,
  refs: Array<{ href: string; label: string }>,
): number {
  const existing = indexByHref.get(href);
  if (existing !== undefined) {
    const entry = refs[existing - 1];
    if (entry && !entry.label && label) entry.label = label;
    return existing;
  }
  const next = refs.length + 1;
  indexByHref.set(href, next);
  refs.push({ href, label });
  return next;
}

function buildReferencesHtml(refs: Array<{ href: string; label: string }>): string {
  if (refs.length === 0) return "";
  const items = refs
    .map((ref, idx) => {
      const n = idx + 1;
      const label = ref.label?.trim() ? ref.label.trim() : ref.href;
      return `<li id="article-ref-${n}">
        <div class="article-ref-main">
          <span class="article-ref-index">[${n}]</span>
          <span class="article-ref-label">${escapeHtml(label)}</span>
        </div>
        <div class="article-ref-linkline">
          <a href="${escapeHtml(ref.href)}">${escapeHtml(ref.href)}</a>
        </div>
      </li>`;
    })
    .join("");
  return `<hr><section class="article-references"><h2>References</h2><ol>${items}</ol></section>`;
}

function stripHtml(input: string): string {
  return input
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function transformAttributedImages(markdown: string, slug: string): string {
  const imageWithAttrs = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)\{([^}]+)\}/g;
  return markdown.replace(
    imageWithAttrs,
    (_m, alt: string, rawSrc: string, title: string | undefined, rawAttrs: string) => {
      const src = cleanHref(resolveArticleAssetUrl(slug, rawSrc));
      if (!src) return "";

      const attrs = parseImageAttrs(rawAttrs);
      const widthAttr = attrs.width ? ` width="${escapeHtml(attrs.width)}"` : "";
      const heightAttr = attrs.height ? ` height="${escapeHtml(attrs.height)}"` : "";
      const classAttr = attrs.className ? ` class="${escapeHtml(attrs.className)}"` : "";
      const titleAttr = title ? ` title="${escapeHtml(title)}"` : "";
      return `<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}"${titleAttr}${widthAttr}${heightAttr}${classAttr}>`;
    },
  );
}

function parseImageAttrs(raw: string): { width?: string; height?: string; className?: string } {
  const out: { width?: string; height?: string; className?: string } = {};
  const parts = raw.trim().split(/\s+/);
  for (const part of parts) {
    const match = part.match(/^([a-zA-Z-]+)=(.+)$/);
    if (!match) continue;
    const key = match[1].toLowerCase();
    const value = match[2].replace(/^["']|["']$/g, "").trim();
    if (!value) continue;
    if (key === "width" && isValidDimension(value)) out.width = value;
    else if (key === "height" && isValidDimension(value)) out.height = value;
    else if (key === "class" && isValidClassName(value)) out.className = value;
  }
  return out;
}

function isValidDimension(value: string): boolean {
  return /^\d+(?:px|%)?$/.test(value);
}

function isValidClassName(value: string): boolean {
  return /^[a-zA-Z0-9_-]+(?:\s+[a-zA-Z0-9_-]+)*$/.test(value);
}

declare global {
  interface HTMLElementTagNameMap {
    "ot-article": OtArticle;
  }
}
