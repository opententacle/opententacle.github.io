import "@fortawesome/fontawesome-free/css/all.min.css";
import { html, LitElement } from "lit";
import { customElement, state } from "lit/decorators.js";
import "./components/ot-blog.ts";
import "./components/ot-article.ts";
import "./components/ot-contributors.ts";
import "./components/ot-footer.ts";
import "./components/ot-imprint.ts";
import "./components/ot-modal.ts";
import "./components/ot-privacy.ts";
import { captureOutboundLinkClicked, initAnalytics, trackRouteChange } from "./analytics/posthog.js";
import { APP_NAVIGATE_EVENT, type AppRoute, pathToRoute } from "./utils/router.js";
import { ModalController } from "./utils/modal.js";

initAnalytics();

@customElement("ot-app")
export class OtApp extends LitElement {
  private modal = new ModalController(this);
  private onGlobalClick = (event: MouseEvent) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const link = target.closest("a");
    if (!(link instanceof HTMLAnchorElement)) return;
    if (!link.href) return;
    try {
      captureOutboundLinkClicked(new URL(link.href, window.location.href));
    } catch {
      // Ignore invalid URLs from malformed links.
    }
  };

  @state()
  private route: AppRoute = { kind: "list" };

  /**
   * Light DOM so Font Awesome’s global CSS (webfont + `.fa-*`) applies to children.
   * Styles from the document do not cross shadow roots.
   */
  createRenderRoot() {
    return this;
  }

  connectedCallback() {
    super.connectedCallback();
    this.syncRouteFromPath();
    window.addEventListener("popstate", this.syncRouteFromPath);
    window.addEventListener(APP_NAVIGATE_EVENT, this.syncRouteFromPath);
    document.addEventListener("click", this.onGlobalClick, { capture: true });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener("popstate", this.syncRouteFromPath);
    window.removeEventListener(APP_NAVIGATE_EVENT, this.syncRouteFromPath);
    document.removeEventListener("click", this.onGlobalClick, { capture: true });
  }

  private syncRouteFromPath = () => {
    trackRouteChange(window.location.pathname);
    this.route = pathToRoute(window.location.pathname);
  };

  render() {
    return html`
      ${
        this.modal.isOpen
          ? html`
        <ot-modal
          message=${this.modal.message}
          image=${this.modal.image}
          .closing=${this.modal.isClosing}
          @close=${() => this.modal.close()}>
        </ot-modal>
      `
          : ""
      }
      <div class="app-shell">
        <div class="app-main">
          ${
            this.route.kind === "list"
              ? html`<ot-blog></ot-blog>`
              : this.route.kind === "article"
                ? html`<ot-article .slug=${this.route.slug}></ot-article>`
                : this.route.kind === "contributors"
                  ? html`<ot-contributors></ot-contributors>`
                  : this.route.kind === "privacy"
                    ? html`<ot-privacy></ot-privacy>`
                    : this.route.kind === "imprint"
                      ? html`<ot-imprint></ot-imprint>`
                  : html`<ot-blog></ot-blog>`
          }
        </div>
        <ot-footer></ot-footer>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ot-app": OtApp;
  }
}
