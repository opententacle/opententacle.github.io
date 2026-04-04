import "@fortawesome/fontawesome-free/css/all.min.css";
import { html, LitElement } from "lit";
import { customElement, state } from "lit/decorators.js";
import "./components/ot-blog.ts";
import "./components/ot-article.ts";
import "./components/ot-contributors.ts";
import "./components/ot-footer.ts";
import "./components/ot-modal.ts";
import { ModalController } from "./utils/modal.js";
import { APP_NAVIGATE_EVENT, type AppRoute, pathToRoute } from "./utils/router.js";

@customElement("ot-app")
export class OtApp extends LitElement {
  private modal = new ModalController(this);

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
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener("popstate", this.syncRouteFromPath);
    window.removeEventListener(APP_NAVIGATE_EVENT, this.syncRouteFromPath);
  }

  private syncRouteFromPath = () => {
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
