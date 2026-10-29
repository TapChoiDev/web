/**
 * Request body and parameter validation utilities
 */

function validateRegister(req, res, next) {
  const { fullName, email, username, password } = req.body;

  if (!fullName || !fullName.trim()) {
    return res.status(400).json({ success: false, message: 'Họ và tên là trường bắt buộc.' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email.trim())) {
    return res.status(400).json({ success: false, message: 'Địa chỉ email không đúng định dạng.' });
  }

  if (!username || username.trim().length < 3) {
    return res.status(400).json({ success: false, message: 'Tên đăng nhập phải có tối thiểu 3 ký tự.' });
  }

  if (!password || password.length < 6) {
    return res.status(400).json({ success: false, message: 'Mật khẩu phải có tối thiểu 6 ký tự.' });
  }

  next();
}

function validateLogin(req, res, next) {
  const { identifier, password } = req.body;
  if (!identifier || !identifier.trim() || !password) {
    return res.status(400).json({ success: false, message: 'Vui lòng nhập tài khoản và mật khẩu.' });
  }
  next();
}

function validateOrder(req, res, next) {
  const { customerName, customerPhone, customerEmail, shippingAddress, items, paymentMethod } = req.body;

  if (!customerName || !customerName.trim()) {
    return res.status(400).json({ success: false, message: 'Vui lòng cung cấp họ tên người nhận hàng.' });
  }

  const phoneClean = (customerPhone || '').replace(/\s+/g, '');
  if (!phoneClean || !/^[0-9]{10,11}$/.test(phoneClean)) {
    return res.status(400).json({ success: false, message: 'Số điện thoại người nhận không hợp lệ (10 - 11 chữ số).' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!customerEmail || !emailRegex.test(customerEmail.trim())) {
    return res.status(400).json({ success: false, message: 'Địa chỉ email liên hệ không đúng định dạng.' });
  }

  if (!shippingAddress || !shippingAddress.trim()) {
    return res.status(400).json({ success: false, message: 'Vui lòng cung cấp địa chỉ nhận hàng cụ thể.' });
  }

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, message: 'Giỏ hàng không có sản phẩm nào.' });
  }

  for (const item of items) {
    if (!item.productId || isNaN(item.quantity) || parseInt(item.quantity, 10) <= 0) {
      return res.status(400).json({ success: false, message: 'Dữ liệu sản phẩm trong đơn hàng không hợp lệ.' });
    }
  }

  if (paymentMethod && !['COD', 'VNPAY'].includes(paymentMethod)) {
    return res.status(400).json({ success: false, message: 'Phương thức thanh toán không được hỗ trợ.' });
  }

  next();
}

module.exports = {
  validateRegister,
  validateLogin,
  validateOrder
};
