/**
 * Store Anh - Checkout & Order Placement Controller
 */

const CheckoutPage = {
  isSubmitting: false,

  init() {
    const cart = window.db.getCart();
    if (cart.length === 0) {
      window.location.href = 'cart.html';
      return;
    }

    this.renderOrderSummary();
    this.prefillUserData();
    this.bindEvents();
  },

  prefillUserData() {
    const user = window.auth.getCurrentUser();
    if (user) {
      const nameInput = document.getElementById('checkout-fullname');
      const phoneInput = document.getElementById('checkout-phone');
      const emailInput = document.getElementById('checkout-email');
      const addressInput = document.getElementById('checkout-address');

      if (nameInput && !nameInput.value) nameInput.value = user.fullName || '';
      if (phoneInput && !phoneInput.value) phoneInput.value = user.phone || '';
      if (emailInput && !emailInput.value) emailInput.value = user.email || '';
      if (addressInput && !addressInput.value) addressInput.value = user.address || '';
    }
  },

  renderOrderSummary() {
    const itemsWrap = document.getElementById('checkout-items-list');
    const subtotalEl = document.getElementById('checkout-subtotal');
    const totalEl = document.getElementById('checkout-total');

    if (!itemsWrap) return;

    const cart = window.db.getCart();
    const subtotal = window.db.getCartSubtotal();
    const shippingFee = 0;
    const grandTotal = subtotal + shippingFee;

    itemsWrap.innerHTML = cart.map(item => `
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; margin-bottom: 0.85rem; padding-bottom: 0.85rem; border-bottom: 1px dashed var(--border-color);">
        <img src="${item.image}" alt="${item.name}" style="width: 44px; height: 44px; object-fit: contain; border-radius: var(--radius-xs); border: 1px solid var(--border-color); padding: 2px;">
        <div style="flex: 1; font-size: 0.85rem;">
          <div style="font-weight: 600; line-height: 1.2;" class="line-clamp-1">${item.name}</div>
          <div style="color: var(--text-muted); font-size: 0.775rem;">Số lượng: ${item.quantity} × ${App.formatVND(item.price)}</div>
        </div>
        <div style="font-weight: 700; font-size: 0.875rem; color: var(--text-main);">
          ${App.formatVND(item.subtotal || item.price * item.quantity)}
        </div>
      </div>
    `).join('');

    if (subtotalEl) subtotalEl.textContent = App.formatVND(subtotal);
    if (totalEl) totalEl.textContent = App.formatVND(grandTotal);
  },

  bindEvents() {
    // Payment method radio card selection highlight
    const paymentCards = document.querySelectorAll('.payment-method-card');
    paymentCards.forEach(card => {
      card.addEventListener('click', () => {
        paymentCards.forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        const radio = card.querySelector('input[type="radio"]');
        if (radio) radio.checked = true;
      });
    });

    // Form submission
    const form = document.getElementById('checkout-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleSubmit();
      });
    }
  },

  handleSubmit() {
    if (this.isSubmitting) return;

    const cart = window.db.getCart();
    if (cart.length === 0) {
      App.showToast('Giỏ hàng trống!', 'danger');
      window.location.href = 'cart.html';
      return;
    }

    const fullName = document.getElementById('checkout-fullname').value.trim();
    const phone = document.getElementById('checkout-phone').value.trim();
    const email = document.getElementById('checkout-email').value.trim();
    const address = document.getElementById('checkout-address').value.trim();
    const note = document.getElementById('checkout-note').value.trim();

    const selectedPayment = document.querySelector('input[name="paymentMethod"]:checked');
    const paymentMethod = selectedPayment ? selectedPayment.value : 'COD';

    // Validate inputs
    if (!fullName) {
      App.showToast('Vui lòng nhập họ và tên người nhận!', 'warning');
      document.getElementById('checkout-fullname').focus();
      return;
    }

    if (!phone || !/^[0-9]{10,11}$/.test(phone.replace(/\s+/g, ''))) {
      App.showToast('Vui lòng nhập số điện thoại hợp lệ (10-11 số)!', 'warning');
      document.getElementById('checkout-phone').focus();
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      App.showToast('Vui lòng nhập địa chỉ email hợp lệ!', 'warning');
      document.getElementById('checkout-email').focus();
      return;
    }

    if (!address) {
      App.showToast('Vui lòng nhập địa chỉ giao hàng cụ thể!', 'warning');
      document.getElementById('checkout-address').focus();
      return;
    }

    // Verify stock availability if product found locally
    for (const item of cart) {
      const p = window.db.getProductById(item.productId);
      if (p && p.stock !== undefined && p.stock !== null && p.stock < item.quantity) {
        App.showToast(`Sản phẩm "${item.name}" không đủ số lượng tồn kho (Còn ${p.stock})!`, 'danger');
        return;
      }
    }

    const orderPayload = {
      customerName: fullName,
      customerPhone: phone,
      customerEmail: email,
      shippingAddress: address,
      orderNote: note,
      paymentMethod: paymentMethod,
      items: cart.map(i => ({
        productId: i.productId,
        quantity: i.quantity
      }))
    };

    const submitBtn = document.getElementById('btn-submit-order');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '⏳ Đang xử lý tạo đơn hàng...';
    }
    this.isSubmitting = true;

    (async () => {
      let res = null;
      try {
        if (window.Api && window.Api.createOrder) {
          res = await window.Api.createOrder(orderPayload);
        }
      } catch (apiErr) {
        console.warn('API createOrder failed, attempting local fallback:', apiErr);
      }

      // If API failed or offline, fallback to local storage order creation
      if (!res || !res.order) {
        const orderCode = 'ORD-' + Math.floor(1000 + Math.random() * 9000);
        const subtotal = window.db.getCartSubtotal();
        const localOrder = {
          id: orderCode,
          orderCode: orderCode,
          customerName: fullName,
          customerPhone: phone,
          customerEmail: email,
          shippingAddress: address,
          orderNote: note,
          paymentMethod: paymentMethod,
          paymentStatus: paymentMethod === 'VNPAY' ? 'pending' : 'pending',
          orderStatus: 'cho_xac_nhan',
          subtotal: subtotal,
          shippingFee: 0,
          total: subtotal,
          items: cart.map(i => ({
            productId: i.productId,
            name: i.name,
            price: i.price,
            quantity: i.quantity,
            subtotal: i.subtotal || (i.price * i.quantity),
            image: i.image
          })),
          createdAt: new Date().toISOString()
        };

        if (window.db && window.db.saveOrder) {
          window.db.saveOrder(localOrder);
        }

        res = {
          success: true,
          order: localOrder,
          guestLookupToken: 'guest_' + Date.now()
        };
      }

      // Clear client cart after order creation
      window.db.clearCart();
      if (window.App && window.App.updateCartBadge) {
        window.App.updateCartBadge();
      }

      // Store guest token for order tracking if not logged in
      if (res.guestLookupToken) {
        try {
          const guestTokens = JSON.parse(localStorage.getItem('webbanmt_guest_tokens') || '[]');
          guestTokens.push({ orderCode: res.order.orderCode, token: res.guestLookupToken });
          localStorage.setItem('webbanmt_guest_tokens', JSON.stringify(guestTokens));
        } catch (e) {}
      }

      if (paymentMethod === 'VNPAY') {
        App.showToast('Đang kết nối tới cổng thanh toán VNPAY...', 'info');
        setTimeout(() => {
          window.location.href = `payment/processing.html?orderId=${encodeURIComponent(res.order.orderCode)}&amount=${res.order.total}${res.guestLookupToken ? '&token=' + res.guestLookupToken : ''}`;
        }, 600);
      } else {
        App.showToast(`Đặt hàng thành công! Mã đơn: #${res.order.orderCode}`, 'success', 'Thành công');
        setTimeout(() => {
          window.location.href = `orders.html?newOrder=${encodeURIComponent(res.order.orderCode)}${res.guestLookupToken ? '&token=' + res.guestLookupToken : ''}`;
        }, 800);
      }
    })();
  }
};

window.CheckoutPage = CheckoutPage;
