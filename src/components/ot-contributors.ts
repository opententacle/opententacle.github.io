import { html, LitElement } from "lit";
import { customElement } from "lit/decorators.js";
import { contributors } from "../data/contributors.js";
import {
  contributorLinkIconClass,
  defaultLabelForKind,
  resolveContributorLinkKind,
} from "../utils/contributor-links.js";
import { handleInternalNav, hrefForHome } from "../utils/router.js";

@customElement("ot-contributors")
export class OtContributors extends LitElement {
  createRenderRoot() {
    return this;
  }

  connectedCallback() {
    super.connectedCallback();
    requestAnimationFrame(() => this.scrollToHashFragment());
  }

  private scrollToHashFragment() {
    const raw = window.location.hash.slice(1);
    if (!raw) return;
    const id = decodeURIComponent(raw);
    document.getElementById(id)?.scrollIntoView({ block: "start", behavior: "smooth" });
  }

  render() {
    return html`
      <section class="contributors-wrap">
        <a class="contributors-back" href=${hrefForHome()} @click=${handleInternalNav}>← blog</a>
        <h1 class="contributors-title">contributors</h1>
        <ul class="contributors-grid" role="list">
          ${contributors.map(
            (c) => html`
            <li class="contributor-card" id=${c.id}>
              <div class="contributor-card-inner">
                <div class="contributor-avatar" aria-hidden="true">${initials(c.name)}</div>
                <div class="contributor-body">
                  <h2 class="contributor-name">${c.name}</h2>
                  ${c.tagline ? html`<p class="contributor-tagline">${c.tagline}</p>` : ""}
                  <p class="contributor-bio">${c.bio}</p>
                  ${
                    c.links?.length
                      ? html`
                    <ul class="contributor-links" role="list">
                      ${c.links.map((l) => {
                        const kind = resolveContributorLinkKind(l.href, l.kind);
                        const aria = l.label ?? defaultLabelForKind(kind);
                        const iconClass = contributorLinkIconClass(kind);
                        const href = l.href.trim();
                        const isMailto = /^mailto:/i.test(href);
                        const openExternal = /^https?:/i.test(href);
                        return html`
                        <li class="contributor-links-item">
                          <a
                            class="contributor-link contributor-link-with-icon"
                            href=${href}
                            target=${openExternal && !isMailto ? "_blank" : undefined}
                            rel=${openExternal && !isMailto ? "noopener noreferrer" : undefined}
                            aria-label=${aria}
                          >
                            <i class=${iconClass} aria-hidden="true"></i>
                            <span class="contributor-link-text">${aria}</span>
                          </a>
                        </li>
                      `;
                      })}
                    </ul>
                  `
                      : ""
                  }
                </div>
              </div>
            </li>
          `,
          )}
        </ul>
      </section>
    `;
  }
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

declare global {
  interface HTMLElementTagNameMap {
    "ot-contributors": OtContributors;
  }
}
