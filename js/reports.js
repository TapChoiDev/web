/**
 * Store Anh - Admin Reports & Analytics Controller
 * Connected directly to Backend REST API.
 */

const ReportsController = {
  async init() {
    await window.auth.requireAdmin();
    await this.renderReports();
    this.bindEvents();
  },

  async renderReports() {
    let reportData = null;
    try {
      if (window.Api && window.Api.getAdminReports) {
        reportData = await window.Api.getAdminReports();
      }
    } catch (err) {
      console.warn('API getAdminReports error:', err);
    }

    if (!reportData) {
      reportData = this.getFallbackReports();
    }

    // Key financial metrics
    const totalRevEl = document.getElementById('report-total-revenue');
    const eligibleCountEl = document.getElementById('report-eligible-orders');
    const aovEl = document.getElementById('report-aov');
    const cancelRateEl = document.getElementById('report-cancel-rate');

    if (totalRevEl) totalRevEl.textContent = App.formatVND(reportData.totalRevenue || 0);
    if (eligibleCountEl) eligibleCountEl.textContent = `${reportData.eligibleOrders || 0} đơn hợp lệ`;
    if (aovEl) aovEl.textContent = App.formatVND(reportData.aov || 0);
    if (cancelRateEl) cancelRateEl.textContent = `${reportData.cancelRate || 0}% (${reportData.cancelCount || 0} đơn)`;

    // Top Selling Products Table
    const topSalesTbody = document.getElementById('report-top-sales-tbody');
    if (topSalesTbody) {
      const topSales = reportData.topSellingProducts || [];
      if (topSales.length === 0) {
        topSalesTbody.innerHTML = '<tr><td colspan="5" class="text-center" style="padding: 2rem;">Chưa có dữ liệu bán hàng</td></tr>';
      } else {
        topSalesTbody.innerHTML = topSales.map((item, idx) => `
          <tr>
            <td><strong>#${idx + 1}</strong></td>
            <td><strong style="color: var(--text-main);">${item.name}</strong></td>
            <td>${App.formatVND(item.price)}</td>
            <td style="font-weight: 700; color: var(--accent);">${item.quantity} sản phẩm</td>
            <td style="font-weight: 700; color: #EF4444;">${App.formatVND(item.totalAmount)}</td>
          </tr>
        `).join('');
      }
    }

    // Orders Audit Table
    const auditTbody = document.getElementById('report-orders-audit-tbody');
    if (auditTbody) {
      const orders = reportData.auditOrders || [];
      if (orders.length === 0) {
        auditTbody.innerHTML = '<tr><td colspan="7" class="text-center" style="padding: 2rem;">Chưa có dữ liệu kiểm toán đơn hàng</td></tr>';
      } else {
        auditTbody.innerHTML = orders.map(o => {
          const isEligible = Boolean(o.is_revenue_eligible);
          const orderCode = o.order_code || o.id;
          const status = o.order_status;
          return `
            <tr>
              <td><strong>#${orderCode}</strong></td>
              <td>${o.customer_name}</td>
              <td>${App.formatDateTime(o.created_at)}</td>
              <td>${o.payment_method}</td>
              <td>${OrdersPage.getStatusBadge ? OrdersPage.getStatusBadge(status) : status}</td>
              <td style="font-weight: 700;">${App.formatVND(o.total)}</td>
              <td>
                ${isEligible
                  ? '<span class="badge badge-success">Ghi nhận doanh thu</span>'
                  : '<span class="badge badge-secondary">Chưa / Không tính</span>'}
              </td>
            </tr>
          `;
        }).join('');
      }
    }
  },

  getFallbackReports() {
    const orders = (window.db && window.db.getOrders) ? window.db.getOrders() : [];
    const metrics = (AdminController && AdminController.getFallbackMetrics) ? AdminController.getFallbackMetrics() : {
      totalRevenue: 0,
      statusCounts: { da_huy: 0 }
    };

    const eligibleOrders = orders.filter(o =>
      o.orderStatus !== 'da_huy' &&
      (o.orderStatus === 'da_giao' || (o.paymentMethod === 'VNPAY' && o.paymentStatus === 'paid'))
    );
    const aov = eligibleOrders.length > 0 ? Math.round(metrics.totalRevenue / eligibleOrders.length) : 0;
    const cancelRate = orders.length > 0 ? Math.round((metrics.statusCounts.da_huy / orders.length) * 100) : 0;

    return {
      totalRevenue: metrics.totalRevenue,
      eligibleOrders: eligibleOrders.length,
      aov,
      cancelRate,
      cancelCount: metrics.statusCounts.da_huy,
      topSellingProducts: [],
      auditOrders: orders.map(o => ({
        id: o.id,
        order_code: o.id,
        customer_name: o.customerName,
        created_at: o.createdAt,
        payment_method: o.paymentMethod,
        order_status: o.orderStatus,
        total: o.total,
        is_revenue_eligible: o.orderStatus === 'da_giao' || (o.paymentMethod === 'VNPAY' && o.paymentStatus === 'paid' && o.orderStatus !== 'da_huy') ? 1 : 0
      }))
    };
  },

  bindEvents() {
    const exportBtn = document.getElementById('btn-export-csv');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        this.exportCSV();
      });
    }
  },

  exportCSV() {
    // Direct server-side CSV download endpoint
    window.location.href = '/api/admin/reports/csv';
    App.showToast('Đang tải xuống báo cáo doanh thu CSV...', 'info');
  }
};

window.ReportsController = ReportsController;
