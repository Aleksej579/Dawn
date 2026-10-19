/*
 * Quiz popup. Open with a link to #quiz or any element with data-qp-open.
 * Modules are independent: remove its call in init() and its method.
 */
if (!customElements.get('qp-section')) {
  customElements.define(
    'qp-section',
    class QpSection extends HTMLElement {
      // CORE
      connectedCallback() {
        this.abort = new AbortController();
        this.dialog = this.querySelector('[data-qp-dialog]');
        this.form = this.querySelector('form');
        this.init();
      }

      disconnectedCallback() {
        this.abort.abort();
      }

      init() {
        this.initOpenClose();
        this.initSteps();
        this.initEmail();
      }

      get signal() {
        return this.abort.signal;
      }

      show(step) {
        this.form.querySelectorAll('[data-qp-step]').forEach((el) => (el.hidden = el !== step));
        step.querySelector('select, input:not([type="hidden"]), button')?.focus();
      }

      // MODULE: open / close
      initOpenClose() {
        const { signal } = this;

        document.addEventListener(
          'click',
          (e) => {
            if (!e.target.closest('a[href="#quiz"], [data-qp-open]')) return;
            e.preventDefault();
            this.open();
          },
          { signal }
        );

        this.querySelector('[data-qp-close]').addEventListener('click', () => this.dialog.close(), { signal });
        this.dialog.addEventListener('click', (e) => e.target === this.dialog && this.dialog.close(), { signal });

        if (location.hash === '#quiz') this.open();
      }

      open() {
        this.reset();
        this.dialog.showModal();
      }

      reset() {
        this.form.reset();
        this.querySelector('[data-qp-city-custom]').hidden = true;
        this.querySelector('[data-qp-city-custom]').required = false;
        this.querySelector('[data-qp-email]').hidden = false;
        this.querySelector('[data-qp-message]').hidden = true;
        this.gender = null;
        this.index = 0;
        this.show(this.form.querySelector('[data-qp-step="city"]'));
      }

      // MODULE: quiz steps (city -> gender -> questions -> result)
      initSteps() {
        const { signal } = this;
        const citySelect = this.querySelector('[data-qp-city]');
        const cityCustom = this.querySelector('[data-qp-city-custom]');

        citySelect.addEventListener(
          'change',
          () => {
            const isOther = citySelect.value === 'other';
            cityCustom.hidden = !isOther;
            cityCustom.required = isOther;
          },
          { signal }
        );

        this.form.addEventListener(
          'click',
          (e) => {
            const gender = e.target.closest('[data-qp-gender]');
            if (gender) return this.startQuestions(gender.dataset.qpGender);
            if (e.target.closest('[data-qp-next]')) return this.next();
            if (e.target.closest('[data-qp-prev]')) return this.prev();
            if (e.target.closest('[data-qp-restart]')) this.reset();
          },
          { signal }
        );
      }

      get questions() {
        return [...this.form.querySelectorAll(`[data-qp-question="${this.gender}"]`)];
      }

      startQuestions(gender) {
        this.gender = gender;
        this.index = 0;
        this.show(this.questions[0]);
      }

      next() {
        const step = this.form.querySelector('[data-qp-step]:not([hidden])');

        if (step.dataset.qpStep === 'city') {
          const citySelect = this.querySelector('[data-qp-city]');
          const cityCustom = this.querySelector('[data-qp-city-custom]');
          if (!citySelect.reportValidity() || !cityCustom.reportValidity()) return;
          return this.show(this.form.querySelector('[data-qp-step="gender"]'));
        }

        if (!step.querySelector('input[type="radio"]').reportValidity()) return;
        const questions = this.questions;
        if (this.index < questions.length - 1) this.show(questions[++this.index]);
        else this.showResult();
      }

      prev() {
        if (this.index === 0) return this.show(this.form.querySelector('[data-qp-step="gender"]'));
        this.show(this.questions[--this.index]);
      }

      showResult() {
        const questions = this.questions;
        const score = questions.reduce((sum, q) => sum + Number(q.querySelector('input:checked').value), 0);
        const ratio = score / (questions.length * 3);
        const level = ratio < 0.5 ? 'low' : ratio < 0.8 ? 'mid' : 'high';

        this.form.querySelectorAll('[data-qp-result]').forEach((el) => (el.hidden = el.dataset.qpResult !== `${this.gender}-${level}`));
        this.form
          .querySelectorAll('[data-qp-product]')
          .forEach((el) => (el.hidden = level !== 'high' || el.dataset.qpProduct !== this.gender));

        const citySelect = this.querySelector('[data-qp-city]');
        const city = citySelect.value === 'other' ? this.querySelector('[data-qp-city-custom]').value.trim() : citySelect.value;
        this.querySelector('[data-qp-tags]').value = ['quiz-subscriber', `quiz-${this.gender}`, `quiz-${level}`, `quiz-city-${city.replaceAll(',', ' ')}`].join(',');

        this.show(this.form.querySelector('[data-qp-step="result"]'));
      }

      // MODULE: email subscription (posted with fetch: a real action on the form gets re-submitted natively by store scripts)
      initEmail() {
        this.form.addEventListener(
          'submit',
          async (e) => {
            e.preventDefault();
            if (!this.querySelector('[data-qp-email-input]').reportValidity()) return;

            const body = new FormData();
            this.form.querySelectorAll('[name="form_type"], [name="utf8"], [name^="contact["]').forEach((field) => body.append(field.name, field.value));

            const message = this.querySelector('[data-qp-message]');
            try {
              const response = await fetch(this.form.dataset.action, { method: 'POST', body });
              const isSubscribed = response.redirected && response.url.includes('customer_posted=true');
              message.textContent = isSubscribed ? message.dataset.success : message.dataset.error;
              this.querySelector('[data-qp-email]').hidden = isSubscribed;
            } catch {
              message.textContent = message.dataset.error;
            }
            message.hidden = false;
          },
          { signal: this.signal }
        );
      }
    }
  );
}
