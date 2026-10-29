const db = require('../config/db');
const vnpayConfig = require('../config/vnpay');

/**
 * Generate VNPAY payment URL for an existing order
 */
async function createVnpayUrl(req, res, next) {
  try {
    const { orderCode } = req.body;

    if (!orderCode) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp mã đơn hàng.' });
    }

    const rows = await db.query('SELECT * FROM orders WHERE order_code = ? LIMIT 1', [orderCode]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Đơn hàng không tồn tại.' });
    }

    const order = rows[0];

    if (order.payment_status === 'paid') {
      return res.status(400).json({ success: false, message: 'Đơn hàng này đã được thanh toán trước đó.' });
    }

    if (order.order_status === 'da_huy') {
      return res.status(400).json({ success: false, message: 'Đơn hàng này đã bị hủy, không thể thanh toán.' });
    }

    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const vnpData = vnpayConfig.createPaymentUrl({
      orderCode: order.order_code,
      amount: order.total,
      orderInfo: `Thanh toan don hang ${order.order_code}`,
      ipAddr: Array.isArray(clientIp) ? clientIp[0] : clientIp.split(',')[0].trim()
    });

    res.json({
      success: true,
      paymentUrl: vnpData.paymentUrl
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Process VNPAY return URL on user browser redirect
 */
async function handleVnpayReturn(req, res, next) {
  try {
    const verified = vnpayConfig.verifyReturnUrl(req.query);

    if (!verified.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Chữ ký bảo mật không hợp lệ (Invalid Checksum). Yêu cầu thanh toán bị từ chối!',
        verified: { isValid: false }
      });
    }

    const rows = await db.query('SELECT * FROM orders WHERE order_code = ? LIMIT 1', [verified.orderCode]);
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn hàng tương ứng với giao dịch.'
      });
    }

    const order = rows[0];

    // Verify amount matches database order total
    if (Number(order.total) !== verified.amount) {
      return res.status(400).json({
        success: false,
        message: 'Số tiền thanh toán không khớp với giá trị đơn hàng!'
      });
    }

    if (verified.isSuccess) {
      // Idempotent: Only update if not already paid
      if (order.payment_status !== 'paid') {
        await db.query(`
          UPDATE orders
          SET payment_status = 'paid', transaction_no = ?, updated_at = NOW()
          WHERE id = ?
        `, [verified.transactionNo, order.id]);

        await db.query(`
          INSERT INTO payments (order_id, payment_method, amount, transaction_no, response_code, bank_code, pay_date, status, raw_payload)
          VALUES (?, 'VNPAY', ?, ?, ?, ?, ?, 'success', ?)
        `, [
          order.id, verified.amount, verified.transactionNo, verified.responseCode,
          verified.bankCode, verified.payDate, JSON.stringify(req.query)
        ]);
      }

      return res.json({
        success: true,
        message: 'Giao dịch thanh toán VNPAY thành công!',
        verified
      });
    } else {
      // Failed or cancelled transaction
      await db.query(`
        INSERT INTO payments (order_id, payment_method, amount, transaction_no, response_code, bank_code, pay_date, status, raw_payload)
        VALUES (?, 'VNPAY', ?, ?, ?, ?, ?, 'failed', ?)
      `, [
        order.id, verified.amount, verified.transactionNo || null, verified.responseCode,
        verified.bankCode || null, verified.payDate || null, JSON.stringify(req.query)
      ]);

      return res.json({
        success: false,
        message: `Giao dịch không thành công hoặc người dùng đã hủy (Mã phản hồi: ${verified.responseCode}).`,
        verified
      });
    }
  } catch (error) {
    next(error);
  }
}

/**
 * VNPAY IPN (Instant Payment Notification) Webhook
 */
async function handleVnpayIpn(req, res) {
  try {
    const verified = vnpayConfig.verifyReturnUrl(req.query);

    if (!verified.isValid) {
      return res.status(200).json({ RspCode: '97', Message: 'Invalid Checksum' });
    }

    const rows = await db.query('SELECT * FROM orders WHERE order_code = ? LIMIT 1', [verified.orderCode]);
    if (rows.length === 0) {
      return res.status(200).json({ RspCode: '01', Message: 'Order not found' });
    }

    const order = rows[0];

    if (Number(order.total) !== verified.amount) {
      return res.status(200).json({ RspCode: '04', Message: 'Invalid amount' });
    }

    // Check if already confirmed (idempotency check)
    if (order.payment_status === 'paid') {
      return res.status(200).json({ RspCode: '02', Message: 'Order already confirmed' });
    }

    if (verified.isSuccess) {
      await db.query(`
        UPDATE orders
        SET payment_status = 'paid', transaction_no = ?, updated_at = NOW()
        WHERE id = ?
      `, [verified.transactionNo, order.id]);

      await db.query(`
        INSERT INTO payments (order_id, payment_method, amount, transaction_no, response_code, bank_code, pay_date, status, raw_payload)
        VALUES (?, 'VNPAY', ?, ?, ?, ?, ?, 'success', ?)
      `, [
        order.id, verified.amount, verified.transactionNo, verified.responseCode,
        verified.bankCode, verified.payDate, JSON.stringify(req.query)
      ]);

      return res.status(200).json({ RspCode: '00', Message: 'Confirm Success' });
    } else {
      await db.query(`
        INSERT INTO payments (order_id, payment_method, amount, transaction_no, response_code, bank_code, pay_date, status, raw_payload)
        VALUES (?, 'VNPAY', ?, ?, ?, ?, ?, 'failed', ?)
      `, [
        order.id, verified.amount, verified.transactionNo, verified.responseCode,
        verified.bankCode, verified.payDate, JSON.stringify(req.query)
      ]);

      return res.status(200).json({ RspCode: '00', Message: 'Confirm Success (Failed recorded)' });
    }
  } catch (error) {
    return res.status(200).json({ RspCode: '99', Message: 'Unknown error' });
  }
}

/**
 * Built-in Sandbox Mock Simulator
 * Allows academic defense evaluators to simulate payment outcomes safely
 * without depending on external VNPAY network availability!
 */
async function simulateSandboxPayment(req, res, next) {
  try {
    const { orderCode, scenario, bankCode = 'NCB' } = req.body;

    if (!orderCode || !scenario) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp mã đơn và kịch bản thử nghiệm.' });
    }

    const rows = await db.query('SELECT * FROM orders WHERE order_code = ? LIMIT 1', [orderCode]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Đơn hàng không tồn tại.' });
    }

    const order = rows[0];
    const txnNo = 'VNP' + Math.floor(10000000 + Math.random() * 90000000);

    if (scenario === 'success') {
      if (order.payment_status !== 'paid') {
        await db.query(`
          UPDATE orders
          SET payment_status = 'paid', transaction_no = ?, updated_at = NOW()
          WHERE id = ?
        `, [txnNo, order.id]);

        await db.query(`
          INSERT INTO payments (order_id, payment_method, amount, transaction_no, response_code, bank_code, status)
          VALUES (?, 'VNPAY', ?, ?, '00', ?, 'success')
        `, [order.id, order.total, txnNo, bankCode]);
      }

      return res.json({
        success: true,
        status: 'success',
        orderCode: order.order_code,
        transactionNo: txnNo,
        amount: order.total,
        message: 'Giả lập thanh toán VNPAY thành công (Mã 00)!'
      });
    } else if (scenario === 'failed') {
      await db.query(`
        INSERT INTO payments (order_id, payment_method, amount, transaction_no, response_code, bank_code, status)
        VALUES (?, 'VNPAY', ?, ?, '24', ?, 'failed')
      `, [order.id, order.total, txnNo, bankCode]);

      return res.json({
        success: false,
        status: 'failed',
        orderCode: order.order_code,
        transactionNo: txnNo,
        amount: order.total,
        code: '24',
        message: 'Giao dịch không thành công: Thẻ không đủ số dư hoặc từ chối bởi ngân hàng phát hành (Mã 24).'
      });
    } else {
      // Cancel
      return res.json({
        success: false,
        status: 'cancel',
        orderCode: order.order_code,
        amount: order.total,
        message: 'Người dùng đã hủy giao dịch trên cổng thanh toán.'
      });
    }
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createVnpayUrl,
  handleVnpayReturn,
  handleVnpayIpn,
  simulateSandboxPayment
};
