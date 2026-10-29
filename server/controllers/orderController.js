const crypto = require('crypto');
const db = require('../config/db');
const vnpayConfig = require('../config/vnpay');

/**
 * Generate unique order code
 */
async function generateUniqueOrderCode(connection) {
  let code = '';
  let exists = true;
  while (exists) {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    code = `ORD-${randomSuffix}`;
    const [rows] = await connection.query('SELECT id FROM orders WHERE order_code = ? LIMIT 1', [code]);
    if (rows.length === 0) {
      exists = false;
    }
  }
  return code;
}

/**
 * Create a new order with atomic stock verification & deduction
 */
async function createOrder(req, res, next) {
  try {
    const {
      customerName,
      customerPhone,
      customerEmail,
      shippingAddress,
      orderNote,
      items,
      paymentMethod = 'COD'
    } = req.body;

    const userId = req.user ? req.user.id : null;
    const guestLookupToken = !userId ? crypto.randomBytes(24).toString('hex') : null;

    // Run order creation and stock deduction in an atomic transaction
    const result = await db.transaction(async (conn) => {
      let subtotal = 0;
      const verifiedItems = [];

      // 1. Verify every item price and stock under row lock (FOR UPDATE)
      for (const reqItem of items) {
        const qty = parseInt(reqItem.quantity, 10);
        if (isNaN(qty) || qty <= 0) {
          throw { status: 400, message: 'Số lượng mua không hợp lệ.' };
        }

        let [prodRows] = await conn.query(
          'SELECT id, sku, name, price, stock, image FROM products WHERE id = ? OR sku = ? FOR UPDATE',
          [reqItem.productId, reqItem.productId]
        );

        if (prodRows.length === 0 && String(reqItem.productId).startsWith('prod-')) {
          const [allProds] = await conn.query('SELECT id, sku, name, price, stock, image FROM products ORDER BY id ASC');
          const idx = parseInt(String(reqItem.productId).replace('prod-', ''), 10) - 1;
          if (idx >= 0 && idx < allProds.length) {
            prodRows = [allProds[idx]];
          }
        }

        if (prodRows.length === 0) {
          throw { status: 400, message: `Sản phẩm ID ${reqItem.productId} không tồn tại.` };
        }

        const product = prodRows[0];

        if (product.stock < qty) {
          throw {
            status: 400,
            message: `Sản phẩm "${product.name}" chỉ còn ${product.stock} trong kho, không đủ số lượng ${qty}.`
          };
        }

        const itemSubtotal = Number(product.price) * qty;
        subtotal += itemSubtotal;

        verifiedItems.push({
          productId: product.id,
          sku: product.sku,
          name: product.name,
          price: Number(product.price),
          quantity: qty,
          subtotal: itemSubtotal,
          image: product.image,
          currentStock: product.stock
        });
      }

      const shippingFee = 0; // Free shipping policy
      const total = subtotal + shippingFee;
      const orderCode = await generateUniqueOrderCode(conn);

      // 2. Insert order record
      const [orderResult] = await conn.query(`
        INSERT INTO orders (
          order_code, user_id, customer_name, customer_phone, customer_email,
          shipping_address, order_note, payment_method, payment_status, order_status,
          subtotal, shipping_fee, total, guest_lookup_token, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'cho_xac_nhan', ?, ?, ?, ?, NOW())
      `, [
        orderCode, userId, customerName.trim(), customerPhone.trim(),
        customerEmail.trim().toLowerCase(), shippingAddress.trim(),
        orderNote ? orderNote.trim() : null, paymentMethod,
        subtotal, shippingFee, total, guestLookupToken
      ]);

      const orderId = orderResult.insertId;

      // 3. Insert order items & deduct inventory atomically
      for (const item of verifiedItems) {
        await conn.query(`
          INSERT INTO order_items (order_id, product_id, product_sku, product_name, product_price, quantity, subtotal, image)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          orderId, item.productId, item.sku, item.name, item.price, item.quantity, item.subtotal, item.image
        ]);

        // Deduct stock
        const newStock = item.currentStock - item.quantity;
        await conn.query('UPDATE products SET stock = ? WHERE id = ?', [newStock, item.productId]);

        // Audit log in inventory_transactions
        await conn.query(`
          INSERT INTO inventory_transactions (product_id, order_id, type, quantity, balance_after, note)
          VALUES (?, ?, 'SALE_DEDUCT', ?, ?, ?)
        `, [
          item.productId, orderId, item.quantity, newStock, `Bán hàng theo đơn #${orderCode}`
        ]);
      }

      // 4. If VNPAY, prepare payment record & payment URL
      let paymentUrl = null;
      if (paymentMethod === 'VNPAY') {
        const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
        const vnpayData = vnpayConfig.createPaymentUrl({
          orderCode,
          amount: total,
          orderInfo: `Thanh toan don hang ${orderCode}`,
          ipAddr: Array.isArray(clientIp) ? clientIp[0] : clientIp.split(',')[0].trim()
        });
        paymentUrl = vnpayData.paymentUrl;

        await conn.query(`
          INSERT INTO payments (order_id, payment_method, amount, status)
          VALUES (?, 'VNPAY', ?, 'pending')
        `, [orderId, total]);
      } else {
        await conn.query(`
          INSERT INTO payments (order_id, payment_method, amount, status)
          VALUES (?, 'COD', ?, 'pending')
        `, [orderId, total]);
      }

      return {
        orderId,
        orderCode,
        total,
        paymentMethod,
        paymentUrl,
        guestLookupToken
      };
    });

    res.status(201).json({
      success: true,
      message: 'Đặt hàng thành công!',
      order: {
        id: result.orderId,
        orderCode: result.orderCode,
        total: result.total,
        paymentMethod: result.paymentMethod
      },
      paymentUrl: result.paymentUrl,
      guestLookupToken: result.guestLookupToken
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get orders for current user (or guest with lookup token)
 */
async function getUserOrders(req, res, next) {
  try {
    let orders = [];

    if (req.user) {
      if (req.user.role === 'admin') {
        // Admins can see all orders
        orders = await db.query(`
          SELECT o.*, u.username
          FROM orders o
          LEFT JOIN users u ON o.user_id = u.id
          ORDER BY o.created_at DESC
        `);
      } else {
        // Customers only see their own orders
        orders = await db.query(`
          SELECT * FROM orders
          WHERE user_id = ? OR customer_email = ?
          ORDER BY created_at DESC
        `, [req.user.id, req.user.email]);
      }
    } else {
      // Guest lookup by orderCode + guestToken
      const { orderCode, token } = req.query;
      if (!orderCode || !token) {
        return res.status(401).json({
          success: false,
          message: 'Vui lòng đăng nhập hoặc cung cấp mã đơn cùng mã tra cứu an toàn.'
        });
      }

      orders = await db.query(`
        SELECT * FROM orders
        WHERE order_code = ? AND guest_lookup_token = ?
        LIMIT 1
      `, [orderCode.trim(), token.trim()]);
    }

    // Attach items to each order
    for (const order of orders) {
      const items = await db.query(
        'SELECT * FROM order_items WHERE order_id = ?',
        [order.id]
      );
      order.items = items.map(i => ({
        id: i.id,
        productId: i.product_id,
        sku: i.product_sku,
        name: i.product_name,
        price: Number(i.product_price),
        quantity: i.quantity,
        subtotal: Number(i.subtotal),
        image: i.image
      }));
    }

    res.json({
      success: true,
      orders
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get order details by ID or order_code with strict authorization
 */
async function getOrderById(req, res, next) {
  try {
    const { id } = req.params;
    const { token } = req.query;

    const rows = await db.query(`
      SELECT o.*, u.username
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE o.id = ? OR o.order_code = ?
      LIMIT 1
    `, [id, id]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Đơn hàng không tồn tại.' });
    }

    const order = rows[0];

    // Authorization privacy check:
    const isOwner = req.user && (req.user.id === order.user_id || req.user.email.toLowerCase() === order.customer_email.toLowerCase());
    const isAdmin = req.user && req.user.role === 'admin';
    const isGuestTokenValid = token && order.guest_lookup_token && token === order.guest_lookup_token;

    if (!isOwner && !isAdmin && !isGuestTokenValid) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền truy cập thông tin đơn hàng này.'
      });
    }

    const items = await db.query('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
    const payments = await db.query('SELECT * FROM payments WHERE order_id = ?', [order.id]);

    order.items = items.map(i => ({
      id: i.id,
      productId: i.product_id,
      sku: i.product_sku,
      name: i.product_name,
      price: Number(i.product_price),
      quantity: i.quantity,
      subtotal: Number(i.subtotal),
      image: i.image
    }));

    order.payments = payments;

    res.json({
      success: true,
      order
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Cancel order with idempotent inventory restock
 */
async function cancelOrder(req, res, next) {
  try {
    const { id } = req.params;
    const { token } = req.query;

    const rows = await db.query('SELECT * FROM orders WHERE id = ? OR order_code = ? LIMIT 1', [id, id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Đơn hàng không tồn tại.' });
    }

    const order = rows[0];

    // Authorization
    const isOwner = req.user && (req.user.id === order.user_id || req.user.email.toLowerCase() === order.customer_email.toLowerCase());
    const isAdmin = req.user && req.user.role === 'admin';
    const isGuestTokenValid = token && order.guest_lookup_token && token === order.guest_lookup_token;

    if (!isOwner && !isAdmin && !isGuestTokenValid) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền hủy đơn hàng này.'
      });
    }

    // Business rule: Only cancellable if status is 'cho_xac_nhan'
    if (order.order_status !== 'cho_xac_nhan') {
      return res.status(400).json({
        success: false,
        message: `Không thể hủy đơn hàng đang ở trạng thái "${order.order_status}". Chỉ đơn "Chờ xác nhận" mới có thể hủy.`
      });
    }

    // Atomic cancellation and idempotent inventory restock
    await db.transaction(async (conn) => {
      await conn.query(
        "UPDATE orders SET order_status = 'da_huy', updated_at = NOW() WHERE id = ?",
        [order.id]
      );

      // Check if stock has already been restocked for this order
      const [existingRestock] = await conn.query(
        "SELECT id FROM inventory_transactions WHERE order_id = ? AND type = 'CANCEL_RESTOCK'",
        [order.id]
      );

      if (existingRestock.length === 0) {
        // Fetch items
        const [items] = await conn.query('SELECT product_id, quantity FROM order_items WHERE order_id = ?', [order.id]);

        for (const item of items) {
          // Increase stock
          await conn.query('UPDATE products SET stock = stock + ? WHERE id = ?', [item.quantity, item.product_id]);

          // Get fresh stock
          const [p] = await conn.query('SELECT stock FROM products WHERE id = ?', [item.product_id]);
          const freshStock = p[0].stock;

          // Record restock audit
          await conn.query(`
            INSERT INTO inventory_transactions (product_id, order_id, type, quantity, balance_after, note)
            VALUES (?, ?, 'CANCEL_RESTOCK', ?, ?, ?)
          `, [
            item.product_id, order.id, item.quantity, freshStock, `Hoàn kho do hủy đơn #${order.order_code}`
          ]);
        }
      }
    });

    res.json({
      success: true,
      message: `Đã hủy đơn hàng #${order.order_code} và hoàn trả tồn kho thành công.`
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createOrder,
  getUserOrders,
  getOrderById,
  cancelOrder
};
