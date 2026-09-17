class NameSection {
  constructor(container) {
    this.container = container;
    this.sectionId = container.dataset.sectionId;
    this.gridColumns = Number(container.dataset.gridColumns) || 3;
    this.swiperInstance = null;
    this.resizeHandler = null;
    this.scrollTriggers = []; // ScrollTrigger instances owned by this section
    this.init();
  }

  init() {
    this.initAccordion();
    this.initTabs();
    this.initSlider();
    this.initCart();
    this.initAnimations();
  }

  // ===== GSAP ANIMATION (for [data-name-title]) =====
  initAnimations() {
    if (typeof gsap === 'undefined') return;
    const title = this.container.querySelector('[data-name-title]');
    if (!title) return;

    const trigger = gsap.from(title, {
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
    if (trigger && trigger.scrollTrigger) this.scrollTriggers.push(trigger.scrollTrigger);
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
    const tabList = this.container.querySelector('[data-name-tabs]');
    const tabLinks = this.container.querySelectorAll('[data-name-tabs] [role="tab"]');
    const tabPanels = this.container.querySelectorAll('[data-name-tab-panel]');
    if (!tabLinks.length || !tabPanels.length) return;

    const deactivateTabs = () => {
      tabLinks.forEach((t) => {
        t.setAttribute('aria-selected', 'false');
        t.setAttribute('tabindex', '-1');
        t.closest('li')?.classList.remove('active');
      });
      tabPanels.forEach((p) => p.classList.remove('active'));
    };

    const activateTab = (index) => {
      if (!tabLinks[index] || !tabPanels[index]) return;
      deactivateTabs();
      tabLinks[index].setAttribute('aria-selected', 'true');
      tabLinks[index].setAttribute('tabindex', '0');
      tabLinks[index].closest('li')?.classList.add('active');
      tabPanels[index].classList.add('active');
      tabLinks[index].focus();
    };

    tabLinks.forEach((link, index) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        activateTab(index);
      });

      link.addEventListener('keydown', (e) => {
        const lastIndex = tabLinks.length - 1;
        let targetIndex;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault();
          targetIndex = index === lastIndex ? 0 : index + 1;
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault();
          targetIndex = index === 0 ? lastIndex : index - 1;
        } else if (e.key === 'Home') {
          e.preventDefault();
          targetIndex = 0;
        } else if (e.key === 'End') {
          e.preventDefault();
          targetIndex = lastIndex;
        }
        if (targetIndex !== undefined) activateTab(targetIndex);
      });
    });

    if (tabList) {
      tabList.addEventListener('focus', () => {
        const active = this.container.querySelector('[role="tab"][aria-selected="true"]');
        if (active) active.focus();
      }, true);
    }
  }

  // ===== SLIDER (Swiper) =====
  initSlider() {
    if (typeof Swiper === 'undefined') return;
    const swiperContainer = this.container.querySelector(`[data-name-swiper="${this.sectionId}"]`);
    if (!swiperContainer) return;
    try {
      this.swiperInstance = new Swiper(`[data-name-swiper="${this.sectionId}"]`, {
        slidesPerView: 1.3,
        spaceBetween: 12,
        centeredSlides: true,
        grabCursor: true,
        // slidesOffsetBefore: 16,
        // slidesOffsetAfter: 16,

        lazy: {
          loadPrevNext: true,
          loadPrevNextAmount: 1,
        },
        breakpoints: {
          750: { slidesPerView: 2, centeredSlides: false },
          1200: { slidesPerView: this.gridColumns, centeredSlides: false },
        },
        navigation: {
          nextEl: `[data-name-swiper-next="${this.sectionId}"]`,
          prevEl: `[data-name-swiper-prev="${this.sectionId}"]`,
        },
        pagination: {
          el: `[data-name-swiper-pagination="${this.sectionId}"]`,
          clickable: true,
          type: 'bullets',
        },
        autoplay: {
          delay: 3000,
          disableOnInteraction: false,
          pauseOnMouseEnter: true,
        },
      });
      let resizeTimer;
      this.resizeHandler = () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
          if (this.swiperInstance) {
            this.swiperInstance.update();
            if (window.innerWidth < 750) {
              this.swiperInstance.slideTo(1, 0);
            } else {
              this.swiperInstance.slideTo(0, 0);
            }
          }
        }, 250);
      };
      window.addEventListener('resize', this.resizeHandler);
    } catch (error) {
      console.warn('Swiper initialization failed:', error);
    }
  }

  // ===== CART =====
  initCart() {
    const buttons = this.container.querySelectorAll('[data-name-add-to-cart]');
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
    // GSAP cleanup – only triggers owned by this section
    if (typeof gsap !== 'undefined') {
      gsap.killTweensOf(this.container);
      if (window.ScrollTrigger) {
        this.scrollTriggers.forEach((st) => st.kill());
      }
    }
    this.scrollTriggers = [];
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
