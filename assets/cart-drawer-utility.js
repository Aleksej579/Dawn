// Toggles the coupon / note panels in the cart drawer footer. Plain buttons
// (not <details>) are used here on purpose: they get correct button/aria
// semantics for free, whereas the drawer's other disclosures (see
// setSummaryAccessibility in cart-drawer.js) have to patch that in manually
// because a native <details><summary> isn't announced as a toggle button.
class CartDrawerUtility extends HTMLElement {
  constructor() {
    super();

    this.querySelectorAll('.cart-drawer__utility-toggle').forEach((trigger) => {
      trigger.addEventListener('click', () => this.toggle(trigger));
    });
  }

  toggle(trigger) {
    const panel = document.getElementById(trigger.getAttribute('aria-controls'));
    if (!panel) return;

    const isOpen = trigger.getAttribute('aria-expanded') === 'true';
    trigger.setAttribute('aria-expanded', String(!isOpen));
    panel.hidden = isOpen;

    if (!isOpen) {
      panel.querySelector('input, textarea')?.focus();
    }
  }
}

customElements.define('cart-drawer-utility', CartDrawerUtility);

if (!customElements.get('cart-discount')) {
  customElements.define(
    'cart-discount',
    class CartDiscount extends HTMLElement {
      constructor() {
        super();

        this.input = this.querySelector('input[name="discount"]');
        this.submitButton = this.querySelector('.cart-discount__submit');
        this.messageElement = this.querySelector('.cart-discount__message');
        this.messageText = this.querySelector('.cart-discount__message-text');

        this.submitButton?.addEventListener('click', () => this.onSubmit());
        this.input?.addEventListener('keydown', (event) => {
          if (event.code === 'Enter') {
            event.preventDefault();
            this.onSubmit();
          }
        });
      }

      onSubmit() {
        const code = this.input.value.trim();
        if (!code || this.submitButton.disabled) return;

        this.setBusy(true);
        this.hideMessage();

        // /cart/update.js's discount param replaces the cart's whole discount
        // set rather than adding to it, so an already-applied code has to be
        // read back and carried along or it gets silently dropped.
        CartItems.fetchCartData()
          .then((currentCart) => {
            const existingCodes = (currentCart?.discount_codes || []).map((entry) => entry.code);
            const codes = [...new Set([...existingCodes, code])];
            return this.applyDiscountCodes(codes, code);
          })
          .finally(() => this.setBusy(false));
      }

      applyDiscountCodes(codes, enteredCode) {
        const { CartDiscountUpdateEvent, CartErrorEvent } = window.StandardEvents || {};
        const deferred = CartDiscountUpdateEvent?.createPromise();

        if (CartDiscountUpdateEvent) {
          this.dispatchEvent(
            new CartDiscountUpdateEvent({
              discountCodes: codes.map((discountCode) => ({ code: discountCode })),
              promise: deferred.promise,
            })
          );
        }

        const body = JSON.stringify({ discount: codes.join(',') });

        return fetch(`${routes.cart_update_url}`, { ...fetchConfig(), ...{ body } })
          .then((response) => response.json())
          .then((cart) => {
            if (!cart || cart.errors) {
              throw Object.assign(
                new Error(typeof cart?.errors === 'string' ? cart.errors : window.cartStrings.error),
                { code: 'INVALID' }
              );
            }

            const standardCart = CartDiscountUpdateEvent ? CartDiscountUpdateEvent.createCartFromAjaxResponse(cart) : null;
            deferred?.resolve({ cart: standardCart });

            const appliedEntries = standardCart?.discountCodes || cart.discount_codes || [];
            const entered = appliedEntries.find((entry) => entry.code.toLowerCase() === enteredCode.toLowerCase());

            if (entered && entered.applicable) {
              this.input.value = '';
              this.collapse();
              publish(PUB_SUB_EVENTS.cartUpdate, { source: 'cart-discount', cartData: cart });
            } else {
              this.showMessage(window.cartStrings.discountCodeError);
            }
          })
          .catch((e) => {
            deferred?.reject(e);
            this.showMessage(e.message || window.cartStrings.error);
            if (CartErrorEvent) {
              this.dispatchEvent(new CartErrorEvent({ error: e.message, code: e.code || 'SERVICE_UNAVAILABLE' }));
            }
          });
      }

      collapse() {
        const panel = this.closest('.cart-drawer__utility-panel');
        const trigger = document.getElementById('CartDrawer-Discount-Trigger');
        if (panel) panel.hidden = true;
        trigger?.setAttribute('aria-expanded', 'false');
      }

      setBusy(isBusy) {
        if (this.submitButton) this.submitButton.disabled = isBusy;
        if (this.input) this.input.disabled = isBusy;
      }

      showMessage(text) {
        if (!this.messageElement || !text) return;
        this.messageText.textContent = text;
        this.messageElement.hidden = false;
      }

      hideMessage() {
        if (!this.messageElement) return;
        this.messageElement.hidden = true;
      }
    }
  );
}
