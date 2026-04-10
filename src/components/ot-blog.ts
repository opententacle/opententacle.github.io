import { html, LitElement } from "lit";
import { customElement } from "lit/decorators.js";
import { buildBlogMetaItems } from "../utils/article-meta.js";
import { getArticles } from "../utils/articles.js";
import { handleInternalNav, hrefForArticle } from "../utils/router.js";

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
    return html`
      <section class="wrap">
        <h1 class="title">Unpopular Opinions</h1>
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

declare global {
  interface HTMLElementTagNameMap {
    "ot-blog": OtBlog;
  }
}
