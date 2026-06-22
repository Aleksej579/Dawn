/**
 * NameSection - Universal section with two animation approaches (GSAP vs anime.js)
 * Compare animations for .__title (GSAP) and .__subtitle (anime.js)
 * Both perform same effect: fade-in + slide-up on scroll
 */
class NameSection {
  constructor(container) {
    this.container = container;
    this.sectionId = container.dataset.sectionId;
    this.gridColumns = Number(container.dataset.gridColumns) || 3;
    this.swiperInstance = null;
    this.resizeHandler = null;
    this.observer = null; // for anime.js IntersectionObserver
    this.init();
  }

  init() {
    this.initAccordion();
    this.initTabs();
    this.initSlider();
    this.initCart();
    this.initAnimationsGSAP(); // .__title - GSAP + ScrollTrigger
    this.initAnimationsAnime(); // .__subtitle - anime.js + IntersectionObserver
  }

  // ===== GSAP ANIMATION (for .__title) =====
  initAnimationsGSAP() {
    if (typeof gsap === 'undefined') return;
    const title = this.container.querySelector('.__title');
    if (!title) return;

    gsap.from(title, {
      opacity: 0,
      y: 30, // same as anime
      duration: 0.8,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: title,
        start: 'top 85%',
        toggleActions: 'play none none none',
      },
    });
  }

  // ===== ANIME.JS ANIMATION (for .__subtitle) =====
  initAnimationsAnime() {
    if (typeof anime === 'undefined') return;
    const subtitle = this.container.querySelector('.__subtitle');
    if (!subtitle) return;

    // Use IntersectionObserver to trigger anime on scroll
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            anime({
              targets: subtitle,
              opacity: [0, 1],
              translateY: [30, 0],
              duration: 800,
              easing: 'easeOutQuad',
            });
            // Unobserve after first play (same as toggleActions: 'play none none none')
            this.observer.unobserve(subtitle);
          }
        });
      },
      { threshold: 0.2 },
    );

    this.observer.observe(subtitle);
  }

  // ===== ACCORDION =====
  initAccordion() {
    const details = this.container.querySelectorAll('details');
    if (!details.length) return;
    details.forEach((el) => {
      el.addEventListener('click', () => {
        if (!el.open) {
          details.forEach((other) => {
            if (other !== el) other.open = false;
          });
        }
      });
    });
  }

  // ===== TABS =====
  initTabs() {
    const tabLinks = this.container.querySelectorAll('.__tabs span');
    const tabPanels = this.container.querySelectorAll('.__tabs-panel');
    if (!tabLinks.length || !tabPanels.length) return;
    tabLinks.forEach((link, index) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const parentLi = link.closest('li');
        if (!parentLi) return;
        this.container.querySelectorAll('.__tabs li').forEach((li) => li.classList.remove('active'));
        this.container.querySelectorAll('.__tabs-panel').forEach((panel) => panel.classList.remove('active'));
        parentLi.classList.add('active');
        if (tabPanels[index]) tabPanels[index].classList.add('active');
      });
    });
  }

  // ===== SLIDER (Swiper) =====
  initSlider() {
    if (typeof Swiper === 'undefined') return;
    const swiperContainer = this.container.querySelector(`.swiper-${this.sectionId}`);
    if (!swiperContainer) return;
    const wrapper = swiperContainer.querySelector('.swiper-wrapper');
    if (wrapper) wrapper.style.display = 'flex';
    try {
      this.swiperInstance = new Swiper(`.swiper-${this.sectionId}`, {
        slidesPerView: 1.3,
        spaceBetween: 12,
        centeredSlides: true,
        grabCursor: true,
        breakpoints: {
          750: { slidesPerView: 2, centeredSlides: false },
          1200: { slidesPerView: this.gridColumns, centeredSlides: false },
        },
        navigation: {
          nextEl: `.swiper-button-next-${this.sectionId}`,
          prevEl: `.swiper-button-prev-${this.sectionId}`,
        },
        pagination: {
          el: `.swiper-pagination-${this.sectionId}`,
          clickable: true,
          type: 'bullets',
        },
        autoplay: {
          delay: 3000,
          disableOnInteraction: false,
          pauseOnMouseEnter: true,
        },
      });
      this.resizeHandler = () => {
        if (this.swiperInstance) {
          this.swiperInstance.update();
          if (window.innerWidth < 750) {
            this.swiperInstance.slideTo(1, 0);
          } else {
            this.swiperInstance.slideTo(0, 0);
          }
        }
      };
      window.addEventListener('resize', this.resizeHandler);
    } catch (error) {
      console.warn('Swiper initialization failed:', error);
    }
  }

  // ===== CART =====
  initCart() {
    const buttons = this.container.querySelectorAll('.add-to-cart');
    if (!buttons.length) return;
    buttons.forEach((button) => {
      button.addEventListener('click', async (e) => {
        const variantId = button.dataset.variantId;
        if (!variantId) {
          console.warn('Missing variant-id');
          return;
        }
        try {
          const response = await fetch('/cart/add.js', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: [{ id: variantId, quantity: 1 }] }),
          });
          if (!response.ok) throw new Error('Failed to add to cart');
          await this.updateCartDrawer();
        } catch (error) {
          console.error('Add to cart error:', error);
        }
      });
    });
  }

  async updateCartDrawer() {
    const drawer = document.querySelector('cart-drawer');
    if (!drawer) return;
    try {
      const response = await fetch('/?section_id=cart-drawer');
      const text = await response.text();
      const html = new DOMParser().parseFromString(text, 'text/html');
      const newDrawer = html.querySelector('cart-drawer');
      if (newDrawer) {
        drawer.innerHTML = newDrawer.innerHTML;
        drawer.classList.remove('is-empty');
        drawer.classList.add('animate', 'active');
        document.body.classList.add('overflow-hidden');
      }
      const cartResponse = await fetch('/cart.js');
      const cart = await cartResponse.json();
      const countSpan = document.querySelector('.cart-count-bubble span');
      if (countSpan) {
        countSpan.textContent = cart.item_count;
        const bubble = document.querySelector('.cart-count-bubble');
        if (bubble) bubble.style.display = cart.item_count > 0 ? 'flex' : 'none';
      }
    } catch (error) {
      console.warn('Cart update failed:', error);
    }
  }

  // ===== DESTROY =====
  destroy() {
    if (this.swiperInstance) {
      this.swiperInstance.destroy(true, true);
      this.swiperInstance = null;
    }
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
      this.resizeHandler = null;
    }
    // GSAP cleanup
    if (typeof gsap !== 'undefined') {
      gsap.killTweensOf(this.container);
      ScrollTrigger?.getAll()?.forEach((st) => st.kill());
    }
    // anime.js cleanup – disconnect observer
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }
}

// ===== INITIALISATION FUNCTIONS =====
function initNameSections() {
  document.querySelectorAll('[data-section-type="name"]').forEach((el) => {
    if (el._nameSectionInstance) return;
    el._nameSectionInstance = new NameSection(el);
  });
}

function destroyNameSections(container) {
  if (container && container._nameSectionInstance) {
    container._nameSectionInstance.destroy();
    delete container._nameSectionInstance;
  }
}

// ===== SHOPIFY EVENTS =====
document.addEventListener('DOMContentLoaded', initNameSections);
document.addEventListener('shopify:section:load', (e) => {
  const section = e.target;
  if (section && section.dataset.sectionType === 'name') {
    initNameSections();
  }
});
document.addEventListener('shopify:section:unload', (e) => {
  const section = e.target;
  if (section) {
    destroyNameSections(section);
  }
});
document.addEventListener('shopify:section:reload', (e) => {
  const section = e.target;
  if (section) {
    destroyNameSections(section);
    if (section.dataset.sectionType === 'name') {
      section._nameSectionInstance = new NameSection(section);
    }
  }
});
