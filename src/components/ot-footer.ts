import { html, LitElement } from "lit";
import { customElement } from "lit/decorators.js";
import { handleInternalNav, hrefForContributors, hrefForHome } from "../utils/router.js";

@customElement("ot-footer")
export class OtFooter extends LitElement {
  createRenderRoot() {
    return this;
  }

  render() {
    return html`
      <footer class="site-footer">
        <nav class="site-footer-nav" aria-label="Site">
          <a class="site-footer-link" href=${hrefForHome()} @click=${handleInternalNav}>blog</a>
          <span class="site-footer-sep" aria-hidden="true">·</span>
          <a class="site-footer-link" href=${hrefForContributors()} @click=${handleInternalNav}>contributors</a>
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
