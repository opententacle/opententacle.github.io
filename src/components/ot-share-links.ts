import { html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { captureShareIntentClicked, captureShareLinkCopied } from "../analytics/posthog.js";
import { hrefForArticle } from "../utils/router.js";
import { SHARE_PLATFORMS, type SharePlatform } from "../utils/share-platforms.js";

@customElement("ot-share-links")
export class OtShareLinks extends LitElement {
  @property({ type: String }) slug = "";
  @property({ type: String }) title = "";
  @state() private copied = false;

  createRenderRoot() {
    return this;
  }

  private articleUrlWithRef(source: SharePlatform | "copy"): string {
    const base = new URL(hrefForArticle(this.slug), window.location.origin);
    base.searchParams.set("utm_source", source);
    base.searchParams.set("utm_medium", "social");
    base.searchParams.set("utm_campaign", "article_share");
    base.searchParams.set("ref", `share_${source}`);
    return base.toString();
  }

  private canonicalArticleUrl(): string {
    return new URL(hrefForArticle(this.slug), window.location.origin).toString();
  }

  private shareUrl(platform: SharePlatform): string {
    const article = this.articleUrlWithRef(platform);
    const text = encodeURIComponent(this.title);
    const encodedArticle = encodeURIComponent(article);
    if (platform === "x") return `https://x.com/intent/tweet?text=${text}&url=${encodedArticle}`;
    if (platform === "linkedin") return `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(`${this.title} ${article}`)}`;
    if (platform === "reddit") return `https://www.reddit.com/submit?url=${encodedArticle}&title=${text}`;
    if (platform === "hackernews") return `https://news.ycombinator.com/submitlink?u=${encodedArticle}&t=${text}`;
    if (platform === "facebook") {
      const canonical = encodeURIComponent(this.canonicalArticleUrl());
      return `https://www.facebook.com/sharer.php?u=${canonical}`;
    }
    if (platform === "whatsapp") return `https://wa.me/?text=${encodeURIComponent(`${this.title} ${article}`)}`;
    if (platform === "telegram") return `https://t.me/share/url?url=${encodedArticle}&text=${text}`;
    if (platform === "mastodon") return `https://mastodon.social/share?text=${encodeURIComponent(`${this.title} ${article}`)}`;
    if (platform === "bluesky") return `https://bsky.app/intent/compose?text=${encodeURIComponent(`${this.title} ${article}`)}`;
    return `https://www.threads.net/intent/post?text=${encodeURIComponent(`${this.title} ${article}`)}`;
  }

  private onShareClick(platform: SharePlatform) {
    captureShareIntentClicked(platform, this.slug);
  }

  private async onCopyClick() {
    const link = this.articleUrlWithRef("copy");
    try {
      await navigator.clipboard.writeText(link);
      this.copied = true;
      captureShareLinkCopied(this.slug);
      window.setTimeout(() => {
        this.copied = false;
      }, 1500);
    } catch {
      this.copied = false;
    }
  }

  render() {
    if (!this.slug) return "";
    return html`
      <section class="share-links" aria-label="Share this article">
        ${SHARE_PLATFORMS.map(
          (platform) => html`
            <a
              class="share-links-item"
              href=${this.shareUrl(platform.id)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label=${platform.label}
              title=${platform.label}
              @click=${() => this.onShareClick(platform.id)}
            >
              <i class=${platform.iconClass} aria-hidden="true"></i>
            </a>
          `,
        )}
        <button type="button" class="share-links-copy" @click=${() => this.onCopyClick()}>
          <i class="fa-solid fa-link" aria-hidden="true"></i>
          <span>${this.copied ? "Copied!" : "Copy link"}</span>
        </button>
      </section>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ot-share-links": OtShareLinks;
  }
}
