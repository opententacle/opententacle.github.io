import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";

@customElement("ot-button")
export class OtButton extends LitElement {
  @property({ type: String })
  cta = "";

  @property({ attribute: false })
  onClick?: () => void;

  render() {
    return html`
      <button type="button" class="btn" @click=${() => this.onClick?.()}>
        ${this.cta}
      </button>
    `;
  }

  static styles = css`
    .btn {
      font: inherit;
      cursor: pointer;
      border: none;
      border-radius: 0.5rem;
      padding: 0.5rem 1rem;
      background: var(--button-bg, var(--color-accent));
      color: var(--button-color, #1c1917);
      font-weight: 600;
      transition: transform 0.15s ease, background 0.15s ease;
    }

    .btn:hover {
      filter: brightness(1.05);
    }

    .btn:active {
      transform: scale(0.98);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ot-button": OtButton;
  }
}
