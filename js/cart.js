/**
 * Store Anh - Shopping Cart Controller
 */

const CartPage = {
  init() {
    this.renderCart();
  },

  renderCart() {
    const container = document.getElementById('cart-page-content');
    if (!container) return;

    const cart = window.db.getCart();

    if (cart.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🛒</div>
          <h2 class="empty-state-title">Giỏ hàng của bạn đang trống</h2>
          <p class="empty-state-desc">Hãy khám phá hàng trăm mẫu Laptop, PC Gaming và linh kiện máy tính chính hãng với giá tốt nhất tại Store Anh.</p>
          <a href="products.html" class="btn btn-primary btn-lg">Khám phá sản phẩm ngay</a>
        </div>
      `;
      return;
    }

    const subtotal = window.db.getCartSubtotal();
    const shippingFee = 0; // Free ship promotion
    const grandTotal = subtotal + shippingFee;

    const tableRows = cart.map(item => {
      const product = window.db.getProductById(item.productId);
      const currentStock = product ? product.stock : (item.maxStock || 99);
      const isOverStock = item.quantity > currentStock;

      return `
        <tr data-product-id="${item.productId}">
          <td>
            <div class="cart-item-product">
              <img src="${item.image}" alt="${item.name}" class="cart-item-img" onerror="this.src='${createTechPlaceholder(item.name, 'Store Anh')}'">
              <div>
                <a href="product-detail.html?id=${item.productId}" class="cart-item-title">${item.name}</a>
                <div class="cart-item-sku">Mã: ${item.sku || 'N/A'} | Còn: ${currentStock} cái</div>
                ${isOverStock ? `<span class="badge badge-danger">Vượt quá tồn kho (${currentStock})</span>` : ''}
              </div>
            </div>
          </td>
          <td style="font-weight: 600;">${App.formatVND(item.price)}</td>
          <td>
            <div class="quantity-stepper" style="display:inline-flex;">
              <button class="qty-btn" type="button" onclick="CartPage.updateQty('${item.productId}', ${item.quantity - 1})">-</button>
              <input type="number" class="qty-input" value="${item.quantity}" readonly>
              <button class="qty-btn" type="button" onclick="CartPage.updateQty('${item.productId}', ${item.quantity + 1})" ${item.quantity >= currentStock ? 'disabled' : ''}>+</button>
            </div>
          </td>
          <td style="font-weight: 700; color: #EF4444;">${App.formatVND(item.subtotal || item.price * item.quantity)}</td>
          <td style="text-align: right;">
            <button class="btn btn-outline btn-sm" style="color: var(--danger); border-color: var(--border-color);" onclick="CartPage.removeItem('${item.productId}')" title="Xóa">
              🗑️
            </button>
          </td>
        </tr>
      `;
    }).join('');

    container.innerHTML = `
      <div class="cart-layout">
        <!-- Cart Items List -->
        <div>
          <div class="cart-table-card">
            <div style="padding: 1.25rem; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color);">
              <h3 style="font-size: 1.15rem; margin: 0;">Giỏ hàng (${cart.length} loại sản phẩm)</h3>
              <button type="button" class="btn btn-outline btn-sm" onclick="CartPage.clearAll()">Xóa tất cả</button>
            </div>
            <div style="overflow-x: auto;">
              <table class="cart-table">
                <thead>
                  <tr>
                    <th>Sản phẩm</th>
                    <th>Đơn giá</th>
                    <th>Số lượng</th>
                    <th>Thành tiền</th>
                    <th style="text-align: right;">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  ${tableRows}
                </tbody>
              </table>
            </div>
          </div>

          <div style="margin-top: 1.5rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
            <a href="products.html" class="btn btn-outline">
              ← Tiếp tục mua sắm
            </a>
          </div>
        </div>

        <!-- Order Summary Card -->
        <div>
          <div class="cart-summary-card">
            <h3 style="font-size: 1.2rem; margin-bottom: 1.25rem;">Tóm tắt đơn hàng</h3>

            <div class="summary-row">
              <span>Tạm tính:</span>
              <strong style="color: var(--text-main);">${App.formatVND(subtotal)}</strong>
            </div>

            <div class="summary-row">
              <span>Phí vận chuyển:</span>
              <span class="badge badge-success">Miễn phí giao hàng</span>
            </div>

            <div class="summary-row">
              <span>Ưu đãi sinh viên / Demo:</span>
              <span style="color: var(--success); font-weight: 600;">-0 ₫</span>
            </div>

            <div class="summary-row total">
              <span>Tổng thanh toán:</span>
              <span style="color: #EF4444;">${App.formatVND(grandTotal)}</span>
            </div>

            <p style="font-size: 0.8rem; color: var(--text-muted); margin: 1rem 0;">(Đã bao gồm VAT 8-10% và bảo hành chính hãng toàn quốc)</p>

            <a href="checkout.html" class="btn btn-primary btn-block btn-lg" style="margin-bottom: 0.75rem;">
              Tiến hành đặt hàng →
            </a>

            <div style="font-size: 0.8rem; color: var(--text-muted); text-align: center;">
              🔒 Thông tin thanh toán an toàn & bảo mật
            </div>
          </div>
        </div>
      </div>
    `;
  },

  updateQty(productId, newQty) {
    try {
      window.db.updateCartQty(productId, newQty);
      this.renderCart();
      App.updateCartBadge();
    } catch (err) {
      App.showToast(err.message, 'danger', 'Giỏ hàng');
    }
  },

  removeItem(productId) {
    App.confirmAction('Bạn có chắc chắn muốn bỏ sản phẩm này khỏi giỏ hàng?', () => {
      window.db.removeFromCart(productId);
      this.renderCart();
      App.updateCartBadge();
      App.showToast('Đã xóa sản phẩm khỏi giỏ hàng', 'info');
    }, 'Xóa sản phẩm');
  },

  clearAll() {
    App.confirmAction('Bạn có chắc chắn muốn xóa toàn bộ sản phẩm trong giỏ?', () => {
      window.db.clearCart();
      this.renderCart();
      App.updateCartBadge();
      App.showToast('Đã dọn sạch giỏ hàng', 'info');
    }, 'Xóa toàn bộ');
  }
};

window.CartPage = CartPage;
