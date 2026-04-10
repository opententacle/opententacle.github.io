import DOMPurify from "dompurify";
import { html, LitElement, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { marked } from "marked";
import { buildArticleViewMetaItems } from "../utils/article-meta.js";
import { getArticleBySlug, resolveArticleAssetUrl } from "../utils/articles.js";
import { handleInternalNav, hrefForHome } from "../utils/router.js";

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
    const renderer = new marked.Renderer();
    renderer.link = function ({ href, title, tokens }) {
      const text = this.parser.parseInline(tokens);
      const safeHref = cleanHref(resolveArticleAssetUrl(article.slug, href ?? ""));
      if (!safeHref) return text;
      const titleAttr = title ? ` title="${escapeHtml(title)}"` : "";
      return `<a href="${escapeHtml(safeHref)}"${titleAttr}>${text}</a>`;
    };
    renderer.image = ({ href, title, text }) => {
      const safeSrc = cleanHref(resolveArticleAssetUrl(article.slug, href ?? ""));
      if (!safeSrc) return "";
      const titleAttr = title ? ` title="${escapeHtml(title)}"` : "";
      return `<img src="${escapeHtml(safeSrc)}" alt="${escapeHtml(text)}"${titleAttr}>`;
    };
    const rawHtml = marked.parse(article.bodyMarkdown, { async: false, renderer }) as string;
    this.sanitizedHtml = DOMPurify.sanitize(rawHtml);
  }

  render() {
    if (this.notFound) {
      return html`
        <section class="wrap">
          <a class="back" href=${hrefForHome()} @click=${handleInternalNav}><i class="fa-solid fa-arrow-left"></i> blog</a>
          <p class="missing">No article found for <code>${this.slug}</code>.</p>
        </section>
      `;
    }
    const article = getArticleBySlug(this.slug);
    if (!article) {
      return html`
        <section class="wrap">
          <a class="back" href=${hrefForHome()} @click=${handleInternalNav}><i class="fa-solid fa-arrow-left"></i> blog</a>
          <p class="missing">No article found for <code>${this.slug}</code>.</p>
        </section>
      `;
    }
    const metaItems = buildArticleViewMetaItems(article.meta);
    const metaRow = metaItems.length > 0 ? html`<div class="meta article-meta">${metaItems}</div>` : "";
    return html`
      <section class="wrap">
        <a class="back" href=${hrefForHome()} @click=${handleInternalNav}><i class="fa-solid fa-arrow-left"></i> blog</a>
        ${metaRow}
        <article class="prose">${unsafeHTML(this.sanitizedHtml)}</article>
      </section>
    `;
  }
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

declare global {
  interface HTMLElementTagNameMap {
    "ot-article": OtArticle;
  }
}
