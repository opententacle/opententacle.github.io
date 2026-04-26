import { html, LitElement } from "lit";
import { customElement } from "lit/decorators.js";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { buildBlogMetaItems } from "../utils/article-meta.js";
import { getArticles } from "../utils/articles.js";
import { base, handleInternalNav, hrefForArticle } from "../utils/router.js";

@customElement("ot-blog")
export class OtBlog extends LitElement {
  /**
   * Light DOM so `@fortawesome/fontawesome-free` classes apply (same as ot-app).
   */
  createRenderRoot() {
    return this;
  }

  render() {
    const articles = getArticles();
    const websiteJsonLd = buildWebsiteJsonLd();
    return html`
      <section class="wrap">
        <h1 class="title">Unpopular Opinions</h1>
        ${unsafeHTML(`<script type="application/ld+json">${websiteJsonLd}</script>`)}
        ${
          articles.length === 0
            ? html`<p class="empty">No articles yet</p>`
            : html`
          <ul class="list">
            ${articles.map((a) => {
              const sub = a.catchline ? html`<span class="catchline">${a.catchline}</span>` : "";
              const metaItems = buildBlogMetaItems(a.meta);
              const metaRow = metaItems.length > 0 ? html`<div class="meta">${metaItems}</div>` : "";
              return html`
              <li>
                <a
                  class="article-card"
                  href=${hrefForArticle(a.slug)}
                  @click=${handleInternalNav}
                >
                  <span class="article-card-title">${a.title}</span>
                  ${sub}
                  ${metaRow}
                </a>
              </li>
            `;
            })}
          </ul>
        `
        }
      </section>
    `;
  }
}

function buildWebsiteJsonLd(): string {
  const url = new URL(base, window.location.origin).toString();
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "OpenTentacle",
    url,
  });
}

declare global {
  interface HTMLElementTagNameMap {
    "ot-blog": OtBlog;
  }
}
