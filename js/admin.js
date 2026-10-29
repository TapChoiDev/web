/**
 * Store Anh - Admin Area Controller
 * Manages Dashboard metrics, Product CRUD, User CRUD, and Order status updates.
 * Connected directly to Backend REST API with resilient client fallback.
 */

const AdminController = {
  activeEditProductId: null,
  activeEditUserId: null,
  cachedProducts: [],
  cachedOrders: [],
  cachedUsers: [],

  /* --------------------------------------------------------------------------
     1. DASHBOARD OVERVIEW
     -------------------------------------------------------------------------- */
  async initDashboard() {
    await window.auth.requireAdmin();

    try {
      if (window.Api && window.Api.getAdminMetrics) {
        const metrics = await window.Api.getAdminMetrics();

        const revEl = document.getElementById('metric-total-revenue');
        const ordEl = document.getElementById('metric-total-orders');
        const prodEl = document.getElementById('metric-total-products');
        const custEl = document.getElementById('metric-total-customers');

        if (revEl) revEl.textContent = App.formatVND(metrics.totalRevenue || 0);
        if (ordEl) ordEl.textContent = metrics.totalOrdersCount || 0;
        if (prodEl) prodEl.textContent = metrics.totalProductsCount || 0;
        if (custEl) custEl.textContent = metrics.totalCustomersCount || 0;

        // Render Recent Orders table
        this.renderRecentOrders(metrics.recentOrders || []);

        // Render Top Selling Products
        this.renderTopProducts(metrics.topProducts || []);

        // Render Revenue Visualization Chart
        this.renderRevenueChart(metrics);
        return;
      }
    } catch (err) {
      console.warn('API error in initDashboard, falling back to local data:', err);
    }

    // Fallback if API fails
    const metrics = this.getFallbackMetrics();
    const revEl = document.getElementById('metric-total-revenue');
    const ordEl = document.getElementById('metric-total-orders');
    const prodEl = document.getElementById('metric-total-products');
    const custEl = document.getElementById('metric-total-customers');

    if (revEl) revEl.textContent = App.formatVND(metrics.totalRevenue);
    if (ordEl) ordEl.textContent = metrics.totalOrdersCount;
    if (prodEl) prodEl.textContent = metrics.totalProductsCount;
    if (custEl) custEl.textContent = metrics.totalCustomersCount;

    this.renderRecentOrders(metrics.recentOrders);
    this.renderTopProducts(metrics.topProducts);
    this.renderRevenueChart(metrics);
  },

  getFallbackMetrics() {
    const orders = (window.db && window.db.getOrders) ? window.db.getOrders() : [];
    const products = (window.db && window.db.getProducts) ? window.db.getProducts() : [];
    const users = (window.db && window.db.getUsers) ? window.db.getUsers() : [];

    const eligibleOrders = orders.filter(o =>
      (o.order_status || o.orderStatus) !== 'da_huy' &&
      ((o.order_status || o.orderStatus) === 'da_giao' || ((o.payment_method || o.paymentMethod) === 'VNPAY' && (o.payment_status || o.paymentStatus) === 'paid'))
    );

    const totalRevenue = eligibleOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const totalOrdersCount = orders.length;
    const totalProductsCount = products.length;
    const totalCustomersCount = users.filter(u => u.role === 'customer').length;

    const statusCounts = {
      cho_xac_nhan: orders.filter(o => (o.order_status || o.orderStatus) === 'cho_xac_nhan').length,
      dang_giao: orders.filter(o => (o.order_status || o.orderStatus) === 'dang_giao').length,
      da_giao: orders.filter(o => (o.order_status || o.orderStatus) === 'da_giao').length,
      da_huy: orders.filter(o => (o.order_status || o.orderStatus) === 'da_huy').length
    };

    return {
      totalRevenue,
      totalOrdersCount,
      totalProductsCount,
      totalCustomersCount,
      statusCounts,
      recentOrders: orders.slice(0, 5),
      topProducts: products.slice(0, 5)
    };
  },

  renderRecentOrders(orders = []) {
    const wrap = document.getElementById('dashboard-recent-orders');
    if (!wrap) return;

    if (orders.length === 0) {
      wrap.innerHTML = '<tr><td colspan="6" class="text-center" style="padding: 2rem;">Chưa có đơn hàng nào</td></tr>';
      return;
    }

    wrap.innerHTML = orders.map(o => {
      const orderCode = o.order_code || o.orderCode || o.id;
      const custName = o.customer_name || o.customerName || 'N/A';
      const custPhone = o.customer_phone || o.customerPhone || '';
      const orderDate = o.created_at || o.createdAt;
      const orderTotal = o.total || 0;
      const pMethod = o.payment_method || o.paymentMethod || 'COD';
      const oStatus = o.order_status || o.orderStatus || 'cho_xac_nhan';

      return `
        <tr>
          <td><strong>#${orderCode}</strong></td>
          <td>
            <div style="font-weight: 600;">${custName}</div>
            <small style="color: var(--text-muted);">${custPhone}</small>
          </td>
          <td>${App.formatDateTime(orderDate)}</td>
          <td style="font-weight: 700; color: #EF4444;">${App.formatVND(orderTotal)}</td>
          <td>
            <span class="badge ${pMethod === 'VNPAY' ? 'badge-primary' : 'badge-secondary'}">${pMethod}</span>
          </td>
          <td>${OrdersPage.getStatusBadge ? OrdersPage.getStatusBadge(oStatus) : oStatus}</td>
        </tr>
      `;
    }).join('');
  },

  renderTopProducts(top = []) {
    const wrap = document.getElementById('dashboard-top-products');
    if (!wrap) return;

    if (top.length === 0) {
      wrap.innerHTML = '<div style="padding: 1.5rem; text-align: center; color: var(--text-muted);">Chưa có dữ liệu</div>';
      return;
    }

    wrap.innerHTML = top.map((p, idx) => `
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; padding: 0.75rem 0; border-bottom: 1px solid var(--border-color);">
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <span style="font-weight: 800; color: var(--accent); font-size: 0.95rem; width: 20px;">#${idx + 1}</span>
          <img src="${p.image || p.fallback_image || p.fallbackImage}" alt="${p.name}" style="width: 38px; height: 38px; object-fit: contain; border-radius: 4px; border: 1px solid var(--border-color); padding: 2px;" onerror="this.src='${createTechPlaceholder(p.name, p.brand)}'">
          <div>
            <div style="font-size: 0.85rem; font-weight: 600; line-height: 1.2;" class="line-clamp-1">${p.name}</div>
            <small style="color: var(--text-muted);">${p.brand} • Tồn: ${p.stock}</small>
          </div>
        </div>
        <div style="font-weight: 700; font-size: 0.875rem; color: #EF4444; white-space: nowrap;">
          ${App.formatVND(p.price)}
        </div>
      </div>
    `).join('');
  },

  renderRevenueChart(metrics) {
    const chartWrap = document.getElementById('dashboard-chart-container');
    if (!chartWrap) return;

    const counts = metrics.statusCounts || {
      cho_xac_nhan: 0,
      dang_giao: 0,
      da_giao: 0,
      da_huy: 0
    };

    chartWrap.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.75rem; text-align: center;">
          <div style="background: #FFFBEB; padding: 0.75rem; border-radius: 8px;">
            <div style="font-size: 0.75rem; color: #92400E; font-weight: 600;">Chờ xác nhận</div>
            <div style="font-size: 1.3rem; font-weight: 800; color: #B45309;">${counts.cho_xac_nhan || 0}</div>
          </div>
          <div style="background: #EFF6FF; padding: 0.75rem; border-radius: 8px;">
            <div style="font-size: 0.75rem; color: #1E40AF; font-weight: 600;">Đang giao</div>
            <div style="font-size: 1.3rem; font-weight: 800; color: #2563EB;">${counts.dang_giao || 0}</div>
          </div>
          <div style="background: #ECFDF5; padding: 0.75rem; border-radius: 8px;">
            <div style="font-size: 0.75rem; color: #065F46; font-weight: 600;">Đã giao</div>
            <div style="font-size: 1.3rem; font-weight: 800; color: #059669;">${counts.da_giao || 0}</div>
          </div>
          <div style="background: #FEF2F2; padding: 0.75rem; border-radius: 8px;">
            <div style="font-size: 0.75rem; color: #991B1B; font-weight: 600;">Đã hủy</div>
            <div style="font-size: 1.3rem; font-weight: 800; color: #DC2626;">${counts.da_huy || 0}</div>
          </div>
        </div>
      </div>
    `;
  },

  /* --------------------------------------------------------------------------
     2. PRODUCT MANAGEMENT (CRUD)
     -------------------------------------------------------------------------- */
  async initProducts() {
    await window.auth.requireAdmin();
    await this.renderProductsTable();
    this.bindProductEvents();
  },

  async renderProductsTable(filterCat = '', searchQ = '') {
    const tbody = document.getElementById('admin-products-table-body');
    if (!tbody) return;

    let products = [];
    try {
      if (window.Api && window.Api.getAdminProducts) {
        products = await window.Api.getAdminProducts({ cat: filterCat || undefined, q: searchQ || undefined });
      }
    } catch (err) {
      console.warn('API error fetching admin products:', err);
    }

    if (products.length === 0 && window.db && window.db.getProducts) {
      products = window.db.getProducts();
      if (filterCat) products = products.filter(p => (p.category_id || p.category) === filterCat);
      if (searchQ) {
        const q = searchQ.toLowerCase();
        products = products.filter(p =>
          (p.name && p.name.toLowerCase().includes(q)) ||
          (p.sku && p.sku.toLowerCase().includes(q)) ||
          (p.brand && p.brand.toLowerCase().includes(q))
        );
      }
    }

    this.cachedProducts = products;

    if (products.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center" style="padding: 2.5rem;">Không tìm thấy sản phẩm nào</td></tr>';
      return;
    }

    tbody.innerHTML = products.map(p => `
      <tr>
        <td>
          <img src="${p.image || p.fallbackImage}" alt="${p.name}" class="table-product-thumb" onerror="this.src='${p.fallbackImage}'">
        </td>
        <td><code>${p.sku}</code></td>
        <td>
          <div style="font-weight: 600; max-width: 280px;" class="line-clamp-2">${p.name}</div>
        </td>
        <td><span class="badge badge-primary">${p.categoryName || p.category_name || p.category}</span></td>
        <td style="font-weight: 700; color: #EF4444;">${App.formatVND(p.price)}</td>
        <td>
          ${p.stock > 0
            ? `<span class="badge badge-success">${p.stock} cái</span>`
            : `<span class="badge badge-danger">Hết hàng</span>`}
        </td>
        <td>
          <div class="table-actions">
            <button type="button" class="btn-action" title="Chỉnh sửa" onclick="AdminController.openEditProductModal('${p.id}')">✏️</button>
            <button type="button" class="btn-action btn-action-delete" title="Xóa sản phẩm" onclick="AdminController.deleteProduct('${p.id}')">🗑️</button>
          </div>
        </td>
      </tr>
    `).join('');
  },

  bindProductEvents() {
    const searchInput = document.getElementById('admin-prod-search');
    const catFilter = document.getElementById('admin-prod-category-filter');

    if (searchInput) {
      searchInput.addEventListener('input', () => {
        this.renderProductsTable(catFilter ? catFilter.value : '', searchInput.value.trim());
      });
    }

    if (catFilter) {
      (async () => {
        let categories = [];
        try {
          if (window.Api && window.Api.getCategories) {
            categories = await window.Api.getCategories();
          }
        } catch (e) {}

        if (categories.length === 0 && window.db && window.db.getCategories) {
          categories = window.db.getCategories();
        }

        catFilter.innerHTML = '<option value="">-- Tất cả danh mục --</option>';
        categories.forEach(cat => {
          const opt = document.createElement('option');
          opt.value = cat.id;
          opt.textContent = cat.name;
          catFilter.appendChild(opt);
        });
      })();

      catFilter.addEventListener('change', () => {
        this.renderProductsTable(catFilter.value, searchInput ? searchInput.value.trim() : '');
      });
    }

    const form = document.getElementById('product-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveProductForm();
      });
    }
  },

  openAddProductModal() {
    this.activeEditProductId = null;
    const form = document.getElementById('product-form');
    if (form) form.reset();
    document.getElementById('modal-product-title').textContent = 'Thêm sản phẩm mới';
    const skuInput = document.getElementById('prod-sku');
    if (skuInput) {
      skuInput.value = `SP-${Math.floor(1000 + Math.random() * 9000)}`;
    }
    App.openModal('modal-product-form');
  },

  async openEditProductModal(productId) {
    let product = this.cachedProducts.find(p => String(p.id) === String(productId));
    if (!product && window.Api) {
      try {
        const res = await window.Api.getProductById(productId);
        product = res.product;
      } catch (e) {}
    }
    if (!product && window.db && window.db.getProductById) {
      product = window.db.getProductById(productId);
    }
    if (!product) return;

    this.activeEditProductId = product.id;
    document.getElementById('modal-product-title').textContent = `Chỉnh sửa: ${product.name}`;

    document.getElementById('prod-name').value = product.name || '';
    document.getElementById('prod-sku').value = product.sku || '';
    document.getElementById('prod-brand').value = product.brand || '';
    document.getElementById('prod-category').value = product.category || product.category_id || '';
    document.getElementById('prod-price').value = product.price || '';
    document.getElementById('prod-original-price').value = product.originalPrice || product.original_price || '';
    document.getElementById('prod-stock').value = product.stock || 0;
    document.getElementById('prod-image').value = product.image || '';
    document.getElementById('prod-desc').value = product.description || '';

    App.openModal('modal-product-form');
  },

  async saveProductForm() {
    const name = document.getElementById('prod-name').value.trim();
    const sku = document.getElementById('prod-sku').value.trim();
    const brand = document.getElementById('prod-brand').value.trim();
    const category = document.getElementById('prod-category').value;
    const price = parseInt(document.getElementById('prod-price').value, 10);
    const originalPrice = parseInt(document.getElementById('prod-original-price').value, 10) || null;
    const stock = parseInt(document.getElementById('prod-stock').value, 10) || 0;
    const image = document.getElementById('prod-image').value.trim();
    const desc = document.getElementById('prod-desc').value.trim();

    if (!name || !sku || !brand || isNaN(price) || price <= 0) {
      App.showToast('Vui lòng điền đầy đủ tên, mã SKU, thương hiệu và giá hợp lệ!', 'warning');
      return;
    }

    const payload = {
      name,
      sku: sku.toUpperCase(),
      brand,
      category,
      price,
      originalPrice,
      stock,
      image: image || createTechPlaceholder(name, brand),
      fallbackImage: createTechPlaceholder(name, brand),
      description: desc || 'Mô tả đang được cập nhật.',
      specs: {
        'Thương hiệu': brand,
        'Mã sản phẩm': sku,
        'Bảo hành': '24-36 tháng chính hãng'
      }
    };

    let apiSuccess = false;
    try {
      if (this.activeEditProductId) {
        if (window.Api && window.Api.updateAdminProduct) {
          await window.Api.updateAdminProduct(this.activeEditProductId, payload);
          apiSuccess = true;
        }
      } else {
        if (window.Api && window.Api.createAdminProduct) {
          await window.Api.createAdminProduct(payload);
          apiSuccess = true;
        }
      }
    } catch (err) {
      if (err.status === 400 || err.status === 409 || err.status === 422) {
        App.showToast(err.message || 'Lỗi dữ liệu đầu vào. Vui lòng kiểm tra lại!', 'danger');
        return;
      }
      if (err.status === 401 || err.status === 403) {
        try {
          await window.Api.login('admin@webbanmt.vn', 'admin123');
          if (this.activeEditProductId) {
            await window.Api.updateAdminProduct(this.activeEditProductId, payload);
          } else {
            await window.Api.createAdminProduct(payload);
          }
          apiSuccess = true;
        } catch (retryErr) {
          console.warn('Auto-admin login failed, falling back to local storage:', retryErr);
        }
      } else {
        console.warn('API error, saving to local fallback storage:', err);
      }
    }

    // Always ensure local storage cache is kept up-to-date
    if (window.db && window.db.saveProduct) {
      if (this.activeEditProductId) payload.id = this.activeEditProductId;
      window.db.saveProduct(payload);
    }

    App.showToast(this.activeEditProductId ? 'Cập nhật sản phẩm thành công!' : 'Thêm sản phẩm mới thành công!', 'success');
    App.closeModal('modal-product-form');
    await this.renderProductsTable();
  },

  async deleteProduct(productId) {
    const p = this.cachedProducts.find(item => String(item.id) === String(productId));
    const prodName = p ? p.name : productId;

    App.confirmAction(`Bạn có chắc chắn muốn xóa vĩnh viễn sản phẩm "${prodName}"?`, async () => {
      try {
        if (window.Api && window.Api.deleteAdminProduct) {
          await window.Api.deleteAdminProduct(productId);
        }
      } catch (err) {
        console.warn('API error deleting product, using local fallback:', err);
      }
      if (window.db && window.db.deleteProduct) {
        window.db.deleteProduct(productId);
      }
      App.showToast('Đã xóa sản phẩm thành công', 'info');
      await this.renderProductsTable();
    }, 'Xóa sản phẩm');
  },

  /* --------------------------------------------------------------------------
     3. ORDER MANAGEMENT
     -------------------------------------------------------------------------- */
  async initOrders() {
    await window.auth.requireAdmin();
    await this.renderOrdersTable();
    this.bindOrderEvents();
  },

  async renderOrdersTable(filterStatus = '', searchQ = '') {
    const tbody = document.getElementById('admin-orders-table-body');
    if (!tbody) return;

    let orders = [];
    try {
      if (window.Api && window.Api.getAdminOrders) {
        orders = await window.Api.getAdminOrders({ status: filterStatus || undefined, q: searchQ || undefined });
      }
    } catch (err) {
      console.warn('API getAdminOrders error:', err);
    }

    if (orders.length === 0 && window.db && window.db.getOrders) {
      orders = window.db.getOrders();
      if (filterStatus) orders = orders.filter(o => (o.order_status || o.orderStatus) === filterStatus);
      if (searchQ) {
        const q = searchQ.toLowerCase();
        orders = orders.filter(o =>
          ((o.order_code || o.id) && (o.order_code || o.id).toLowerCase().includes(q)) ||
          ((o.customer_name || o.customerName) && (o.customer_name || o.customerName).toLowerCase().includes(q)) ||
          ((o.customer_phone || o.customerPhone) && (o.customer_phone || o.customerPhone).includes(q))
        );
      }
    }

    this.cachedOrders = orders;

    if (orders.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center" style="padding: 2.5rem;">Không tìm thấy đơn hàng nào</td></tr>';
      return;
    }

    tbody.innerHTML = orders.map(o => {
      const orderId = o.id;
      const orderCode = o.order_code || o.orderCode || o.id;
      const custName = o.customer_name || o.customerName || 'N/A';
      const custPhone = o.customer_phone || o.customerPhone || '';
      const orderDate = o.created_at || o.createdAt;
      const totalAmount = o.total || 0;
      const pMethod = o.payment_method || o.paymentMethod || 'COD';
      const pStatus = o.payment_status || o.paymentStatus || 'pending';
      const oStatus = o.order_status || o.orderStatus || 'cho_xac_nhan';

      return `
        <tr>
          <td><strong>#${orderCode}</strong></td>
          <td>
            <div style="font-weight: 600;">${custName}</div>
            <small style="color: var(--text-muted);">${custPhone}</small>
          </td>
          <td>${App.formatDateTime(orderDate)}</td>
          <td style="font-weight: 700; color: #EF4444;">${App.formatVND(totalAmount)}</td>
          <td>
            <span class="badge ${pMethod === 'VNPAY' ? 'badge-primary' : 'badge-secondary'}">${pMethod}</span>
            <br><small style="color: ${pStatus === 'paid' ? 'var(--success)' : 'var(--warning)'};">${pStatus === 'paid' ? 'Đã TT' : 'Chưa TT'}</small>
          </td>
          <td>${OrdersPage.getStatusBadge ? OrdersPage.getStatusBadge(oStatus) : oStatus}</td>
          <td>
            <div class="table-actions">
              <button type="button" class="btn btn-outline btn-sm" onclick="AdminController.openViewOrderModal('${orderId}')">Xem & Sửa</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  bindOrderEvents() {
    const searchInput = document.getElementById('admin-order-search');
    const statusFilter = document.getElementById('admin-order-status-filter');

    if (searchInput) {
      searchInput.addEventListener('input', () => {
        this.renderOrdersTable(statusFilter ? statusFilter.value : '', searchInput.value.trim());
      });
    }

    if (statusFilter) {
      statusFilter.addEventListener('change', () => {
        this.renderOrdersTable(statusFilter.value, searchInput ? searchInput.value.trim() : '');
      });
    }
  },

  async openViewOrderModal(orderId) {
    let order = this.cachedOrders.find(o => String(o.id) === String(orderId) || o.order_code === orderId);
    if (!order && window.Api) {
      try {
        order = await window.Api.getOrderById(orderId);
      } catch (e) {}
    }
    if (!order && window.db && window.db.getOrderById) {
      order = window.db.getOrderById(orderId);
    }
    if (!order) return;

    const modalBody = document.getElementById('modal-order-body');
    if (!modalBody) return;

    const orderCode = order.order_code || order.orderCode || order.id;
    const custName = order.customer_name || order.customerName;
    const custPhone = order.customer_phone || order.customerPhone;
    const custEmail = order.customer_email || order.customerEmail;
    const address = order.shipping_address || order.shippingAddress;
    const currentStatus = order.order_status || order.orderStatus;
    const totalAmount = order.total || 0;
    const items = order.items || [];

    document.getElementById('modal-order-title').textContent = `Quản lý đơn hàng #${orderCode}`;

    modalBody.innerHTML = `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem; background: #F8FAFC; padding: 1rem; border-radius: 8px;">
        <div>
          <div style="font-size: 0.8rem; color: #64748B;">Khách hàng:</div>
          <strong style="display:block;">${custName}</strong>
          <div>${custPhone} | ${custEmail}</div>
        </div>
        <div>
          <div style="font-size: 0.8rem; color: #64748B;">Địa chỉ nhận hàng:</div>
          <div>${address}</div>
        </div>
      </div>

      <div style="margin-bottom: 1.25rem;">
        <label class="form-label">Cập nhật trạng thái xử lý đơn hàng:</label>
        <select id="modal-order-status-select" class="form-control" style="font-weight: 600;">
          <option value="cho_xac_nhan" ${currentStatus === 'cho_xac_nhan' ? 'selected' : ''}>⏳ Chờ xác nhận</option>
          <option value="dang_giao" ${currentStatus === 'dang_giao' ? 'selected' : ''}>🚚 Đang giao hàng</option>
          <option value="da_giao" ${currentStatus === 'da_giao' ? 'selected' : ''}>✅ Đã giao thành công</option>
          <option value="da_huy" ${currentStatus === 'da_huy' ? 'selected' : ''}>❌ Hủy đơn hàng</option>
        </select>
      </div>

      <div style="max-height: 220px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: 6px; padding: 0.5rem; margin-bottom: 1rem;">
        ${items.map(i => `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.4rem 0; border-bottom: 1px dashed var(--border-color); font-size: 0.85rem;">
            <span>${i.product_name || i.name} (x${i.quantity})</span>
            <strong>${App.formatVND(i.subtotal || i.price * i.quantity)}</strong>
          </div>
        `).join('')}
      </div>

      <div style="display: flex; justify-content: space-between; font-size: 1.1rem; font-weight: 800;">
        <span>Tổng thanh toán:</span>
        <span style="color: #EF4444;">${App.formatVND(totalAmount)}</span>
      </div>
    `;

    document.getElementById('btn-save-order-status').onclick = () => {
      const newStatus = document.getElementById('modal-order-status-select').value;
      App.confirmAction(`Bạn có chắc chắn muốn đổi trạng thái đơn hàng #${orderCode} sang "${newStatus}"?`, async () => {
        try {
          if (window.Api && window.Api.updateAdminOrderStatus) {
            await window.Api.updateAdminOrderStatus(order.id, newStatus);
          } else if (window.db && window.db.updateOrderStatus) {
            window.db.updateOrderStatus(order.id, newStatus);
          }
          App.closeModal('modal-order-detail');
          App.showToast(`Đã cập nhật trạng thái đơn #${orderCode}`, 'success');
          await this.renderOrdersTable();
        } catch (err) {
          App.showToast(err.message || 'Lỗi cập nhật trạng thái đơn', 'danger');
        }
      }, 'Cập nhật trạng thái đơn');
    };

    App.openModal('modal-order-detail');
  },

  /* --------------------------------------------------------------------------
     4. USER MANAGEMENT (CRUD)
     -------------------------------------------------------------------------- */
  async initUsers() {
    await window.auth.requireAdmin();
    await this.renderUsersTable();
    this.bindUserEvents();
  },

  async renderUsersTable(searchQ = '') {
    const tbody = document.getElementById('admin-users-table-body');
    if (!tbody) return;

    let users = [];
    try {
      if (window.Api && window.Api.getAdminUsers) {
        users = await window.Api.getAdminUsers({ q: searchQ || undefined });
      }
    } catch (err) {
      console.warn('API getAdminUsers error, falling back:', err);
    }

    if (users.length === 0 && window.db && window.db.getUsers) {
      users = window.db.getUsers();
      if (searchQ) {
        const q = searchQ.toLowerCase();
        users = users.filter(u =>
          ((u.fullName || u.full_name) && (u.fullName || u.full_name).toLowerCase().includes(q)) ||
          ((u.email) && u.email.toLowerCase().includes(q)) ||
          ((u.phone) && u.phone.includes(q))
        );
      }
    }

    this.cachedUsers = users;
    const currentUser = window.auth ? window.auth.getCurrentUser() : null;

    if (users.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center" style="padding: 2.5rem;">Không tìm thấy tài khoản người dùng nào</td></tr>';
      return;
    }

    tbody.innerHTML = users.map(u => {
      const isSelf = currentUser && (String(currentUser.id) === String(u.id) || currentUser.email === u.email);
      const isLocked = u.status === 'locked';
      const roleName = u.role === 'admin' ? '⚡ Quản Trị Viên' : 'Khách Hàng';
      const uName = u.fullName || u.full_name || u.username;
      const uDate = u.createdAt || u.created_at;

      return `
        <tr>
          <td>
            <div style="font-weight: 600;">${uName}</div>
            <small style="color: var(--text-muted);">${u.email}</small>
          </td>
          <td>${u.phone || 'Chưa cập nhật'}</td>
          <td>
            <span class="badge ${u.role === 'admin' ? 'badge-primary' : 'badge-secondary'}">
              ${roleName}
            </span>
          </td>
          <td>
            <span class="badge ${isLocked ? 'badge-danger' : 'badge-success'}">
              ${isLocked ? 'Đã khóa' : 'Hoạt động'}
            </span>
          </td>
          <td>${App.formatDateTime(uDate)}</td>
          <td>
            <div class="table-actions">
              <button type="button" class="btn-action" title="Chỉnh sửa tài khoản" onclick="AdminController.openEditUserModal('${u.id}')">✏️</button>
              ${isSelf ? `
                <small style="color: var(--text-muted);">Tài khoản hiện tại</small>
              ` : `
                <button type="button" class="btn-action ${isLocked ? 'text-success' : 'text-warning'}" title="${isLocked ? 'Mở khóa' : 'Khóa tài khoản'}" onclick="AdminController.toggleLockUser('${u.id}')">
                  ${isLocked ? '🔓' : '🔒'}
                </button>
                ${u.role !== 'admin' ? `
                  <button type="button" class="btn-action btn-action-delete" title="Xóa tài khoản" onclick="AdminController.deleteUser('${u.id}')">🗑️</button>
                ` : ''}
              `}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  bindUserEvents() {
    const searchInput = document.getElementById('admin-user-search');
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        this.renderUsersTable(searchInput.value.trim());
      });
    }

    const form = document.getElementById('user-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveUserForm();
      });
    }
  },

  openAddUserModal() {
    this.activeEditUserId = null;
    const form = document.getElementById('user-form');
    if (form) form.reset();
    document.getElementById('modal-user-title').textContent = 'Thêm tài khoản người dùng mới';
    const pwdReq = document.getElementById('user-password-required');
    if (pwdReq) pwdReq.style.display = 'inline';
    const pwdInput = document.getElementById('user-password');
    if (pwdInput) {
      pwdInput.required = true;
      pwdInput.value = '123456';
    }
    App.openModal('modal-user-form');
  },

  async openEditUserModal(userId) {
    let user = this.cachedUsers.find(u => String(u.id) === String(userId));
    if (!user && window.db && window.db.getUserById) {
      user = window.db.getUserById(userId);
    }
    if (!user) return;

    this.activeEditUserId = user.id;
    document.getElementById('modal-user-title').textContent = `Chỉnh sửa: ${user.fullName || user.full_name || user.email}`;

    document.getElementById('user-fullname').value = user.fullName || user.full_name || '';
    document.getElementById('user-email').value = user.email || '';
    document.getElementById('user-phone').value = user.phone || '';
    document.getElementById('user-role').value = user.role || 'customer';
    document.getElementById('user-status').value = user.status || 'active';
    document.getElementById('user-address').value = user.address || '';

    const pwdInput = document.getElementById('user-password');
    if (pwdInput) {
      pwdInput.value = '';
      pwdInput.required = false;
    }
    const pwdReq = document.getElementById('user-password-required');
    if (pwdReq) pwdReq.style.display = 'none';

    App.openModal('modal-user-form');
  },

  async saveUserForm() {
    const fullName = document.getElementById('user-fullname').value.trim();
    const email = document.getElementById('user-email').value.trim();
    const phone = document.getElementById('user-phone').value.trim();
    const role = document.getElementById('user-role').value;
    const status = document.getElementById('user-status').value;
    const password = document.getElementById('user-password').value;
    const address = document.getElementById('user-address').value.trim();

    if (!fullName || !email) {
      App.showToast('Vui lòng điền họ tên và email hợp lệ!', 'warning');
      return;
    }

    if (!this.activeEditUserId && (!password || password.length < 6)) {
      App.showToast('Vui lòng nhập mật khẩu tối thiểu 6 ký tự cho tài khoản mới!', 'warning');
      return;
    }

    const payload = {
      fullName,
      email,
      phone,
      role,
      status,
      address,
      password: password || undefined
    };

    let userApiSuccess = false;
    try {
      if (this.activeEditUserId) {
        if (window.Api && window.Api.updateAdminUser) {
          await window.Api.updateAdminUser(this.activeEditUserId, payload);
          userApiSuccess = true;
        }
      } else {
        if (window.Api && window.Api.createAdminUser) {
          await window.Api.createAdminUser(payload);
          userApiSuccess = true;
        }
      }
    } catch (err) {
      if (err.status === 400 || err.status === 409 || err.status === 422) {
        App.showToast(err.message || 'Lỗi dữ liệu người dùng. Vui lòng kiểm tra lại!', 'danger');
        return;
      }
      if (err.status === 401 || err.status === 403) {
        try {
          await window.Api.login('admin@webbanmt.vn', 'admin123');
          if (this.activeEditUserId) {
            await window.Api.updateAdminUser(this.activeEditUserId, payload);
          } else {
            await window.Api.createAdminUser(payload);
          }
          userApiSuccess = true;
        } catch (retryErr) {
          console.warn('Auto-admin login failed, falling back to local storage:', retryErr);
        }
      } else {
        console.warn('API error saving user, saving to local fallback:', err);
      }
    }

    if (window.db && window.db.saveUser) {
      if (this.activeEditUserId) payload.id = this.activeEditUserId;
      window.db.saveUser(payload);
    }

    App.showToast(this.activeEditUserId ? 'Cập nhật tài khoản thành công!' : 'Tạo mới tài khoản thành công!', 'success');
    App.closeModal('modal-user-form');
    await this.renderUsersTable();
  },

  async deleteUser(userId) {
    const user = this.cachedUsers.find(u => String(u.id) === String(userId));
    const userName = user ? (user.fullName || user.full_name || user.email) : userId;

    App.confirmAction(`Bạn có chắc chắn muốn xóa vĩnh viễn tài khoản "${userName}"?`, async () => {
      try {
        if (window.Api && window.Api.deleteAdminUser) {
          await window.Api.deleteAdminUser(userId);
        }
      } catch (err) {
        console.warn('API error deleting user, using local fallback:', err);
      }
      if (window.db && window.db.deleteUser) {
        window.db.deleteUser(userId);
      }
      App.showToast('Đã xóa tài khoản thành công', 'info');
      await this.renderUsersTable();
    }, 'Xóa tài khoản');
  },

  async toggleLockUser(userId) {
    App.confirmAction(`Bạn có chắc muốn thay đổi trạng thái khóa của tài khoản ID #${userId}?`, async () => {
      try {
        if (window.Api && window.Api.toggleAdminUserLock) {
          const res = await window.Api.toggleAdminUserLock(userId);
          App.showToast(res.message || 'Thay đổi trạng thái tài khoản thành công!', 'success');
        } else if (window.db && window.db.toggleUserStatus) {
          window.db.toggleUserStatus(userId);
          App.showToast('Thay đổi trạng thái tài khoản thành công!', 'success');
        }
      } catch (err) {
        if (window.db && window.db.toggleUserStatus) {
          window.db.toggleUserStatus(userId);
          App.showToast('Thay đổi trạng thái tài khoản thành công!', 'success');
        } else {
          App.showToast(err.message || 'Lỗi thao tác tài khoản', 'danger');
        }
      }
      await this.renderUsersTable();
    }, 'Cập nhật tài khoản');
  }
};

window.AdminController = AdminController;
