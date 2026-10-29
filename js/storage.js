/**
 * Store Anh - Client Storage & Cart Service
 * Manages client UI states (Cart, temporary view preferences)
 * Real data is managed by the backend REST API.
 */

const STORAGE_KEYS = {
  CART: 'webbanmt_cart_v2'
};

class StorageService {
  constructor() {
    this.initCart();
  }

  initCart() {
    try {
      if (!localStorage.getItem(STORAGE_KEYS.CART)) {
        localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify([]));
      }
    } catch (e) {}
  }

  getProductById(productId) {
    if (!productId) return null;
    const pid = String(productId).trim();
    const pidUpper = pid.toUpperCase();

    // 1. Check cached/current products
    const products = this.getProducts();
    let found = products.find(p =>
      String(p.id) === pid ||
      (p.sku && String(p.sku).toUpperCase() === pidUpper)
    );
    if (found) return found;

    // 2. Check window.DATA_PRODUCTS
    if (window.DATA_PRODUCTS && Array.isArray(window.DATA_PRODUCTS)) {
      found = window.DATA_PRODUCTS.find(p =>
        String(p.id) === pid ||
        (p.sku && String(p.sku).toUpperCase() === pidUpper)
      );
      if (found) return found;

      // Also handle prod-01 <=> index mapping
      if (pid.startsWith('prod-')) {
        const idx = parseInt(pid.replace('prod-', ''), 10) - 1;
        if (idx >= 0 && idx < window.DATA_PRODUCTS.length) {
          return window.DATA_PRODUCTS[idx];
        }
      }
      const num = parseInt(pid, 10);
      if (!isNaN(num) && num >= 1 && num <= window.DATA_PRODUCTS.length) {
        return window.DATA_PRODUCTS[num - 1];
      }
    }
    return null;
  }

  /* --------------------------------------------------------------------------
     CART (Client-side selection, verified by server upon checkout)
     -------------------------------------------------------------------------- */
  getCart() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CART);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  saveCart(cart) {
    localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(cart));
    window.dispatchEvent(new CustomEvent('cartUpdated', { detail: { cart } }));
  }

  async addToCart(productId, quantity = 1) {
    let product = null;

    // 1. Try to fetch fresh product info from backend API
    try {
      if (window.Api && window.Api.getProductById) {
        const res = await window.Api.getProductById(productId);
        if (res && res.product) {
          product = res.product;
        }
      }
    } catch (err) {
      console.warn('API getProductById failed, checking local database:', err);
    }

    // 2. Fallback to local store / window.DATA_PRODUCTS
    if (!product) {
      product = this.getProductById(productId);
    }

    if (!product) {
      throw new Error('Sản phẩm không tồn tại!');
    }

    const availableStock = (product.stock !== undefined && product.stock !== null) ? Number(product.stock) : 10;
    if (availableStock <= 0) {
      throw new Error('Sản phẩm tạm thời hết hàng!');
    }

    const cart = this.getCart();
    const item = cart.find(i =>
      String(i.productId) === String(product.id) ||
      (product.sku && String(i.sku).toUpperCase() === String(product.sku).toUpperCase())
    );

    if (item) {
      const newQty = item.quantity + quantity;
      if (newQty > availableStock) {
        throw new Error(`Kho chỉ còn ${availableStock} sản phẩm!`);
      }
      item.quantity = newQty;
      item.price = Number(product.price);
      item.subtotal = item.price * item.quantity;
      item.maxStock = availableStock;
    } else {
      if (quantity > availableStock) {
        throw new Error(`Kho chỉ còn ${availableStock} sản phẩm!`);
      }
      cart.push({
        productId: product.id,
        sku: product.sku || '',
        name: product.name,
        price: Number(product.price),
        image: product.image || product.fallbackImage || '',
        quantity: quantity,
        subtotal: Number(product.price) * quantity,
        maxStock: availableStock
      });
    }

    this.saveCart(cart);
    return cart;
  }

  updateCartQty(productId, quantity) {
    const cart = this.getCart();
    const item = cart.find(i => String(i.productId) === String(productId));
    if (!item) return cart;

    if (quantity <= 0) {
      return this.removeFromCart(productId);
    }

    if (item.maxStock && quantity > item.maxStock) {
      throw new Error(`Số lượng vượt quá tồn kho (Tối đa ${item.maxStock})`);
    }

    item.quantity = quantity;
    item.subtotal = item.price * quantity;
    this.saveCart(cart);
    return cart;
  }

  removeFromCart(productId) {
    let cart = this.getCart();
    cart = cart.filter(i => String(i.productId) !== String(productId));
    this.saveCart(cart);
    return cart;
  }

  clearCart() {
    this.saveCart([]);
  }

  getCartCount() {
    const cart = this.getCart();
    return cart.reduce((sum, item) => sum + (item.quantity || 0), 0);
  }

  getCartSubtotal() {
    const cart = this.getCart();
    return cart.reduce((sum, item) => sum + (item.subtotal || item.price * item.quantity), 0);
  }

  /* --------------------------------------------------------------------------
     PRODUCTS (Client fallback & Local Cache)
     -------------------------------------------------------------------------- */
  getProducts() {
    try {
      const data = localStorage.getItem('webbanmt_products_cache');
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    if (window.DATA_PRODUCTS && Array.isArray(window.DATA_PRODUCTS)) {
      return [...window.DATA_PRODUCTS];
    }
    return [];
  }

  saveProduct(product) {
    let products = this.getProducts();
    if (!product.id) {
      product.id = 'prod_' + Date.now();
    }
    const idx = products.findIndex(p => String(p.id) === String(product.id) || (product.sku && String(p.sku).toUpperCase() === String(product.sku).toUpperCase()));
    if (idx !== -1) {
      products[idx] = { ...products[idx], ...product };
    } else {
      products.unshift(product);
    }
    try {
      localStorage.setItem('webbanmt_products_cache', JSON.stringify(products));
    } catch (e) {}
    if (window.DATA_PRODUCTS) {
      const gIdx = window.DATA_PRODUCTS.findIndex(p => String(p.id) === String(product.id));
      if (gIdx !== -1) {
        window.DATA_PRODUCTS[gIdx] = { ...window.DATA_PRODUCTS[gIdx], ...product };
      } else {
        window.DATA_PRODUCTS.unshift(product);
      }
    }
    return product;
  }

  deleteProduct(productId) {
    let products = this.getProducts();
    products = products.filter(p => String(p.id) !== String(productId) && String(p.sku) !== String(productId));
    try {
      localStorage.setItem('webbanmt_products_cache', JSON.stringify(products));
    } catch (e) {}
    if (window.DATA_PRODUCTS) {
      window.DATA_PRODUCTS = window.DATA_PRODUCTS.filter(p => String(p.id) !== String(productId) && String(p.sku) !== String(productId));
    }
    return true;
  }

  getCategories() {
    if (window.DATA_CATEGORIES) return window.DATA_CATEGORIES;
    return [
      { id: 'laptop-gaming', name: 'Laptop Gaming' },
      { id: 'laptop-van-phong', name: 'Laptop Văn Phòng' },
      { id: 'pc-gaming', name: 'PC Gaming' },
      { id: 'pc-van-phong', name: 'PC Văn Phòng' },
      { id: 'vga', name: 'Card Đồ Họa (VGA)' },
      { id: 'cpu', name: 'CPU - Bộ Vi Xử Lý' },
      { id: 'ram', name: 'Bộ Nhớ RAM' },
      { id: 'ssd', name: 'Ổ Cứng SSD / HDD' },
      { id: 'man-hinh', name: 'Màn Hình Máy Tính' },
      { id: 'phu-kien', name: 'Bàn Phím & Chuột' }
    ];
  }

  /* --------------------------------------------------------------------------
     USERS (Client fallback & Local Cache)
     -------------------------------------------------------------------------- */
  getUsers() {
    try {
      const data = localStorage.getItem('webbanmt_users_cache');
      if (data) return JSON.parse(data);
    } catch (e) {}
    if (window.DATA_USERS && Array.isArray(window.DATA_USERS)) {
      return [...window.DATA_USERS];
    }
    return [
      { id: 1, role: 'admin', fullName: 'Quản Trị Viên Hệ Thống', email: 'admin@webbanmt.vn', phone: '0988888888', status: 'active', createdAt: '2026-01-01T00:00:00Z' },
      { id: 2, role: 'customer', fullName: 'Nguyễn Văn Khách', email: 'khachhang@gmail.com', phone: '0912345678', status: 'active', createdAt: '2026-01-02T10:00:00Z' },
      { id: 3, role: 'customer', fullName: 'Trần Bình', email: 'tranbinh@gmail.com', phone: '0987654321', status: 'active', createdAt: '2026-01-03T14:30:00Z' }
    ];
  }

  getUserById(userId) {
    const users = this.getUsers();
    return users.find(u => String(u.id) === String(userId)) || null;
  }

  saveUser(user) {
    const users = this.getUsers();
    if (user.id) {
      const idx = users.findIndex(u => String(u.id) === String(user.id));
      if (idx !== -1) {
        users[idx] = { ...users[idx], ...user };
      } else {
        users.push(user);
      }
    } else {
      user.id = Date.now();
      user.status = user.status || 'active';
      user.createdAt = new Date().toISOString();
      users.push(user);
    }
    try {
      localStorage.setItem('webbanmt_users_cache', JSON.stringify(users));
    } catch (e) {}
    return user;
  }

  deleteUser(userId) {
    let users = this.getUsers();
    users = users.filter(u => String(u.id) !== String(userId));
    try {
      localStorage.setItem('webbanmt_users_cache', JSON.stringify(users));
    } catch (e) {}
    return true;
  }

  toggleUserStatus(userId) {
    const users = this.getUsers();
    const user = users.find(u => String(u.id) === String(userId));
    if (user) {
      user.status = user.status === 'locked' ? 'active' : 'locked';
      try {
        localStorage.setItem('webbanmt_users_cache', JSON.stringify(users));
      } catch (e) {}
    }
    return user;
  }

  /* --------------------------------------------------------------------------
     ORDERS (Client fallback & Local Cache)
     -------------------------------------------------------------------------- */
  getOrders() {
    try {
      const data = localStorage.getItem('webbanmt_orders_cache');
      if (data) return JSON.parse(data);
    } catch (e) {}
    if (window.DATA_ORDERS && Array.isArray(window.DATA_ORDERS)) {
      return [...window.DATA_ORDERS];
    }
    return [];
  }

  getOrderById(orderId) {
    const orders = this.getOrders();
    return orders.find(o => String(o.id) === String(orderId) || o.order_code === orderId || o.orderCode === orderId) || null;
  }

  saveOrder(order) {
    const orders = this.getOrders();
    const idx = orders.findIndex(o => String(o.id) === String(order.id) || String(o.orderCode) === String(order.orderCode));
    if (idx !== -1) {
      orders[idx] = { ...orders[idx], ...order };
    } else {
      orders.unshift(order);
    }
    try {
      localStorage.setItem('webbanmt_orders_cache', JSON.stringify(orders));
    } catch (e) {}
    if (window.DATA_ORDERS && Array.isArray(window.DATA_ORDERS)) {
      window.DATA_ORDERS.unshift(order);
    }
    return order;
  }

  updateOrderStatus(orderId, status) {
    const orders = this.getOrders();
    const order = orders.find(o => String(o.id) === String(orderId) || o.order_code === orderId);
    if (order) {
      order.order_status = status;
      order.orderStatus = status;
      try {
        localStorage.setItem('webbanmt_orders_cache', JSON.stringify(orders));
      } catch (e) {}
    }
    return order;
  }
}

// Global Singleton Instance
window.db = new StorageService();
