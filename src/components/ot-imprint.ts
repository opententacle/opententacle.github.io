import { html, LitElement } from "lit";
import { customElement } from "lit/decorators.js";
import { handleInternalNav, hrefForHome } from "../utils/router.js";

@customElement("ot-imprint")
export class OtImprint extends LitElement {
  createRenderRoot() {
    return this;
  }

  render() {
    return html`
      <section class="imprint">
        <a class="imprint-back" href=${hrefForHome()} @click=${handleInternalNav}>Back to home</a>
        <h1 class="imprint-title">Imprint</h1>
        <p class="imprint-lead">
          Contact details and legal transparency information for this website.
        </p>

        <section class="imprint-section">
          <h2>Contact</h2>
          <p>
            GitHub profile:
            <a href="https://github.com/DarwinsBuddy" target="_blank" rel="noopener noreferrer"
              >github.com/DarwinsBuddy</a
            >
          </p>
        </section>
      </section>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ot-imprint": OtImprint;
  }
}
