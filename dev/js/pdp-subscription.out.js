if (!customElements.get('pdp-subscription')) {
  customElements.define(
    'pdp-subscription',
    class PdpSubscription extends HTMLElement {
      connectedCallback() {
        this.input = this.querySelector('[data-ps-input]');
        this.tabs = this.querySelectorAll('[data-ps-tab]');
        this.details = this.querySelector('[data-ps-details]');
        this.abort = new AbortController();
        const { signal } = this.abort;

        this.tabs.forEach((tab) => tab.addEventListener('click', () => this.select(tab.dataset.psTab), { signal }));
        this.querySelectorAll('[data-ps-plan]').forEach((plan) =>
          plan.addEventListener('change', () => this.select('sub'), { signal })
        );

        // Prices are re-rendered by Dawn on variant change: copy them from the fresh section HTML
        this.unsubscribe = subscribe(PUB_SUB_EVENTS.variantChange, ({ data }) => {
          if (data.sectionId !== this.dataset.sectionId) return;
          const fresh = data.html.querySelector(`pdp-subscription[data-section-id="${this.dataset.sectionId}"]`);
          if (!fresh) return;
          this.querySelectorAll('[data-ps-price], [data-ps-plan-price]').forEach((el) => {
            const attr = el.hasAttribute('data-ps-price') ? 'data-ps-price' : 'data-ps-plan-price';
            const next = fresh.querySelector(`[${attr}="${el.getAttribute(attr)}"]`);
            if (next) el.textContent = next.textContent;
          });
        });
      }

      disconnectedCallback() {
        this.abort.abort();
        this.unsubscribe?.();
      }

      select(type) {
        const isSub = type === 'sub';
        this.tabs.forEach((tab) => tab.setAttribute('aria-pressed', String(tab.dataset.psTab === type)));
        this.querySelector('.ps__tab--otp').classList.toggle('is-active', !isSub);
        this.querySelector('.ps__tab--sub').classList.toggle('is-active', isSub);
        this.details.hidden = !isSub;

        this.input.disabled = !isSub;
        this.input.value = isSub ? this.querySelector('[data-ps-plan]:checked').value : '';
        this.input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  );
}
