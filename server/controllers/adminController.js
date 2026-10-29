const db = require('../config/db');
const { parseProduct } = require('./productController');

/**
 * Get dashboard overview statistics (Real data from database)
 */
async function getDashboardMetrics(req, res, next) {
  try {
    // 1. Eligible Revenue: ONLY delivered orders OR paid VNPAY orders that are not cancelled
    const revRows = await db.query(`
      SELECT COALESCE(SUM(total), 0) AS total_revenue, COUNT(*) AS eligible_count
      FROM orders
      WHERE order_status != 'da_huy'
        AND (order_status = 'da_giao' OR (payment_method = 'VNPAY' AND payment_status = 'paid'))
    `);
    const totalRevenue = Number(revRows[0].total_revenue);

    // 2. Total counts
    const ordCount = await db.query('SELECT COUNT(*) AS total FROM orders');
    const prodCount = await db.query('SELECT COUNT(*) AS total FROM products');
    const custCount = await db.query('SELECT COUNT(*) AS total FROM users WHERE role_id = 2');

    // 3. Status breakdown
    const statusRows = await db.query(`
      SELECT order_status, COUNT(*) AS count
      FROM orders
      GROUP BY order_status
    `);

    const statusCounts = {
      cho_xac_nhan: 0,
      dang_giao: 0,
      da_giao: 0,
      da_huy: 0
    };

    statusRows.forEach(r => {
      if (statusCounts.hasOwnProperty(r.order_status)) {
        statusCounts[r.order_status] = Number(r.count);
      }
    });

    // 4. Recent orders
    const recentOrders = await db.query(`
      SELECT o.id, o.order_code, o.customer_name, o.customer_phone, o.customer_email,
             o.total, o.payment_method, o.payment_status, o.order_status, o.created_at
      FROM orders o
      ORDER BY o.created_at DESC
      LIMIT 5
    `);

    // 5. Top rated products
    const topProducts = await db.query(`
      SELECT p.*, c.name AS category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ORDER BY (p.review_count * p.rating) DESC
      LIMIT 5
    `);

    res.json({
      success: true,
      data: {
        totalRevenue,
        totalOrders: ordCount[0].total,
        totalProducts: prodCount[0].total,
        totalCustomers: custCount[0].total,
        statusCounts,
        recentOrders,
        topProducts: topProducts.map(parseProduct)
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get product list for admin table
 */
async function getAdminProducts(req, res, next) {
  try {
    const { q, cat } = req.query;
    const where = [];
    const params = [];

    if (q && q.trim()) {
      where.push('(p.name LIKE ? OR p.sku LIKE ? OR p.brand LIKE ?)');
      const kw = `%${q.trim()}%`;
      params.push(kw, kw, kw);
    }

    if (cat && cat.trim()) {
      where.push('p.category_id = ?');
      params.push(cat.trim());
    }

    const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const rows = await db.query(`
      SELECT p.*, c.name AS category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ${whereSql}
      ORDER BY p.id DESC
    `, params);

    res.json({
      success: true,
      data: rows.map(parseProduct)
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Admin: Create a new product
 */
async function createProduct(req, res, next) {
  try {
    const {
      sku, name, brand, category, price, originalPrice, stock,
      image, fallbackImage, description, specs
    } = req.body;

    if (!sku || !name || !brand || !category || isNaN(price) || Number(price) <= 0) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp đầy đủ SKU, tên, hãng, danh mục và giá hợp lệ.' });
    }

    const cleanSku = sku.trim().toUpperCase();

    // Check duplicate SKU
    const existing = await db.query('SELECT id FROM products WHERE sku = ? LIMIT 1', [cleanSku]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: `Mã SKU "${cleanSku}" đã tồn tại trên hệ thống.` });
    }

    const priceNum = Number(price);
    const origPriceNum = originalPrice && !isNaN(originalPrice) ? Number(originalPrice) : null;
    const discount = (origPriceNum && origPriceNum > priceNum)
      ? Math.round(((origPriceNum - priceNum) / origPriceNum) * 100)
      : 0;
    const stockNum = Math.max(0, parseInt(stock, 10) || 0);

    const result = await db.transaction(async (conn) => {
      const [insertRes] = await conn.query(`
        INSERT INTO products (
          sku, name, brand, category_id, price, original_price, discount_percent,
          stock, image, fallback_image, description, specs_json, rating, review_count,
          is_featured, is_bestseller, is_new
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 5.00, 0, 0, 0, 1)
      `, [
        cleanSku, name.trim(), brand.trim(), category.trim(), priceNum, origPriceNum, discount,
        stockNum, image ? image.trim() : '', fallbackImage || null,
        description ? description.trim() : null, JSON.stringify(specs || {})
      ]);

      const productId = insertRes.insertId;

      // Log initial stock transaction
      await conn.query(`
        INSERT INTO inventory_transactions (product_id, type, quantity, balance_after, note)
        VALUES (?, 'INITIAL_STOCK', ?, ?, 'Admin tạo mới sản phẩm')
      `, [productId, stockNum, stockNum]);

      return productId;
    });

    res.status(201).json({
      success: true,
      message: 'Thêm sản phẩm mới thành công!',
      productId: result
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Admin: Update existing product
 */
async function updateProduct(req, res, next) {
  try {
    const { id } = req.params;
    const {
      sku, name, brand, category, price, originalPrice, stock,
      image, fallbackImage, description, specs
    } = req.body;

    const rows = await db.query('SELECT * FROM products WHERE id = ? LIMIT 1', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Sản phẩm không tồn tại.' });
    }

    const current = rows[0];
    const cleanSku = (sku || current.sku).trim().toUpperCase();

    // Check SKU duplicate with other products
    const dup = await db.query('SELECT id FROM products WHERE sku = ? AND id != ? LIMIT 1', [cleanSku, id]);
    if (dup.length > 0) {
      return res.status(409).json({ success: false, message: `Mã SKU "${cleanSku}" đã được dùng cho sản phẩm khác.` });
    }

    const priceNum = price !== undefined ? Number(price) : Number(current.price);
    const origPriceNum = originalPrice !== undefined && !isNaN(originalPrice) ? Number(originalPrice) : current.original_price;
    const discount = (origPriceNum && origPriceNum > priceNum)
      ? Math.round(((origPriceNum - priceNum) / origPriceNum) * 100)
      : 0;
    const newStock = stock !== undefined ? Math.max(0, parseInt(stock, 10)) : current.stock;

    await db.transaction(async (conn) => {
      await conn.query(`
        UPDATE products SET
          sku = ?, name = ?, brand = ?, category_id = ?, price = ?,
          original_price = ?, discount_percent = ?, stock = ?, image = ?,
          fallback_image = ?, description = ?, specs_json = ?, updated_at = NOW()
        WHERE id = ?
      `, [
        cleanSku, (name || current.name).trim(), (brand || current.brand).trim(),
        (category || current.category_id).trim(), priceNum, origPriceNum, discount,
        newStock, (image || current.image).trim(), fallbackImage || current.fallback_image,
        description !== undefined ? description : current.description,
        specs !== undefined ? JSON.stringify(specs) : current.specs_json,
        id
      ]);

      // If stock was adjusted by admin, record audit log
      if (newStock !== current.stock) {
        const delta = newStock - current.stock;
        await conn.query(`
          INSERT INTO inventory_transactions (product_id, type, quantity, balance_after, note)
          VALUES (?, 'ADMIN_ADJUST', ?, ?, ?)
        `, [id, delta, newStock, `Admin điều chỉnh tồn kho từ ${current.stock} thành ${newStock}`]);
      }
    });

    res.json({
      success: true,
      message: 'Cập nhật thông tin sản phẩm thành công!'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Admin: Delete product
 */
async function deleteProduct(req, res, next) {
  try {
    const { id } = req.params;

    const rows = await db.query('SELECT name FROM products WHERE id = ? LIMIT 1', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Sản phẩm không tồn tại.' });
    }

    // Check if referenced in order_items
    const ref = await db.query('SELECT COUNT(*) AS count FROM order_items WHERE product_id = ?', [id]);
    if (ref[0].count > 0) {
      // If product has been ordered in history, soft-disable by setting stock to 0 and renaming sku/prefix
      await db.query("UPDATE products SET stock = 0, is_featured = 0, is_bestseller = 0, is_new = 0, name = CONCAT(name, ' (Đã ngừng kinh doanh)') WHERE id = ?", [id]);
      return res.json({
        success: true,
        message: 'Sản phẩm đã có đơn hàng trong quá khứ, đã được chuyển sang trạng thái "Ngừng kinh doanh".'
      });
    }

    await db.query('DELETE FROM inventory_transactions WHERE product_id = ?', [id]);
    await db.query('DELETE FROM products WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Đã xóa vĩnh viễn sản phẩm thành công.'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Admin: List all orders
 */
async function getAdminOrders(req, res, next) {
  try {
    const { status, paymentMethod, q } = req.query;
    const where = [];
    const params = [];

    if (status && status.trim()) {
      where.push('o.order_status = ?');
      params.push(status.trim());
    }

    if (paymentMethod && paymentMethod.trim()) {
      where.push('o.payment_method = ?');
      params.push(paymentMethod.trim());
    }

    if (q && q.trim()) {
      where.push('(o.order_code LIKE ? OR o.customer_name LIKE ? OR o.customer_phone LIKE ?)');
      const kw = `%${q.trim()}%`;
      params.push(kw, kw, kw);
    }

    const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const orders = await db.query(`
      SELECT o.*, u.username
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      ${whereSql}
      ORDER BY o.created_at DESC
    `, params);

    for (const order of orders) {
      const items = await db.query('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
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
      data: orders
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Admin: Update order status with strict business rules & inventory synchronization
 */
async function updateOrderStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status: newStatus } = req.body;

    const validStatuses = ['cho_xac_nhan', 'dang_giao', 'da_giao', 'da_huy'];
    if (!validStatuses.includes(newStatus)) {
      return res.status(400).json({ success: false, message: 'Trạng thái đơn hàng không hợp lệ.' });
    }

    const rows = await db.query('SELECT * FROM orders WHERE id = ? LIMIT 1', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Đơn hàng không tồn tại.' });
    }

    const order = rows[0];
    const currentStatus = order.order_status;

    // Strict State Machine Verification:
    if (currentStatus === 'da_huy') {
      return res.status(400).json({
        success: false,
        message: 'Đơn hàng đã hủy không thể chuyển sang trạng thái khác.'
      });
    }

    if (currentStatus === 'da_giao' && newStatus !== 'da_giao') {
      return res.status(400).json({
        success: false,
        message: 'Đơn hàng đã giao thành công không thể thay đổi trạng thái.'
      });
    }

    // Atomic status change and inventory synchronization
    await db.transaction(async (conn) => {
      let updateFields = 'order_status = ?, updated_at = NOW()';
      const updateParams = [newStatus];

      if (newStatus === 'da_giao') {
        updateFields += ', delivered_at = NOW()';
        // For COD, when delivered, payment is automatically considered paid
        if (order.payment_method === 'COD') {
          updateFields += ", payment_status = 'paid'";
        }
      }

      updateParams.push(order.id);
      await conn.query(`UPDATE orders SET ${updateFields} WHERE id = ?`, updateParams);

      // If cancelling: restock inventory idempotently
      if (newStatus === 'da_huy') {
        const [existingRestock] = await conn.query(
          "SELECT id FROM inventory_transactions WHERE order_id = ? AND type = 'CANCEL_RESTOCK'",
          [order.id]
        );

        if (existingRestock.length === 0) {
          const [items] = await conn.query('SELECT product_id, quantity FROM order_items WHERE order_id = ?', [order.id]);

          for (const item of items) {
            await conn.query('UPDATE products SET stock = stock + ? WHERE id = ?', [item.quantity, item.product_id]);
            const [p] = await conn.query('SELECT stock FROM products WHERE id = ?', [item.product_id]);

            await conn.query(`
              INSERT INTO inventory_transactions (product_id, order_id, type, quantity, balance_after, note)
              VALUES (?, ?, 'CANCEL_RESTOCK', ?, ?, ?)
            `, [
              item.product_id, order.id, item.quantity, p[0].stock, `Admin hủy đơn #${order.order_code}`
            ]);
          }
        }
      }
    });

    res.json({
      success: true,
      message: `Đã cập nhật đơn hàng #${order.order_code} sang trạng thái "${newStatus}".`
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Admin: List all user accounts
 */
async function getAdminUsers(req, res, next) {
  try {
    const { q } = req.query;
    const where = [];
    const params = [];

    if (q && q.trim()) {
      where.push('(u.full_name LIKE ? OR u.email LIKE ? OR u.username LIKE ? OR u.phone LIKE ?)');
      const kw = `%${q.trim()}%`;
      params.push(kw, kw, kw, kw);
    }

    const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const users = await db.query(`
      SELECT u.id, u.role_id, r.name AS role, u.full_name, u.email, u.username,
             u.phone, u.address, u.status, u.created_at
      FROM users u
      JOIN roles r ON u.role_id = r.id
      ${whereSql}
      ORDER BY u.id ASC
    `, params);

    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Admin: Toggle Lock / Unlock user account
 */
async function toggleUserLock(req, res, next) {
  try {
    const { id } = req.params;

    const rows = await db.query(`
      SELECT u.*, r.name AS role
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = ?
      LIMIT 1
    `, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Tài khoản không tồn tại.' });
    }

    const targetUser = rows[0];

    // Security rule: Prevent admin from locking their own account!
    if (targetUser.id === req.user.id) {
      return res.status(400).json({ success: false, message: 'Bạn không thể tự khóa chính tài khoản của mình!' });
    }

    if (targetUser.role === 'admin') {
      return res.status(400).json({ success: false, message: 'Không thể khóa tài khoản có quyền Quản trị viên!' });
    }

    const newStatus = targetUser.status === 'locked' ? 'active' : 'locked';
    await db.query('UPDATE users SET status = ? WHERE id = ?', [newStatus, id]);

    res.json({
      success: true,
      message: `Đã ${newStatus === 'locked' ? 'khóa' : 'mở khóa'} tài khoản "${targetUser.full_name}" thành công!`,
      status: newStatus
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Admin: Get detailed financial report
 */
async function getReports(req, res, next) {
  try {
    // 1. Financial summary
    const revRows = await db.query(`
      SELECT COALESCE(SUM(total), 0) AS total_revenue, COUNT(*) AS eligible_count
      FROM orders
      WHERE order_status != 'da_huy'
        AND (order_status = 'da_giao' OR (payment_method = 'VNPAY' AND payment_status = 'paid'))
    `);

    const totalRevenue = Number(revRows[0].total_revenue);
    const eligibleCount = Number(revRows[0].eligible_count);
    const aov = eligibleCount > 0 ? Math.round(totalRevenue / eligibleCount) : 0;

    const cancelRows = await db.query(`
      SELECT COUNT(*) AS total_orders,
             SUM(CASE WHEN order_status = 'da_huy' THEN 1 ELSE 0 END) AS cancel_count
      FROM orders
    `);
    const totalOrders = Number(cancelRows[0].total_orders);
    const cancelCount = Number(cancelRows[0].cancel_count);
    const cancelRate = totalOrders > 0 ? Math.round((cancelCount / totalOrders) * 100) : 0;

    // 2. Best-selling products based on actual sold order_items
    const topSalesRows = await db.query(`
      SELECT oi.product_id, oi.product_name, oi.product_price,
             SUM(oi.quantity) AS total_sold,
             SUM(oi.subtotal) AS total_amount
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE o.order_status != 'da_huy'
      GROUP BY oi.product_id, oi.product_name, oi.product_price
      ORDER BY total_sold DESC
      LIMIT 10
    `);

    // 3. Orders audit trail
    const auditOrders = await db.query(`
      SELECT id, order_code, customer_name, customer_phone, payment_method,
             payment_status, order_status, total, created_at,
             CASE
               WHEN order_status = 'da_giao' OR (payment_method = 'VNPAY' AND payment_status = 'paid' AND order_status != 'da_huy')
               THEN 1 ELSE 0
             END AS is_revenue_eligible
      FROM orders
      ORDER BY created_at DESC
    `);

    res.json({
      success: true,
      data: {
        totalRevenue,
        eligibleOrders: eligibleCount,
        aov,
        cancelRate,
        cancelCount,
        topSellingProducts: topSalesRows.map(r => ({
          productId: r.product_id,
          name: r.product_name,
          price: Number(r.product_price),
          quantity: Number(r.total_sold),
          totalAmount: Number(r.total_amount)
        })),
        auditOrders
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Admin: Export orders to CSV with UTF-8 BOM
 */
async function exportCsv(req, res, next) {
  try {
    const orders = await db.query(`
      SELECT o.order_code, o.customer_name, o.customer_phone, o.customer_email,
             o.shipping_address, o.payment_method, o.payment_status, o.order_status,
             o.total, o.created_at,
             CASE
               WHEN o.order_status = 'da_giao' OR (o.payment_method = 'VNPAY' AND o.payment_status = 'paid' AND o.order_status != 'da_huy')
               THEN 'Hop le' ELSE 'Chua ghi nhan'
             END AS revenue_status
      FROM orders o
      ORDER BY o.created_at DESC
    `);

    const headers = [
      'Mã Đơn', 'Khách Hàng', 'Số Điện Thoại', 'Email', 'Địa Chỉ Giao Hàng',
      'Phương Thức TT', 'Trạng Thái TT', 'Trạng Thái Đơn', 'Tổng Tiền (VND)',
      'Ngày Đặt Hàng', 'Ghi Nhận Doanh Thu'
    ];

    const rows = orders.map(o => [
      `"${o.order_code}"`,
      `"${(o.customer_name || '').replace(/"/g, '""')}"`,
      `"${o.customer_phone || ''}"`,
      `"${o.customer_email || ''}"`,
      `"${(o.shipping_address || '').replace(/"/g, '""')}"`,
      `"${o.payment_method}"`,
      `"${o.payment_status === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán'}"`,
      `"${o.order_status}"`,
      o.total,
      `"${new Date(o.created_at).toLocaleString('vi-VN')}"`,
      `"${o.revenue_status}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="Store Anh_Bao_Cao_${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(csvContent);
  } catch (error) {
    next(error);
  }
}

/**
 * Admin: Create a new user
 */
async function createUser(req, res, next) {
  try {
    const { fullName, email, username, phone, address, password, role = 'customer' } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp họ tên, email và mật khẩu.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = (username || cleanEmail.split('@')[0]).trim().toLowerCase();

    const existing = await db.query('SELECT id FROM users WHERE email = ? OR username = ? LIMIT 1', [cleanEmail, cleanUsername]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'Email hoặc tên đăng nhập đã được sử dụng.' });
    }

    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash(password, 10);
    const roleId = role === 'admin' ? 1 : 2;

    const result = await db.query(`
      INSERT INTO users (role_id, full_name, email, username, phone, address, password_hash, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'active', NOW())
    `, [roleId, fullName.trim(), cleanEmail, cleanUsername, phone ? phone.trim() : null, address ? address.trim() : null, passwordHash]);

    res.status(201).json({
      success: true,
      message: 'Tạo tài khoản người dùng thành công!',
      userId: result.insertId
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Admin: Update user information
 */
async function updateUser(req, res, next) {
  try {
    const { id } = req.params;
    const { fullName, phone, address, role, status, password } = req.body;

    const rows = await db.query('SELECT * FROM users WHERE id = ? LIMIT 1', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Tài khoản không tồn tại.' });
    }

    const current = rows[0];
    const roleId = role ? (role === 'admin' ? 1 : 2) : current.role_id;
    const userStatus = status || current.status;

    let passwordHash = current.password_hash;
    if (password && password.trim().length >= 6) {
      const bcrypt = require('bcryptjs');
      passwordHash = await bcrypt.hash(password.trim(), 10);
    }

    await db.query(`
      UPDATE users SET
        full_name = ?, phone = ?, address = ?, role_id = ?, status = ?, password_hash = ?
      WHERE id = ?
    `, [
      (fullName || current.full_name).trim(),
      phone !== undefined ? phone : current.phone,
      address !== undefined ? address : current.address,
      roleId,
      userStatus,
      passwordHash,
      id
    ]);

    res.json({
      success: true,
      message: 'Cập nhật tài khoản người dùng thành công!'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Admin: Delete user account
 */
async function deleteUser(req, res, next) {
  try {
    const { id } = req.params;

    if (Number(id) === req.user.id) {
      return res.status(400).json({ success: false, message: 'Bạn không thể tự xóa tài khoản của chính mình!' });
    }

    const rows = await db.query('SELECT * FROM users WHERE id = ? LIMIT 1', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Tài khoản không tồn tại.' });
    }

    if (rows[0].role_id === 1) {
      return res.status(400).json({ success: false, message: 'Không thể xóa tài khoản Quản trị viên hệ thống!' });
    }

    await db.query('UPDATE orders SET user_id = NULL WHERE user_id = ?', [id]);
    await db.query('DELETE FROM users WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Đã xóa tài khoản người dùng thành công!'
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getDashboardMetrics,
  getAdminProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getAdminOrders,
  updateOrderStatus,
  getAdminUsers,
  toggleUserLock,
  createUser,
  updateUser,
  deleteUser,
  getReports,
  exportCsv
};
