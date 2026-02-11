const SLOWDOWN_DURATION = 500;

/**
 * @param {object} params
 * @param {number}   params.from
 * @param {number}   params.to
 * @param {number}   params.duration        — мс
 * @param {function} params.onUpdate
 * @param {function} [params.easing]
 * @param {function} [params.onComplete]
 * @returns {{ current: number, cancel: function }}
 */
function animateValue({ from, to, duration, onUpdate, easing = (t) => t * t * (3 - 2 * t), onComplete }) {
  const startTime = performance.now();
  let cancelled = false;
  let currentValue = from;

  function step(now) {
    if (cancelled) return;
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    currentValue = from + (to - from) * easing(progress);
    onUpdate(currentValue);
    if (progress < 1) {
      requestAnimationFrame(step);
    } else if (typeof onComplete === 'function') {
      onComplete();
    }
  }

  requestAnimationFrame(step);

  return {
    get current() {
      return currentValue;
    },
    cancel() {
      cancelled = true;
    },
  };
}

/**
 * @param {function} fn
 * @param {number}   delay — мс
 * @returns {function & { cancel: function }}
 */
function debounce(fn, delay) {
  let timer = null;
  function debounced(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  }
  debounced.cancel = () => clearTimeout(timer);
  return debounced;
}

class MarqueeComponent extends HTMLElement {
  /** @type {{ cancel: function, current: number } | null} */
  #animation = null;

  /** @type {number | null} */
  #marqueeWidth = null;

  connectedCallback() {
    /** @type {HTMLElement} */
    this._wrapper = this.querySelector('[data-marquee-wrapper]');
    /** @type {HTMLElement} */
    this._content = this.querySelector('[data-marquee-content]');
    /** @type {HTMLElement} */
    this._itemsContainer = this.querySelector('[data-marquee-items]');

    if (!this._wrapper || !this._content || !this._itemsContainer) return;

    this._init();
  }

  disconnectedCallback() {
    window.removeEventListener('resize', this._handleResize);
    this.removeEventListener('pointerenter', this._handlePointerEnter);
    this.removeEventListener('pointerleave', this._handlePointerLeave);
  }

  async _init() {
    const { numberOfCopies } = await this._queryNumberOfCopies();
    const speed = this._calculateSpeed(numberOfCopies);

    this._addRepeatedItems(numberOfCopies);
    this._duplicateContent();
    this._setSpeed(speed);

    this._handleResize = debounce(async () => {
      const { numberOfCopies: newCount, isHorizontalResize } = await this._queryNumberOfCopies();
      if (!isHorizontalResize) return;

      const currentCount = this._content.querySelectorAll('[data-marquee-items]').length;
      const newSpeed = this._calculateSpeed(newCount);

      if (newCount > currentCount) {
        this._addRepeatedItems(newCount - currentCount);
      } else if (newCount < currentCount) {
        this._removeRepeatedItems(currentCount - newCount);
      }

      this._duplicateContent();
      this._setSpeed(newSpeed);
      this._restartAnimation();
    }, 250);

    this._handlePointerEnter = debounce(() => {
      if (this.#animation) return;
      const anim = this._wrapper.getAnimations()[0];
      if (!anim) return;

      this.#animation = animateValue({
        duration: SLOWDOWN_DURATION,
        from: 1,
        to: 0,
        onUpdate: (v) => anim.updatePlaybackRate(v),
        onComplete: () => {
          this.#animation = null;
        },
      });
    }, SLOWDOWN_DURATION);

    this._handlePointerLeave = () => {
      this._handlePointerEnter.cancel();
      const anim = this._wrapper.getAnimations()[0];
      if (!anim || anim.playbackRate === 1) return;

      const from = this.#animation?.current ?? 0;
      this.#animation?.cancel();

      this.#animation = animateValue({
        duration: SLOWDOWN_DURATION,
        from,
        to: 1,
        onUpdate: (v) => anim.updatePlaybackRate(v),
        onComplete: () => {
          this.#animation = null;
        },
      });
    };

    window.addEventListener('resize', this._handleResize);
    this.addEventListener('pointerenter', this._handlePointerEnter);
    this.addEventListener('pointerleave', this._handlePointerLeave);
  }

  // ─── helpers ──────────────────────────────────────────────────────────────

  /** @param {number} value */
  _setSpeed(value) {
    this.style.setProperty('--marquee-speed', `${value}s`);
  }

  /** @param {number} n */
  _calculateSpeed(n) {
    const factor = Number(this.dataset.speedFactor) || 25;
    return Math.sqrt(n) * factor;
  }

  /**
   * @returns {Promise<{ numberOfCopies: number, isHorizontalResize: boolean }>}
   */
  _queryNumberOfCopies() {
    const container = this._itemsContainer;

    return new Promise((resolve) => {
      if (!container) {
        return setTimeout(() => resolve({ numberOfCopies: 1, isHorizontalResize: true }), 0);
      }

      const observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (!entry) return;
          observer.disconnect();

          const marqueeWidth = entry.rootBounds?.width ?? 0;
          const itemsWidth = entry.boundingClientRect.width;
          const isHorizontalResize = this.#marqueeWidth !== marqueeWidth;
          this.#marqueeWidth = marqueeWidth;

          setTimeout(() => {
            resolve({
              numberOfCopies: itemsWidth === 0 ? 1 : Math.ceil(marqueeWidth / itemsWidth),
              isHorizontalResize,
            });
          }, 0);
        },
        { root: this },
      );

      observer.observe(container);
    });
  }

  /** @param {number} n */
  _addRepeatedItems(n) {
    const original = this._itemsContainer;
    if (!original) return;

    for (let i = 0; i < n - 1; i++) {
      const clone = original.cloneNode(true);
      this._content.appendChild(clone);
    }
  }

  /** @param {number} n */
  _removeRepeatedItems(n) {
    const children = Array.from(this._content.children);
    const toRemove = Math.min(n, children.length - 1);
    for (let i = 0; i < toRemove; i++) {
      this._content.lastElementChild?.remove();
    }
  }

  _duplicateContent() {
    const existing = this._wrapper.querySelector('[data-marquee-clone]');
    existing?.remove();

    const clone = /** @type {HTMLElement} */ (this._content.cloneNode(true));
    clone.setAttribute('aria-hidden', 'true');
    clone.setAttribute('data-marquee-clone', '');
    clone.removeAttribute('data-marquee-content');

    this._wrapper.appendChild(clone);
  }

  _restartAnimation() {
    requestAnimationFrame(() => {
      for (const anim of this._wrapper.getAnimations()) {
        anim.currentTime = 0;
      }
    });
  }
}

if (!customElements.get('marquee-component')) {
  customElements.define('marquee-component', MarqueeComponent);
}
