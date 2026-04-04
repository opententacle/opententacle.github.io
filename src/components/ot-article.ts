import DOMPurify from "dompurify";
import { html, LitElement, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { marked } from "marked";
import { buildArticleViewMetaItems } from "../utils/article-meta.js";
import { getArticleBySlug } from "../utils/articles.js";
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
    const rawHtml = marked.parse(article.bodyMarkdown, { async: false }) as string;
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

declare global {
  interface HTMLElementTagNameMap {
    "ot-article": OtArticle;
  }
}
