/*
  - rename name-section, NameSection, data-name-*
  - drop unused modules (init() call + block)
*/
if (!customElements.get('name-section')) {
  customElements.define(
    'name-section',
    class NameSection extends HTMLElement {
      // CORE (keep)
      connectedCallback() {
        this.abort = new AbortController();
        this.init();
      }

      disconnectedCallback() {
        this.abort.abort();
      }

      init() {
        // To drop a module: remove its call + its block below
        this.initTabs();
        this.initSlider();
        this.initCart();
        this.initAnimation();
      }

      // TABS: [data-name-tabs], [data-name-tab-panel]
      initTabs() {
        const tabs = this.querySelectorAll('[data-name-tabs] [role="tab"]');
        const panels = this.querySelectorAll('[data-name-tab-panel]');
        const { signal } = this.abort;

        const activate = (index) => {
          tabs.forEach((tab, i) => {
            const active = i === index;
            tab.setAttribute('aria-selected', active);
            tab.tabIndex = active ? 0 : -1;
            panels[i]?.toggleAttribute('hidden', !active);
          });
          tabs[index].focus();
        };

        tabs.forEach((tab, index) => {
          tab.addEventListener('click', () => activate(index), { signal });

          tab.addEventListener(
            'keydown',
            (e) => {
              const last = tabs.length - 1;
              const target = {
                ArrowRight: index === last ? 0 : index + 1,
                ArrowDown: index === last ? 0 : index + 1,
                ArrowLeft: index === 0 ? last : index - 1,
                ArrowUp: index === 0 ? last : index - 1,
                Home: 0,
                End: last,
              }[e.key];
              if (target === undefined) return;

              e.preventDefault();
              activate(target);
            },
            { signal }
          );
        });
      }

      // SLIDER: [data-name-swiper], Swiper
      initSlider() {
        const slider = this.querySelector('[data-name-swiper]');
        if (!slider || typeof Swiper === 'undefined') return;

        const swiper = new Swiper(slider, {
          slidesPerView: 1.3,
          spaceBetween: 12,
          centeredSlides: true,
          grabCursor: true,
          // slidesOffsetBefore: 16,
          // slidesOffsetAfter: 16,
          breakpoints: {
            750: { slidesPerView: 2, centeredSlides: false },
            1200: { slidesPerView: Number(slider.dataset.columns), centeredSlides: false },
          },
          navigation: {
            nextEl: this.querySelector('[data-name-swiper-next]'),
            prevEl: this.querySelector('[data-name-swiper-prev]'),
          },
          pagination: {
            el: this.querySelector('[data-name-swiper-pagination]'),
            clickable: true,
          },
          autoplay: matchMedia('(prefers-reduced-motion: reduce)').matches
            ? false
            : { delay: 3000, disableOnInteraction: false, pauseOnMouseEnter: true },
        });

        this.abort.signal.addEventListener('abort', () => swiper.destroy(true, true));
      }

      // CART: form[data-name-add-to-cart], Dawn <cart-drawer>; without the drawer the form submits natively
      initCart() {
        const drawer = document.querySelector('cart-drawer');
        if (!drawer?.renderContents) return;

        this.querySelectorAll('[data-name-add-to-cart]').forEach((form) => {
          form.addEventListener(
            'submit',
            (e) => {
              e.preventDefault();
              this.addToCart(form, drawer);
            },
            { signal: this.abort.signal }
          );
        });
      }

      async addToCart(form, drawer) {
        const button = form.querySelector('[type="submit"]');
        const error = form.querySelector('[role="alert"]');
        const body = new FormData(form);
        body.append('sections', 'cart-drawer,cart-icon-bubble');
        body.append('sections_url', window.location.pathname);

        button.disabled = true;
        error.hidden = true;
        try {
          const response = await fetch('/cart/add.js', { method: 'POST', body });
          const state = await response.json();
          if (!response.ok) throw new Error(state.description);

          drawer.classList.remove('is-empty');
          drawer.renderContents(state);
        } catch (e) {
          error.textContent = e.message;
          error.hidden = false;
        } finally {
          button.disabled = false;
        }
      }

      // ANIMATION: [data-name-title], gsap (script tags in section liquid)
      initAnimation() {
        const title = this.querySelector('[data-name-title]');
        if (!title || typeof gsap === 'undefined' || matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        const tween = gsap.from(title, {
          opacity: 0,
          y: 30,
          duration: 0.8,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: title,
            start: 'top 85%',
            toggleActions: 'play none none none',
          },
        });

        this.abort.signal.addEventListener('abort', () => {
          tween.scrollTrigger?.kill();
          tween.kill();
        });
      }
    }
  );
}
