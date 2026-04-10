import { html, LitElement } from "lit";
import { customElement } from "lit/decorators.js";
import { captureFooterNavClicked } from "../analytics/posthog.js";
import {
  handleInternalNav,
  hrefForContributors,
  hrefForHome,
  hrefForImprint,
  hrefForPrivacy,
} from "../utils/router.js";

@customElement("ot-footer")
export class OtFooter extends LitElement {
  createRenderRoot() {
    return this;
  }

  private onFooterClick(target: "home" | "contributors" | "privacy" | "imprint", e: MouseEvent) {
    captureFooterNavClicked(target);
    handleInternalNav(e);
  }

  render() {
    return html`
      <footer class="site-footer">
        <nav class="site-footer-nav" aria-label="Site">
          <a class="site-footer-link" href=${hrefForHome()} @click=${(e: MouseEvent) => this.onFooterClick("home", e)}
            >unpopular opinions</a
          >
          <span class="site-footer-sep" aria-hidden="true">·</span>
          <a
            class="site-footer-link"
            href=${hrefForContributors()}
            @click=${(e: MouseEvent) => this.onFooterClick("contributors", e)}
            >contributors</a
          >
          <span class="site-footer-sep" aria-hidden="true">·</span>
          <a class="site-footer-link" href=${hrefForPrivacy()} @click=${(e: MouseEvent) => this.onFooterClick("privacy", e)}
            >privacy</a
          >
          <span class="site-footer-sep" aria-hidden="true">·</span>
          <a class="site-footer-link" href=${hrefForImprint()} @click=${(e: MouseEvent) => this.onFooterClick("imprint", e)}
            >imprint</a
          >
        </nav>
      </footer>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ot-footer": OtFooter;
  }
}
