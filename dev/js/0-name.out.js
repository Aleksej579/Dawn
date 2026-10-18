/*
  - rename name-section, NameSection, data-name-*
  - drop unused modules (init() call + block)
*/
// Swiper: the theme's global one if present, otherwise loaded once from CDN (section works in any project)
let swiperReady;
const loadSwiper = () => {
  if (window.Swiper) return Promise.resolve();

  swiperReady ??= new Promise((resolve, reject) => {
    const cdn = 'https://cdn.jsdelivr.net/npm/swiper@10.3.1/swiper-bundle.min';
    document.head.insertAdjacentHTML('beforeend', `<link rel="stylesheet" href="${cdn}.css">`);
    document.head.append(Object.assign(document.createElement('script'), { src: `${cdn}.js`, onload: resolve, onerror: reject }));
  });
  return swiperReady;
};

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
        this.initVideos();
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

      // SLIDER: [data-name-swiper], Swiper; labels come from the theme locales (data-labels)
      async initSlider() {
        const slider = this.querySelector('[data-name-swiper]');
        if (!slider) return;

        const { signal } = this.abort;
        await loadSwiper();
        if (signal.aborted) return;

        const labels = JSON.parse(slider.dataset.labels);

        const swiper = new Swiper(slider, {
          slidesPerView: 1.3,
          spaceBetween: 12,
          grabCursor: true,
          slidesOffsetBefore: 16,
          slidesOffsetAfter: 16,
          breakpoints: {
            750: { slidesPerView: 2, slidesOffsetBefore: 0, slidesOffsetAfter: 0 },
            1200: { slidesPerView: Number(slider.dataset.columns), slidesOffsetBefore: 0, slidesOffsetAfter: 0 },
          },
          navigation: {
            nextEl: this.querySelector('[data-name-swiper-next]'),
            prevEl: this.querySelector('[data-name-swiper-prev]'),
          },
          pagination: {
            el: this.querySelector('[data-name-swiper-pagination]'),
            clickable: true,
          },
          a11y: {
            prevSlideMessage: labels.prev,
            nextSlideMessage: labels.next,
            containerRoleDescriptionMessage: labels.carousel,
            itemRoleDescriptionMessage: labels.slide,
            slideLabelMessage: `${labels.slide} {{index}} / {{slidesLength}}`,
            paginationBulletMessage: `${labels.loadSlide} {{index}}`,
          },
          autoplay: matchMedia('(prefers-reduced-motion: reduce)').matches
            ? false
            : { delay: 3000, disableOnInteraction: false, pauseOnMouseEnter: true },
        });

        signal.addEventListener('abort', () => swiper.destroy(true, true));

        // Autoplay control (WCAG 2.2.2): pause button + stop while keyboard focus is inside
        const toggle = this.querySelector('[data-name-swiper-autoplay]');
        if (!swiper.autoplay.running || !toggle) return;

        let pausedByUser = false;
        toggle.hidden = false;

        toggle.addEventListener(
          'click',
          () => {
            pausedByUser = !pausedByUser;
            toggle.toggleAttribute('data-paused', pausedByUser);
            toggle.setAttribute('aria-label', pausedByUser ? labels.play : labels.pause);
            if (pausedByUser) swiper.autoplay.stop();
            else swiper.autoplay.start();
          },
          { signal }
        );

        slider.addEventListener(
          'focusin',
          () => slider.querySelector(':focus-visible') && swiper.autoplay.stop(),
          { signal }
        );
        slider.addEventListener('focusout', () => !pausedByUser && swiper.autoplay.start(), { signal });
      }

      // VIDEOS: [data-name-play], [data-name-pause] next to a <video>; one plays at a time, off-screen pauses
      initVideos() {
        const { signal } = this.abort;
        const cards = [...this.querySelectorAll('[data-name-play]')].map((play) => ({
          play,
          pause: play.parentElement.querySelector('[data-name-pause]'),
          video: play.parentElement.querySelector('video'),
        }));

        const observer = new IntersectionObserver((entries) =>
          entries.forEach((entry) => !entry.isIntersecting && entry.target.pause())
        );
        signal.addEventListener('abort', () => observer.disconnect());

        cards.forEach(({ play, pause, video }) => {
          observer.observe(video);

          play.addEventListener(
            'click',
            () => {
              cards.forEach((card) => card.video !== video && card.video.pause());
              video.play();
            },
            { signal }
          );
          pause.addEventListener('click', () => video.pause(), { signal });

          const toggleButtons = (playing) => {
            play.hidden = playing;
            pause.hidden = !playing;
          };
          video.addEventListener('play', () => toggleButtons(true), { signal });
          video.addEventListener('pause', () => toggleButtons(false), { signal });
        });
      }

      // CART: form[data-name-add-to-cart], Dawn <cart-drawer>; without the drawer the form submits natively
      initCart() {
        // renderContents is not defined yet here: cart-drawer.js loads after the section scripts
        const drawer = document.querySelector('cart-drawer');
        if (!drawer) return;

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
          // Shopify root keeps the market/locale prefix (/fr/), so the drawer sections render in the right language
          const response = await fetch(`${window.Shopify.routes.root}cart/add.js`, { method: 'POST', body });
          const state = await response.json();
          if (!response.ok) {
            error.textContent = state.description;
            error.hidden = false;
            return;
          }

          drawer.classList.remove('is-empty');
          drawer.renderContents(state);
        } catch {
          error.textContent = error.dataset.fallback;
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
