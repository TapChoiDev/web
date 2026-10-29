const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { startServer, stopServer, closeDb } = require('./testHelper');
const vnpayConfig = require('../server/config/vnpay');

describe('Store Anh FULL-STACK AUTOMATED TEST SUITE', () => {
  let helper;
  let client;
  let adminClient;
  let customerA;
  let customerB;

  before(async () => {
    helper = await startServer();
    client = helper.client();

    adminClient = helper.client();
    customerA = helper.client();
    customerB = helper.client();
  });

  after(async () => {
    await stopServer();
    await closeDb();
  });

  /* =========================================================================
     1. AUTHENTICATION & AUTHORIZATION
     ========================================================================= */
  describe('1. Authentication & Role Permissions', () => {
    test('POST /api/auth/register - Register a new customer successfully', async () => {
      const timestamp = Date.now();
      const res = await client.post('/api/auth/register', {
        fullName: 'Test User ' + timestamp,
        email: `test_${timestamp}@example.com`,
        username: `user_${timestamp}`,
        password: 'password123',
        phone: '0988776655',
        address: 'Ha Noi, Viet Nam'
      });

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.equal(res.body.user.role, 'customer');
      assert.ok(res.body.token);
      assert.equal(res.body.user.password_hash, undefined);
    });

    test('POST /api/auth/register - Reject duplicate email registration', async () => {
      const res = await client.post('/api/auth/register', {
        fullName: 'Duplicate An',
        email: 'khachhang@gmail.com', // Seeded email
        username: 'new_unique_user',
        password: 'password123'
      });

      assert.equal(res.status, 409);
      assert.equal(res.body.success, false);
      assert.match(res.body.message, /email/i);
    });

    test('POST /api/auth/login - Login customer with correct credentials returns token and sets cookie', async () => {
      const res = await customerA.post('/api/auth/login', {
        identifier: 'khachhang@gmail.com',
        password: '123456'
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.user.email, 'khachhang@gmail.com');
      assert.ok(customerA.cookies.includes('token='));
    });

    test('POST /api/auth/login - Login admin with correct credentials', async () => {
      const res = await adminClient.post('/api/auth/login', {
        identifier: 'admin@webbanmt.vn',
        password: 'admin123'
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.user.role, 'admin');
    });

    test('POST /api/auth/login - Login customer B', async () => {
      const res = await customerB.post('/api/auth/login', {
        identifier: 'tranbinh@gmail.com',
        password: '123456'
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.user.username, 'tranbinh');
    });

    test('POST /api/auth/login - Login fails with incorrect password', async () => {
      const res = await client.post('/api/auth/login', {
        identifier: 'khachhang@gmail.com',
        password: 'wrong_password_999'
      });

      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
      assert.match(res.body.message, /không chính xác/i);
    });

    test('GET /api/auth/me - Authenticated user can fetch personal profile', async () => {
      const res = await customerA.get('/api/auth/me');
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.user.username, 'user1');
    });

    test('GET /api/admin/metrics - Customer is blocked from Admin endpoints (403 Forbidden)', async () => {
      const res = await customerA.get('/api/admin/metrics');
      assert.equal(res.status, 403);
      assert.equal(res.body.success, false);
      assert.match(res.body.message, /Quản trị viên/i);
    });

    test('GET /api/admin/metrics - Admin can access Admin endpoints (200 OK)', async () => {
      const res = await adminClient.get('/api/admin/metrics');
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(typeof res.body.data.totalRevenue === 'number');
      assert.ok(typeof res.body.data.totalOrders === 'number');
    });

    test('POST /api/admin/users & DELETE /api/admin/users/:id - Admin user CRUD operations', async () => {
      const ts = Date.now();
      const createRes = await adminClient.post('/api/admin/users', {
        fullName: 'Test User Admin Create',
        email: `test_admin_created_${ts}@gmail.com`,
        username: `user_${ts}`,
        password: 'password123',
        role: 'customer'
      });
      assert.equal(createRes.status, 201);
      assert.equal(createRes.body.success, true);
      const newUserId = createRes.body.userId;

      // Toggle lock
      const lockRes = await adminClient.put(`/api/admin/users/${newUserId}/toggle-lock`);
      assert.equal(lockRes.status, 200);
      assert.equal(lockRes.body.status, 'locked');

      // Delete user
      const delRes = await adminClient.delete(`/api/admin/users/${newUserId}`);
      assert.equal(delRes.status, 200);
      assert.equal(delRes.body.success, true);
    });
  });

  /* =========================================================================
     2. PRODUCT CATALOG & ADMIN PRODUCT CRUD
     ========================================================================= */
  describe('2. Product Catalog & Admin CRUD', () => {
    test('GET /api/products - Returns paginated products list', async () => {
      const res = await client.get('/api/products?page=1&limit=4');
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.length, 4);
      assert.ok(res.body.pagination.total > 0);
    });

    test('GET /api/products?cat=laptop-gaming - Filters products by category', async () => {
      const res = await client.get('/api/products?cat=laptop-gaming');
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      res.body.data.forEach(item => {
        assert.equal(item.category, 'laptop-gaming');
      });
    });

    test('GET /api/products?q=ROG - Searches products by keyword', async () => {
      const res = await client.get('/api/products?q=ROG');
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.length > 0);
      const hasRog = res.body.data.some(p => p.name.includes('ROG') || p.sku.includes('ROG'));
      assert.ok(hasRog);
    });

    test('GET /api/products/:id - Returns details for single product', async () => {
      const res = await client.get('/api/products/LAP-ASUS-G16');
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.product.sku, 'LAP-ASUS-G16');
      assert.ok(Array.isArray(res.body.relatedProducts));
    });

    let createdProductId = null;
    const testSku = 'TEST-PC-' + Date.now();

    test('POST /api/admin/products - Customer CANNOT create products (403 Forbidden)', async () => {
      const res = await customerA.post('/api/admin/products', {
        sku: testSku,
        name: 'Illegal Product Creation',
        brand: 'Hacker',
        category: 'pc-gaming',
        price: 10000000,
        stock: 5
      });

      assert.equal(res.status, 403);
      assert.equal(res.body.success, false);
    });

    test('POST /api/admin/products - Admin creates a new product successfully', async () => {
      const res = await adminClient.post('/api/admin/products', {
        sku: testSku,
        name: 'PC Gaming Test Pro i5 14400 / RTX 4060',
        brand: 'Store Anh',
        category: 'pc-gaming',
        price: 19990000,
        originalPrice: 22500000,
        stock: 10,
        image: 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7',
        description: 'Cấu hình test tự động',
        specs: { 'CPU': 'Core i5 14400', 'RAM': '16GB DDR5' }
      });

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.ok(res.body.productId);
      createdProductId = res.body.productId;
    });

    test('PUT /api/admin/products/:id - Admin updates existing product', async () => {
      assert.ok(createdProductId);
      const res = await adminClient.put(`/api/admin/products/${createdProductId}`, {
        price: 18990000,
        stock: 15,
        description: 'Mô tả cập nhật mới nhất'
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);

      const checkRes = await client.get(`/api/products/${createdProductId}`);
      assert.equal(checkRes.body.product.price, 18990000);
      assert.equal(checkRes.body.product.stock, 15);
    });

    test('DELETE /api/admin/products/:id - Admin deletes product', async () => {
      assert.ok(createdProductId);
      const res = await adminClient.delete(`/api/admin/products/${createdProductId}`);
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);

      const checkRes = await client.get(`/api/products/${createdProductId}`);
      assert.equal(checkRes.status, 404);
    });
  });

  /* =========================================================================
     3. ORDER CREATION, STOCK DEDUCTION, PRIVACY & CANCELLATION
     ========================================================================= */
  describe('3. Order Creation & Stock Management', () => {
    let createdOrderCode = null;
    let targetProduct = null;
    let initialStock = 0;

    test('POST /api/orders - Creates order, calculates price on server, and deducts inventory', async () => {
      const prodRes = await customerA.get('/api/products/LAP-DELL-INSP14');
      assert.equal(prodRes.status, 200);
      targetProduct = prodRes.body.product;
      initialStock = targetProduct.stock;
      assert.ok(initialStock >= 2);

      const orderRes = await customerA.post('/api/orders', {
        customerName: 'Nguyen Van An',
        customerPhone: '0912345678',
        customerEmail: 'khachhang@gmail.com',
        shippingAddress: '123 Cau Giay, Ha Noi',
        orderNote: 'Giao gio hanh chinh',
        paymentMethod: 'COD',
        items: [
          {
            productId: targetProduct.id,
            quantity: 2,
            price: 1000 // Attempted tampering!
          }
        ]
      });

      assert.equal(orderRes.status, 201);
      assert.equal(orderRes.body.success, true);
      createdOrderCode = orderRes.body.order.orderCode;

      // Verify server recalculated total using legitimate DB price
      const expectedTotal = targetProduct.price * 2;
      assert.equal(orderRes.body.order.total, expectedTotal);

      // Verify inventory was deducted in DB
      const checkProdRes = await customerA.get(`/api/products/${targetProduct.id}`);
      assert.equal(checkProdRes.body.product.stock, initialStock - 2);
    });

    test('POST /api/orders - Rejects order when requested quantity exceeds available stock', async () => {
      const res = await customerA.post('/api/orders', {
        customerName: 'Nguyen Van An',
        customerPhone: '0912345678',
        customerEmail: 'khachhang@gmail.com',
        shippingAddress: '123 Cau Giay',
        paymentMethod: 'COD',
        items: [
          {
            productId: targetProduct.id,
            quantity: 99999
          }
        ]
      });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.match(res.body.message, /không đủ/i);
    });

    test('GET /api/orders/:id - Customer A CANNOT view Customer B order (Privacy Guard 403)', async () => {
      const res = await customerA.get('/api/orders/ORD-8823');
      assert.equal(res.status, 403);
      assert.equal(res.body.success, false);
      assert.match(res.body.message, /không có quyền/i);
    });

    test('GET /api/orders/:id - Customer B CAN view their own order (200 OK)', async () => {
      const res = await customerB.get('/api/orders/ORD-8823');
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.order.order_code, 'ORD-8823');
    });

    test('GET /api/orders/:id - Admin CAN view any order (200 OK)', async () => {
      const res = await adminClient.get(`/api/orders/${createdOrderCode}`);
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.order.order_code, createdOrderCode);
    });

    test('POST /api/orders/:id/cancel - Cancelling order restocks inventory exactly once', async () => {
      assert.ok(createdOrderCode);

      // Cancel order
      const cancelRes = await customerA.post(`/api/orders/${createdOrderCode}/cancel`);
      assert.equal(cancelRes.status, 200);
      assert.equal(cancelRes.body.success, true);

      // Verify stock was restored to initialStock
      const restoredProdRes = await customerA.get(`/api/products/${targetProduct.id}`);
      assert.equal(restoredProdRes.body.product.stock, initialStock);

      // Try cancelling again: Should reject because status is already 'da_huy'
      const repeatCancel = await customerA.post(`/api/orders/${createdOrderCode}/cancel`);
      assert.equal(repeatCancel.status, 400);
      assert.equal(repeatCancel.body.success, false);

      // Verify stock was NOT added twice
      const finalProdRes = await customerA.get(`/api/products/${targetProduct.id}`);
      assert.equal(finalProdRes.body.product.stock, initialStock);
    });
  });

  /* =========================================================================
     4. VNPAY PAYMENT GATEWAY & SIGNATURE VERIFICATION
     ========================================================================= */
  describe('4. VNPAY Payments & Signature Security', () => {
    let testOrderCode = null;
    let testOrderTotal = 0;

    test('POST /api/orders - Create pending order with VNPAY payment method', async () => {
      const prodRes = await client.get('/api/products?limit=1');
      const product = prodRes.body.data[0];

      const res = await customerA.post('/api/orders', {
        customerName: 'Nguyen Van An',
        customerPhone: '0912345678',
        customerEmail: 'khachhang@gmail.com',
        shippingAddress: '123 Cau Giay',
        paymentMethod: 'VNPAY',
        items: [
          {
            productId: product.id,
            quantity: 1
          }
        ]
      });

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.equal(res.body.order.paymentMethod, 'VNPAY');
      assert.ok(res.body.paymentUrl.includes('vnp_SecureHash='));
      testOrderCode = res.body.order.orderCode;
      testOrderTotal = res.body.order.total;
    });

    test('GET /api/payments/vnpay-return - Reject tampered query params with forged signature (400)', async () => {
      const fakeParams = new URLSearchParams({
        vnp_Amount: (testOrderTotal * 100).toString(),
        vnp_BankCode: 'NCB',
        vnp_OrderInfo: `Thanh toan don hang ${testOrderCode}`,
        vnp_ResponseCode: '00',
        vnp_TmnCode: 'DEMO2026',
        vnp_TransactionNo: '99999999',
        vnp_TxnRef: testOrderCode,
        vnp_SecureHash: 'fake_forged_hash_value_123456789abcdef'
      });

      const res = await client.get(`/api/payments/vnpay-return?${fakeParams.toString()}`);
      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.match(res.body.message, /chữ ký/i);
    });

    test('GET /api/payments/vnpay-return - Legitimate signed return marks order as paid', async () => {
      const rawParams = {
        vnp_Amount: (testOrderTotal * 100).toString(),
        vnp_BankCode: 'NCB',
        vnp_Command: 'pay',
        vnp_CreateDate: '20261028200000',
        vnp_CurrCode: 'VND',
        vnp_OrderInfo: `Thanh toan don hang ${testOrderCode}`,
        vnp_PayDate: '20261028200500',
        vnp_ResponseCode: '00',
        vnp_TmnCode: vnpayConfig.tmnCode,
        vnp_TransactionNo: 'VNP' + Date.now(),
        vnp_TxnRef: testOrderCode
      };

      const sortedKeys = Object.keys(rawParams).sort();
      const signData = sortedKeys.map(k => `${encodeURIComponent(k)}=${encodeURIComponent(rawParams[k]).replace(/%20/g, '+')}`).join('&');
      const hmac = crypto.createHmac('sha512', vnpayConfig.hashSecret);
      rawParams.vnp_SecureHash = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

      const query = new URLSearchParams(rawParams);
      const res = await client.get(`/api/payments/vnpay-return?${query.toString()}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.verified.isSuccess, true);

      // Verify order status in DB
      const checkOrderRes = await customerA.get(`/api/orders/${testOrderCode}`);
      assert.equal(checkOrderRes.body.order.payment_status, 'paid');
    });

    test('GET /api/payments/vnpay-return - Repeated callback is idempotent', async () => {
      const rawParams = {
        vnp_Amount: (testOrderTotal * 100).toString(),
        vnp_BankCode: 'NCB',
        vnp_Command: 'pay',
        vnp_CreateDate: '20261028200000',
        vnp_CurrCode: 'VND',
        vnp_OrderInfo: `Thanh toan don hang ${testOrderCode}`,
        vnp_PayDate: '20261028200500',
        vnp_ResponseCode: '00',
        vnp_TmnCode: vnpayConfig.tmnCode,
        vnp_TransactionNo: 'VNP' + Date.now(),
        vnp_TxnRef: testOrderCode
      };

      const sortedKeys = Object.keys(rawParams).sort();
      const signData = sortedKeys.map(k => `${encodeURIComponent(k)}=${encodeURIComponent(rawParams[k]).replace(/%20/g, '+')}`).join('&');
      const hmac = crypto.createHmac('sha512', vnpayConfig.hashSecret);
      rawParams.vnp_SecureHash = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

      const query = new URLSearchParams(rawParams);
      const res = await client.get(`/api/payments/vnpay-return?${query.toString()}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
    });
  });
});
