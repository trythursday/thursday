import { html, r } from "https://esm.sh/jsr/@campfire/core@4.0.4";
import { getFreeKey, API_BASE } from "./ai-for-all-client.js";
import { setApiKey, setApiEndpoint, setBaseUrl } from "./storage.js";

const views = {
  start: () =>
    html`
      <section class="setup">
        <h2>AI Setup</h2>
        <div class="state-body">
          <p>
            Thursday is a set of experiments around using generative AI to make
            people's lives better. For experiments like these, the Thursday
            project offers
            <a href="https://ai-for-all.trythursday.org">free AI usage</a>.
          </p>
          <div class="ai-actions">
            <button type="button" data-view="free">
              Get free AI access now
            </button>
            <button type="button" data-view="own">
              Use your own AI provider
            </button>
          </div>
        </div>
      </section>
    `,

  free: () =>
    html`
      <section class="setup">
        <h2>AI Setup</h2>
        <div class="state-body">
          <p>One click to get access valid for 30 days.</p>
          <div class="progress">
            <progress max="1" value="0"></progress>
            <span>0%</span>
          </div>
          <p class="error" role="alert"></p>
          <div class="button-row">
            <button type="button" class="outlined" data-view="start">
              Back
            </button>
            <button type="button" data-get>Get</button>
          </div>
        </div>
      </section>
    `,

  own: () =>
    html`
      <section class="setup">
        <h2>AI Setup</h2>
        <div class="state-body">
          <div class="field-row">
            <label for="base-url">Base URL</label>
            <input id="base-url" name="base-url" type="text" />
          </div>
          <div class="field-row">
            <label for="model">Model</label>
            <input id="model" name="model" type="text" />
          </div>
          <div class="field-row">
            <label for="api-key">API key</label>
            <input id="api-key" name="api-key" type="password" />
          </div>
          <div class="button-row">
            <button type="button" class="outlined" data-view="start">
              Back
            </button>
            <button type="button" data-save>Save</button>
          </div>
        </div>
      </section>
    `,
};

class AiSetup extends HTMLElement {
  #view = "start";

  connectedCallback() {
    this.addEventListener("click", (event) => {
      if (event.target.closest("[data-get]")) {
        this.#issue();
        return;
      }

      if (event.target.closest("[data-save]")) {
        setBaseUrl(this.querySelector("#base-url").value);
        setApiEndpoint(this.querySelector("#model").value);
        setApiKey(this.querySelector("#api-key").value);

        this.dispatchEvent(new CustomEvent("setup-complete", { bubbles: true }));

        this.#view = "start";
        this.#render();
        return;
      }

      const target = event.target.closest("[data-view]");
      if (!target) return;

      this.#view = target.dataset.view;
      this.#render();
    });

    this.#render();
  }

  #render() {
    this.innerHTML = html`${r(views[this.#view]())}`;
  }

  async #issue() {
    const bar = this.querySelector("progress");
    const label = this.querySelector(".progress span");
    const error = this.querySelector(".error");
    const buttons = this.querySelectorAll("button");

    buttons.forEach((button) => (button.disabled = true));
    error.textContent = "";

    try {
      const apiKey = await getFreeKey((progress) => {
        bar.value = progress;
        label.textContent = `${Math.round(progress * 100)}%`;
      });

      setBaseUrl(`${API_BASE}/api/v1`);
      setApiEndpoint("local");
      setApiKey(apiKey);

      this.dispatchEvent(new CustomEvent("setup-complete", { bubbles: true }));

      this.#view = "start";
      this.#render();
    } catch (caught) {
      error.textContent = caught.message;
      buttons.forEach((button) => (button.disabled = false));
    }
  }
}

customElements.define("ai-setup", AiSetup);
