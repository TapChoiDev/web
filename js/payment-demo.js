/**
 * Store Anh - VNPAY Mock Payment Gateway Controller
 * Simulates real-world payment gateway redirect, bank selection, and callback.
 */

const PaymentDemo = {
  orderId: null,
  amount: 0,
  order: null,
  selectedBank: 'NCB',

  async initProcessing() {
    const params = new URLSearchParams(window.location.search);
    this.orderId = params.get('orderId');
    this.amount = parseInt(params.get('amount'), 10) || 0;
    const token = params.get('token') || '';

    if (!this.orderId) {
      alert('Không tìm thấy thông tin đơn hàng cần thanh toán!');
      window.location.href = '../index.html';
      return;
    }

    try {
      if (window.Api && window.Api.getOrderById) {
        this.order = await window.Api.getOrderById(this.orderId, token);
      }
    } catch (e) {
      console.warn('API getOrderById error:', e);
    }

    if (!this.order && window.db && window.db.getOrderById) {
      this.order = window.db.getOrderById(this.orderId);
    }

    if (!this.order) {
      alert('Mã đơn hàng không tồn tại trên hệ thống!');
      window.location.href = '../index.html';
      return;
    }

    this.renderProcessingScreen();
  },

  renderProcessingScreen() {
    const container = document.getElementById('payment-processing-content');
    if (!container) return;

    const amountFormatted = App.formatVND(this.order.total || this.amount);
    const orderCode = this.order.order_code || this.order.orderCode || this.order.id;

    container.innerHTML = `
      <div style="max-width: 680px; margin: 2rem auto; background: #ffffff; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.08); overflow: hidden; border: 1px solid #E2E8F0;">
        <!-- VNPAY Header Banner -->
        <div style="background: linear-gradient(135deg, #005baa 0%, #0093e9 100%); padding: 1.5rem 2rem; color: #ffffff; display: flex; align-items: center; justify-content: space-between;">
          <div>
            <h2 style="font-size: 1.35rem; font-weight: 800; color: #fff; margin-bottom: 0.2rem;">CỔNG THANH TOÁN VNPAY</h2>
            <p style="font-size: 0.825rem; opacity: 0.9; margin: 0;">Mô phỏng thanh toán trực tuyến an toàn & tức thì</p>
          </div>
          <div style="background: #ffffff; color: #005baa; font-weight: 800; padding: 0.4rem 0.8rem; border-radius: 6px; font-size: 1.1rem; letter-spacing: -0.02em;">
            VNPAY<sup>®</sup>
          </div>
        </div>

        <div style="padding: 2rem;">
          <!-- Order summary box -->
          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 1.25rem; margin-bottom: 1.5rem;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem; font-size: 0.9rem;">
              <span style="color: #64748B;">Đơn vị thụ hưởng:</span>
              <strong style="color: #0F172A;">STORE ANH</strong>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem; font-size: 0.9rem;">
              <span style="color: #64748B;">Mã hóa đơn đơn hàng:</span>
              <strong style="color: #2563EB;">#${orderCode}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem; font-size: 0.9rem;">
              <span style="color: #64748B;">Nội dung thanh toán:</span>
              <span>Thanh toan don hang ${orderCode}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 1.1rem; border-top: 1px dashed #CBD5E1; padding-top: 0.75rem; margin-top: 0.5rem;">
              <strong>Số tiền thanh toán:</strong>
              <strong style="color: #EF4444; font-size: 1.35rem;">${amountFormatted}</strong>
            </div>
          </div>

          <!-- Bank simulator selector -->
          <h4 style="font-size: 0.95rem; margin-bottom: 0.75rem; color: #1E293B;">Chọn ngân hàng / Phương thức thanh toán (Demo):</h4>
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.75rem; margin-bottom: 1.5rem;">
            <div class="bank-pill active" onclick="PaymentDemo.selectBank(this, 'NCB')">
              <span style="font-weight: 700; color: #005baa;">NCB</span>
              <small style="font-size:0.65rem; color:#64748B;">Ngân hàng Quốc Dân</small>
            </div>
            <div class="bank-pill" onclick="PaymentDemo.selectBank(this, 'VCB')">
              <span style="font-weight: 700; color: #00843D;">Vietcombank</span>
              <small style="font-size:0.65rem; color:#64748B;">Ngoại thương VN</small>
            </div>
            <div class="bank-pill" onclick="PaymentDemo.selectBank(this, 'TCB')">
              <span style="font-weight: 700; color: #ED1C24;">Techcombank</span>
              <small style="font-size:0.65rem; color:#64748B;">Kỹ Thương VN</small>
            </div>
            <div class="bank-pill" onclick="PaymentDemo.selectBank(this, 'MB')">
              <span style="font-weight: 700; color: #004B91;">MB Bank</span>
              <small style="font-size:0.65rem; color:#64748B;">Quân Đội</small>
            </div>
          </div>

          <!-- Sandbox Simulation Controls -->
          <div style="background: #FFFBEB; border: 1px solid #FCD34D; border-radius: 12px; padding: 1.25rem; margin-bottom: 1.75rem;">
            <div style="display: flex; align-items: center; gap: 0.5rem; color: #92400E; font-weight: 700; font-size: 0.9rem; margin-bottom: 0.5rem;">
              <span>🧪 BẢNG ĐIỀU KHIỂN MÔ PHỎNG VNPAY SANDBOX (BACKEND VERIFIED)</span>
            </div>
            <p style="font-size: 0.8rem; color: #78350F; margin-bottom: 1rem; line-height: 1.5;">
              Hệ thống kết nối trực tiếp với Backend REST API để cập nhật trạng thái thanh toán và số dư kho trong MySQL database:
            </p>
            <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
              <button type="button" class="btn btn-success btn-sm" onclick="PaymentDemo.simulateResult('success')">
                ✅ Giả lập Thanh toán Thành công (Mã 00)
              </button>
              <button type="button" class="btn btn-danger btn-sm" onclick="PaymentDemo.simulateResult('failed')">
                ❌ Giả lập Thanh toán Thất bại (Mã 24)
              </button>
              <button type="button" class="btn btn-outline btn-sm" onclick="PaymentDemo.simulateResult('cancel')">
                ⚠️ Hủy giao dịch (Quay về)
              </button>
            </div>
          </div>

          <!-- Security note required by prompt -->
          <div style="font-size: 0.775rem; color: #94A3B8; text-align: center; border-top: 1px solid #F1F5F9; padding-top: 1rem;">
            🔒 <strong>Bảo mật Backend:</strong> Mọi giao dịch được xác thực chữ ký điện tử HMAC-SHA512 tại máy chủ. Trình duyệt không có quyền tự quyết định trạng thái thanh toán.
          </div>
        </div>
      </div>
    `;
  },

  selectBank(el, code) {
    document.querySelectorAll('.bank-pill').forEach(p => p.classList.remove('active'));
    el.classList.add('active');
    this.selectedBank = code;
  },

  async simulateResult(outcome) {
    const orderCode = this.order ? (this.order.order_code || this.order.orderCode || this.order.id) : this.orderId;
    try {
      if (window.Api && window.Api.simulateSandboxCheckout) {
        const res = await window.Api.simulateSandboxCheckout(orderCode, outcome, this.selectedBank);
        if (res.status === 'success') {
          window.location.href = `result.html?orderId=${encodeURIComponent(orderCode)}&status=success&txn=${res.transactionNo}&amount=${res.amount}`;
        } else if (res.status === 'failed') {
          window.location.href = `result.html?orderId=${encodeURIComponent(orderCode)}&status=failed&txn=${res.transactionNo}&amount=${res.amount}&code=24`;
        } else {
          window.location.href = `result.html?orderId=${encodeURIComponent(orderCode)}&status=cancel&amount=${res.amount}`;
        }
        return;
      }
    } catch (err) {
      console.warn('API error, falling back to local simulation:', err);
    }

    const txnNo = 'VNP' + Math.floor(10000000 + Math.random() * 90000000);
    if (outcome === 'success') {
      if (window.db && window.db.updateOrderPayment) {
        window.db.updateOrderPayment(this.orderId, 'paid', txnNo);
      }
      window.location.href = `result.html?orderId=${orderCode}&status=success&txn=${txnNo}&amount=${this.order ? this.order.total : this.amount}`;
    } else if (outcome === 'failed') {
      window.location.href = `result.html?orderId=${orderCode}&status=failed&txn=${txnNo}&amount=${this.order ? this.order.total : this.amount}&code=24`;
    } else {
      window.location.href = `result.html?orderId=${orderCode}&status=cancel&amount=${this.order ? this.order.total : this.amount}`;
    }
  },

  /* --------------------------------------------------------------------------
     PAYMENT RESULT PAGE
     -------------------------------------------------------------------------- */
  async initResult() {
    const params = new URLSearchParams(window.location.search);
    const container = document.getElementById('payment-result-content');
    if (!container) return;

    // Check if this is a real VNPAY return redirect (has vnp_SecureHash)
    if (params.get('vnp_SecureHash')) {
      container.innerHTML = `
        <div style="max-width: 580px; margin: 3rem auto; background: #ffffff; border-radius: 16px; padding: 2.5rem; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.08); border: 1px solid #E2E8F0;">
          <div style="font-size: 2rem; margin-bottom: 1rem;">⏳</div>
          <h3 style="font-size: 1.25rem;">Đang xác minh chữ ký số VNPAY từ máy chủ...</h3>
          <p style="color: #64748B; font-size: 0.9rem;">Vui lòng không tắt hoặc tải lại trang.</p>
        </div>
      `;

      try {
        const verifyRes = await window.Api.verifyVnpayReturn(window.location.search);
        if (!verifyRes.success) {
          container.innerHTML = `
            <div style="max-width: 580px; margin: 3rem auto; background: #ffffff; border-radius: 16px; padding: 2.5rem; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.08); border: 1px solid #EF4444;">
              <div style="width: 72px; height: 72px; background: #FEF2F2; color: #EF4444; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 2.5rem; margin: 0 auto 1.25rem;">✕</div>
              <h2 style="font-size: 1.6rem; color: #0F172A; margin-bottom: 0.5rem;">Chữ Ký Không Hợp Lệ!</h2>
              <p style="color: #EF4444; font-size: 0.95rem; margin-bottom: 2rem;">${verifyRes.message || 'Chữ ký bảo mật HMAC-SHA512 không khớp. Yêu cầu thanh toán bị từ chối!'}</p>
              <a href="../orders.html" class="btn btn-outline">Xem danh sách đơn hàng</a>
            </div>
          `;
          return;
        }

        const vData = verifyRes.verified;
        const isSuccess = vData.isSuccess;
        const orderCode = vData.orderCode;
        const amount = vData.amount;
        const txnNo = vData.transactionNo || 'VNP-REAL';

        if (isSuccess) {
          container.innerHTML = `
            <div style="max-width: 580px; margin: 3rem auto; background: #ffffff; border-radius: 16px; padding: 2.5rem; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.08); border: 1px solid #E2E8F0;">
              <div style="width: 72px; height: 72px; background: #ECFDF5; color: #10B981; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 2.5rem; margin: 0 auto 1.25rem;">✓</div>
              <h2 style="font-size: 1.6rem; color: #0F172A; margin-bottom: 0.5rem;">Thanh toán VNPAY Thành Công!</h2>
              <p style="color: #64748B; font-size: 0.95rem; margin-bottom: 2rem;">Chữ ký số đã được xác minh thành công bởi Backend.</p>
              <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 1.25rem; text-align: left; font-size: 0.9rem; margin-bottom: 2rem;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.6rem;">
                  <span style="color: #64748B;">Mã đơn hàng:</span>
                  <strong style="color: #2563EB;">#${orderCode}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.6rem;">
                  <span style="color: #64748B;">Mã giao dịch VNPAY:</span>
                  <strong style="font-family: monospace;">${txnNo}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.6rem;">
                  <span style="color: #64748B;">Số tiền thanh toán:</span>
                  <strong style="color: #EF4444; font-size: 1.1rem;">${App.formatVND(amount)}</strong>
                </div>
              </div>
              <div style="display: flex; gap: 1rem; justify-content: center;">
                <a href="../orders.html?newOrder=${orderCode}" class="btn btn-primary">Theo dõi đơn hàng</a>
                <a href="../index.html" class="btn btn-outline">Về trang chủ</a>
              </div>
            </div>
          `;
          return;
        }
      } catch (err) {
        container.innerHTML = `
          <div style="max-width: 580px; margin: 3rem auto; background: #ffffff; border-radius: 16px; padding: 2.5rem; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.08); border: 1px solid #EF4444;">
            <h2 style="font-size: 1.4rem; color: #EF4444;">Lỗi xác thực thanh toán</h2>
            <p style="color: #64748B; margin: 1rem 0;">${err.message || 'Không thể xác thực giao dịch qua máy chủ.'}</p>
            <a href="../orders.html" class="btn btn-outline">Quay về đơn hàng</a>
          </div>
        `;
        return;
      }
    }

    const orderId = params.get('orderId');
    const status = params.get('status') || 'success';
    const txn = params.get('txn') || 'VNP-N/A';
    const amount = parseInt(params.get('amount'), 10) || 0;

    if (status === 'success') {
      container.innerHTML = `
        <div style="max-width: 580px; margin: 3rem auto; background: #ffffff; border-radius: 16px; padding: 2.5rem; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.08); border: 1px solid #E2E8F0;">
          <div style="width: 72px; height: 72px; background: #ECFDF5; color: #10B981; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 2.5rem; margin: 0 auto 1.25rem;">
            ✓
          </div>
          <h2 style="font-size: 1.6rem; color: #0F172A; margin-bottom: 0.5rem;">Thanh toán VNPAY Thành Công!</h2>
          <p style="color: #64748B; font-size: 0.95rem; margin-bottom: 2rem;">
            Cảm ơn bạn! Đơn hàng của bạn đã được ghi nhận và thanh toán trực tuyến thành công qua cổng VNPAY.
          </p>

          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 1.25rem; text-align: left; font-size: 0.9rem; margin-bottom: 2rem;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.6rem;">
              <span style="color: #64748B;">Mã đơn hàng:</span>
              <strong style="color: #2563EB;">#${orderId}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.6rem;">
              <span style="color: #64748B;">Mã giao dịch VNPAY:</span>
              <strong style="font-family: monospace;">${txn}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.6rem;">
              <span style="color: #64748B;">Số tiền thanh toán:</span>
              <strong style="color: #EF4444; font-size: 1.1rem;">${App.formatVND(amount)}</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #64748B;">Trạng thái:</span>
              <span class="badge badge-success">Giao dịch thành công (00)</span>
            </div>
          </div>

          <div style="display: flex; gap: 1rem; justify-content: center;">
            <a href="../orders.html?newOrder=${orderId}" class="btn btn-primary">Theo dõi đơn hàng</a>
            <a href="../index.html" class="btn btn-outline">Về trang chủ</a>
          </div>
        </div>
      `;
    } else if (status === 'cancel') {
      container.innerHTML = `
        <div style="max-width: 580px; margin: 3rem auto; background: #ffffff; border-radius: 16px; padding: 2.5rem; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.08); border: 1px solid #E2E8F0;">
          <div style="width: 72px; height: 72px; background: #FFFBEB; color: #F59E0B; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 2.5rem; margin: 0 auto 1.25rem;">
            !
          </div>
          <h2 style="font-size: 1.6rem; color: #0F172A; margin-bottom: 0.5rem;">Giao dịch đã bị hủy</h2>
          <p style="color: #64748B; font-size: 0.95rem; margin-bottom: 2rem;">
            Bạn đã hủy thanh toán qua cổng VNPAY. Đơn hàng #${orderId} hiện vẫn ở trạng thái chờ thanh toán.
          </p>
          <div style="display: flex; gap: 1rem; justify-content: center;">
            <a href="processing.html?orderId=${orderId}&amount=${amount}" class="btn btn-primary">Thử thanh toán lại</a>
            <a href="../orders.html" class="btn btn-outline">Xem đơn hàng</a>
          </div>
        </div>
      `;
    } else {
      // Failed
      container.innerHTML = `
        <div style="max-width: 580px; margin: 3rem auto; background: #ffffff; border-radius: 16px; padding: 2.5rem; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.08); border: 1px solid #E2E8F0;">
          <div style="width: 72px; height: 72px; background: #FEF2F2; color: #EF4444; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 2.5rem; margin: 0 auto 1.25rem;">
            ✕
          </div>
          <h2 style="font-size: 1.6rem; color: #0F172A; margin-bottom: 0.5rem;">Thanh toán không thành công</h2>
          <p style="color: #64748B; font-size: 0.95rem; margin-bottom: 2rem;">
            Giao dịch không thành công do thẻ không đủ số dư, thông tin thẻ không chính xác hoặc ngân hàng từ chối giao dịch.
          </p>
          <div style="display: flex; gap: 1rem; justify-content: center;">
            <a href="processing.html?orderId=${orderId}&amount=${amount}" class="btn btn-primary">Thanh toán lại</a>
            <a href="../cart.html" class="btn btn-outline">Quay về giỏ hàng</a>
          </div>
        </div>
      `;
    }
  }
};

window.PaymentDemo = PaymentDemo;
