/**
 * Store Anh - Orders & Order Tracking Controller
 */

function normalizeOrder(o) {
  if (!o) return null;
  return {
    ...o,
    id: o.order_code || o.orderCode || o.id,
    orderCode: o.order_code || o.orderCode || o.id,
    orderStatus: o.order_status || o.orderStatus,
    paymentMethod: o.payment_method || o.paymentMethod,
    paymentStatus: o.payment_status || o.paymentStatus,
    customerName: o.customer_name || o.customerName,
    customerPhone: o.customer_phone || o.customerPhone,
    customerEmail: o.customer_email || o.customerEmail,
    shippingAddress: o.shipping_address || o.shippingAddress,
    orderNote: o.order_note || o.orderNote,
    subtotal: Number(o.subtotal || 0),
    shippingFee: Number(o.shipping_fee || 0),
    total: Number(o.total || 0),
    createdAt: o.created_at || o.createdAt,
    items: (o.items || []).map(i => ({
      ...i,
      name: i.product_name || i.name,
      price: Number(i.product_price || i.price),
      quantity: Number(i.quantity),
      subtotal: Number(i.subtotal || (i.price * i.quantity)),
      image: i.image || (window.createTechPlaceholder ? window.createTechPlaceholder(i.product_name || i.name) : '')
    }))
  };
}

const OrdersPage = {
  currentFilterStatus: 'all',
  searchQuery: '',

  async init() {
    await this.renderOrders();
    this.bindEvents();
    this.checkNewOrderToast();
  },

  checkNewOrderToast() {
    const params = new URLSearchParams(window.location.search);
    const newOrderId = params.get('newOrder');
    if (newOrderId) {
      App.showToast(`Chúc mừng bạn đã đặt thành công đơn hàng <strong>#${newOrderId}</strong>!`, 'success', 'Đặt hàng thành công');
      // Clean query string
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  },

  bindEvents() {
    // Filter status tabs
    const tabBtns = document.querySelectorAll('.order-filter-tab');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentFilterStatus = btn.dataset.status || 'all';
        this.renderOrders();
      });
    });

    // Search order by ID
    const searchInput = document.getElementById('order-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.trim().toLowerCase();
        this.renderOrders();
      });
    }
  },

  getStatusBadge(status) {
    switch (status) {
      case 'cho_xac_nhan':
        return '<span class="badge badge-warning">⏳ Chờ xác nhận</span>';
      case 'dang_giao':
        return '<span class="badge badge-info">🚚 Đang giao hàng</span>';
      case 'da_giao':
        return '<span class="badge badge-success">✅ Đã giao thành công</span>';
      case 'da_huy':
        return '<span class="badge badge-danger">❌ Đã hủy</span>';
      default:
        return `<span class="badge badge-secondary">${status}</span>`;
    }
  },

  async renderOrders() {
    const listWrap = document.getElementById('orders-list-wrap');
    if (!listWrap) return;

    let orders = [];
    try {
      if (window.Api && window.Api.getOrders) {
        const queryParams = {};
        if (this.currentFilterStatus !== 'all') queryParams.status = this.currentFilterStatus;
        if (this.searchQuery) queryParams.q = this.searchQuery;

        // If guest, pass stored token if any
        try {
          const guestTokens = JSON.parse(localStorage.getItem('webbanmt_guest_tokens') || '[]');
          if (guestTokens.length > 0) {
            queryParams.token = guestTokens[guestTokens.length - 1].token;
          }
        } catch (e) {}

        const resOrders = await window.Api.getOrders(queryParams);
        orders = (resOrders || []).map(normalizeOrder);
      }
    } catch (err) {
      console.warn('Cannot fetch orders from API:', err);
    }

    if (orders.length === 0 && window.db && window.db.getOrders) {
      orders = (window.db.getOrders() || []).map(normalizeOrder);
      const user = window.auth ? window.auth.getCurrentUser() : null;
      if (user && user.role !== 'admin') {
        orders = orders.filter(o => o.userId === user.id || o.customerEmail === user.email);
      }
      if (this.currentFilterStatus !== 'all') {
        orders = orders.filter(o => o.orderStatus === this.currentFilterStatus);
      }
      if (this.searchQuery) {
        orders = orders.filter(o =>
          (o.id && o.id.toLowerCase().includes(this.searchQuery)) ||
          (o.customerPhone && o.customerPhone.includes(this.searchQuery))
        );
      }
    }

    if (orders.length === 0) {
      listWrap.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📦</div>
          <h3 class="empty-state-title">Chưa có đơn hàng nào</h3>
          <p class="empty-state-desc">Bạn chưa có đơn hàng nào ở trạng thái này. Hãy mua sắm ngay hôm nay để nhận nhiều ưu đãi.</p>
          <a href="products.html" class="btn btn-primary">Mua sắm ngay</a>
        </div>
      `;
      return;
    }

    listWrap.innerHTML = orders.map(order => {
      const isCancellable = order.orderStatus === 'cho_xac_nhan';
      const itemsListHtml = (order.items || []).map(item => `
        <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem;">
          <img src="${item.image}" alt="${item.name}" style="width: 48px; height: 48px; object-fit: contain; border-radius: var(--radius-xs); border: 1px solid var(--border-color); padding: 2px;">
          <div style="flex: 1;">
            <div style="font-size: 0.875rem; font-weight: 600; line-height: 1.2;">${item.name}</div>
            <div style="font-size: 0.775rem; color: var(--text-muted);">Số lượng: ${item.quantity} × ${App.formatVND(item.price)}</div>
          </div>
          <div style="font-weight: 700; font-size: 0.9rem;">
            ${App.formatVND(item.subtotal || item.price * item.quantity)}
          </div>
        </div>
      `).join('');

      return `
        <div class="order-card">
          <div class="order-header">
            <div>
              <span style="font-size: 1.05rem; font-weight: 700; color: var(--text-main); margin-right: 0.75rem;">
                Mã đơn: #${order.id}
              </span>
              <span style="font-size: 0.8rem; color: var(--text-muted);">
                Đặt ngày: ${App.formatDateTime(order.createdAt)}
              </span>
            </div>
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <span class="badge ${order.paymentMethod === 'VNPAY' ? 'badge-primary' : 'badge-secondary'}">
                ${order.paymentMethod} (${order.paymentStatus === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán'})
              </span>
              ${this.getStatusBadge(order.orderStatus)}
            </div>
          </div>

          <!-- Items list -->
          <div style="padding: 0.75rem 0; border-bottom: 1px solid var(--border-color);">
            ${itemsListHtml}
          </div>

          <!-- Footer details -->
          <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 1rem; flex-wrap: wrap; gap: 1rem;">
            <div style="font-size: 0.85rem; color: var(--text-muted);">
              Địa chỉ: <strong>${order.shippingAddress}</strong>
            </div>
            <div style="display: flex; align-items: center; gap: 1rem;">
              <div style="text-align: right;">
                <span style="font-size: 0.85rem; color: var(--text-muted);">Tổng tiền:</span>
                <span style="font-size: 1.25rem; font-weight: 800; color: #EF4444; margin-left: 0.5rem;">
                  ${App.formatVND(order.total)}
                </span>
              </div>
              <a href="order-detail.html?id=${order.id}" class="btn btn-outline btn-sm">Xem chi tiết</a>
              ${isCancellable ? `
                <button type="button" class="btn btn-danger btn-sm" onclick="OrdersPage.cancelOrder('${order.id}')">Hủy đơn</button>
              ` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  async cancelOrder(orderId) {
    App.confirmAction(`Bạn có chắc chắn muốn hủy đơn hàng #${orderId}? Sau khi hủy không thể hoàn tác.`, async () => {
      try {
        if (window.Api && window.Api.cancelOrder) {
          await window.Api.cancelOrder(orderId);
        } else if (window.db && window.db.updateOrderStatus) {
          window.db.updateOrderStatus(orderId, 'da_huy');
        }
        App.showToast(`Đã hủy thành công đơn hàng #${orderId}`, 'info', 'Đã hủy đơn');
        this.renderOrders();
      } catch (err) {
        App.showToast(err.message || 'Không thể hủy đơn hàng', 'danger', 'Lỗi hủy đơn');
      }
    }, 'Hủy đơn hàng');
  },

  /* --------------------------------------------------------------------------
     ORDER DETAIL PAGE
     -------------------------------------------------------------------------- */
  async initDetail() {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('id');
    let token = params.get('token') || '';

    if (!orderId) {
      window.location.href = 'orders.html';
      return;
    }

    if (!token) {
      try {
        const guestTokens = JSON.parse(localStorage.getItem('webbanmt_guest_tokens') || '[]');
        const found = guestTokens.find(t => t.orderCode === orderId);
        if (found) token = found.token;
      } catch (e) {}
    }

    let order = null;
    try {
      if (window.Api && window.Api.getOrderById) {
        const fetched = await window.Api.getOrderById(orderId, token);
        order = normalizeOrder(fetched);
      }
    } catch (err) {
      console.warn('API error fetching order detail:', err);
    }

    if (!order && window.db && window.db.getOrderById) {
      order = normalizeOrder(window.db.getOrderById(orderId));
    }

    if (!order) {
      document.getElementById('order-detail-content').innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">⚠️</div>
          <h2 class="empty-state-title">Không tìm thấy đơn hàng</h2>
          <p class="empty-state-desc">Đơn hàng không tồn tại hoặc bạn không có quyền xem đơn này.</p>
          <a href="orders.html" class="btn btn-primary">Quay lại danh sách đơn hàng</a>
        </div>
      `;
      return;
    }

    this.renderOrderDetail(order);
  },

  renderOrderDetail(order) {
    const container = document.getElementById('order-detail-content');
    if (!container) return;

    // Timeline calculation
    let step1 = 'completed';
    let step2 = '';
    let step3 = '';
    let step4 = '';

    if (order.orderStatus === 'dang_giao') {
      step2 = 'completed';
      step3 = 'active';
    } else if (order.orderStatus === 'da_giao') {
      step2 = 'completed';
      step3 = 'completed';
      step4 = 'completed';
    } else if (order.orderStatus === 'da_huy') {
      step2 = 'danger';
    } else {
      step2 = 'active'; // cho_xac_nhan
    }

    container.innerHTML = `
      <div class="breadcrumb">
        <a href="index.html">Trang chủ</a>
        <span class="breadcrumb-separator">/</span>
        <a href="orders.html">Đơn hàng của tôi</a>
        <span class="breadcrumb-separator">/</span>
        <span>Chi tiết #${order.id}</span>
      </div>

      <div class="card" style="padding: 2rem; margin-bottom: 2rem;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 1px solid var(--border-color);">
          <div>
            <h2 style="font-size: 1.5rem; margin-bottom: 0.25rem;">Chi tiết đơn hàng #${order.id}</h2>
            <p style="color: var(--text-muted); font-size: 0.85rem;">Ngày đặt hàng: ${App.formatDateTime(order.createdAt)}</p>
          </div>
          <div style="display: flex; gap: 0.75rem; align-items: center;">
            ${this.getStatusBadge(order.orderStatus)}
            <button class="btn btn-outline btn-sm" onclick="window.print()">🖨️ In đơn hàng</button>
          </div>
        </div>

        <!-- Order Tracking Timeline -->
        ${order.orderStatus !== 'da_huy' ? `
          <div class="order-timeline">
            <div class="timeline-step ${step1}">
              <div class="timeline-icon">1</div>
              <div class="timeline-label">Đã đặt hàng</div>
            </div>
            <div class="timeline-step ${step2}">
              <div class="timeline-icon">2</div>
              <div class="timeline-label">Xác nhận</div>
            </div>
            <div class="timeline-step ${step3}">
              <div class="timeline-icon">3</div>
              <div class="timeline-label">Đang giao</div>
            </div>
            <div class="timeline-step ${step4}">
              <div class="timeline-icon">4</div>
              <div class="timeline-label">Giao thành công</div>
            </div>
          </div>
        ` : `
          <div style="background: var(--danger-light); color: var(--danger-text); padding: 1rem; border-radius: var(--radius-md); margin-bottom: 1.5rem;">
            ⚠️ Đơn hàng này đã bị hủy. Nếu có thắc mắc hoặc cần khôi phục đặt lại, vui lòng liên hệ tổng đài 1800 6868.
          </div>
        `}

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-top: 2rem;">
          <!-- Recipient info -->
          <div style="background: var(--bg-subtle); padding: 1.25rem; border-radius: var(--radius-md);">
            <h4 style="font-size: 1rem; margin-bottom: 0.75rem;">Thông tin giao hàng</h4>
            <p><strong>Họ tên:</strong> ${order.customerName}</p>
            <p><strong>Số điện thoại:</strong> ${order.customerPhone}</p>
            <p><strong>Email:</strong> ${order.customerEmail}</p>
            <p><strong>Địa chỉ:</strong> ${order.shippingAddress}</p>
            ${order.orderNote ? `<p><strong>Ghi chú:</strong> ${order.orderNote}</p>` : ''}
          </div>

          <!-- Payment info -->
          <div style="background: var(--bg-subtle); padding: 1.25rem; border-radius: var(--radius-md);">
            <h4 style="font-size: 1rem; margin-bottom: 0.75rem;">Thông tin thanh toán</h4>
            <p><strong>Hình thức:</strong> ${order.paymentMethod === 'VNPAY' ? 'Thanh toán trực tuyến VNPAY' : 'Thanh toán khi nhận hàng (COD)'}</p>
            <p><strong>Trạng thái tiền:</strong> ${order.paymentStatus === 'paid' ? '<span class="badge badge-success">Đã thanh toán</span>' : '<span class="badge badge-warning">Chờ thanh toán</span>'}</p>
            ${order.transactionNo ? `<p><strong>Mã GD VNPAY:</strong> <code>${order.transactionNo}</code></p>` : ''}
            ${order.deliveredAt ? `<p><strong>Ngày nhận hàng:</strong> ${App.formatDateTime(order.deliveredAt)}</p>` : ''}
          </div>
        </div>

        <!-- Items table -->
        <h3 style="margin-top: 2rem; margin-bottom: 1rem; font-size: 1.15rem;">Sản phẩm trong đơn</h3>
        <table class="admin-data-table" style="border: 1px solid var(--border-color); border-radius: var(--radius-sm);">
          <thead>
            <tr>
              <th>Sản phẩm</th>
              <th>Đơn giá</th>
              <th style="text-align: center;">Số lượng</th>
              <th style="text-align: right;">Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            ${(order.items || []).map(i => `
              <tr>
                <td>
                  <div style="display:flex; align-items:center; gap:0.75rem;">
                    <img src="${i.image}" alt="${i.name}" style="width: 44px; height: 44px; object-fit: contain;">
                    <span style="font-weight: 600;">${i.name}</span>
                  </div>
                </td>
                <td>${App.formatVND(i.price)}</td>
                <td style="text-align: center;">${i.quantity}</td>
                <td style="text-align: right; font-weight: 700; color: #EF4444;">${App.formatVND(i.subtotal || i.price * i.quantity)}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="3" style="text-align: right; font-weight: 600;">Tạm tính:</td>
              <td style="text-align: right; font-weight: 600;">${App.formatVND(order.subtotal || order.total)}</td>
            </tr>
            <tr>
              <td colspan="3" style="text-align: right; font-weight: 600;">Phí vận chuyển:</td>
              <td style="text-align: right; color: var(--success); font-weight: 600;">Miễn phí</td>
            </tr>
            <tr>
              <td colspan="3" style="text-align: right; font-weight: 800; font-size: 1.1rem;">Tổng thanh toán:</td>
              <td style="text-align: right; font-weight: 800; font-size: 1.25rem; color: #EF4444;">${App.formatVND(order.total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    `;
  }
};

window.OrdersPage = OrdersPage;
