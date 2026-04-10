import { html, LitElement } from "lit";
import { customElement } from "lit/decorators.js";
import { handleInternalNav, hrefForHome, hrefForImprint } from "../utils/router.js";

@customElement("ot-privacy")
export class OtPrivacy extends LitElement {
  createRenderRoot() {
    return this;
  }

  render() {
    return html`
      <section class="privacy">
        <a class="privacy-back" href=${hrefForHome()} @click=${handleInternalNav}>Back to home</a>
        <h1 class="privacy-title">Privacy notice</h1>
        <p class="privacy-lead">Last updated: April 10, 2026</p>

        <section class="privacy-section">
          <h2>Who we are</h2>
          <p>
            This website is operated by OpenTentacle. If you have questions about this notice or data handling, please
            use the contact details listed in our <a href=${hrefForImprint()} @click=${handleInternalNav}>imprint</a>.
          </p>
        </section>

        <section class="privacy-section">
          <h2>Audience measurement (PostHog)</h2>
          <p>
            We use PostHog for basic audience measurement, such as understanding which pages are visited and how the
            site is used. This helps us improve content and usability.
          </p>
          <p>Our implementation is configured to run in cookieless mode:</p>
          <ul>
            <li>No analytics cookies are set by this integration.</li>
            <li>No browser localStorage/sessionStorage persistence for analytics identifiers is used.</li>
            <li>Analytics state is kept in memory only and resets when you close the tab/window.</li>
          </ul>
        </section>

        <section class="privacy-section">
          <h2>What data may be processed</h2>
          <ul>
            <li>Page views and navigation events.</li>
            <li>Basic technical metadata (for example browser/device data and timestamps).</li>
            <li>Network metadata required for delivery and security, such as IP address at request time.</li>
          </ul>
          <p>
            We do not intentionally use this analytics setup to identify you as an individual visitor. Where possible,
            we use aggregated or pseudonymous analytics information.
          </p>
        </section>

        <section class="privacy-section">
          <h2>Legal basis</h2>
          <p>
            Where applicable, we rely on legitimate interests to measure and improve our website in a privacy-conscious
            way. If local law requires consent for analytics in your jurisdiction, we will obtain it before processing.
          </p>
        </section>

        <section class="privacy-section">
          <h2>Data sharing and international transfers</h2>
          <p>
            PostHog acts as our analytics service provider (processor). Data may be processed in regions outside your
            country. Where required, appropriate safeguards are used for international transfers.
          </p>
        </section>

        <section class="privacy-section">
          <h2>Retention</h2>
          <p>
            Analytics data is retained only as long as needed for audience measurement and site improvement, then
            deleted or anonymized according to our retention settings.
          </p>
        </section>

        <section class="privacy-section">
          <h2>Your rights</h2>
          <p>
            Depending on your location, you may have rights to access, correct, delete, restrict, or object to
            processing of personal data, and to lodge a complaint with a supervisory authority.
          </p>
        </section>
      </section>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ot-privacy": OtPrivacy;
  }
}
