/**
 * Store Anh - Unified REST API Client
 * Replaces LocalStorage data storage with real backend API requests.
 */

const API_BASE = (() => {
  if (typeof window === 'undefined') return '';

  // Allow an explicit override for deployments where the API is on another host.
  const configuredBase = window.WEBBANMT_API_BASE ||
    document.querySelector('meta[name="webbanmt-api-base"]')?.content;
  if (configuredBase) return configuredBase.replace(/\/$/, '');

  const { protocol, hostname, port } = window.location;
  if (protocol === 'file:') return 'http://localhost:5000';

  // XAMPP/Live Server serve the static site on port 80/5500 while Express runs on 5000.
  // Docker serves both the frontend and API from port 3000, so keep that same origin.
  const isLocalHost = ['localhost', '127.0.0.1', '::1'].includes(hostname);
  const pagePort = port || (protocol === 'https:' ? '443' : '80');
  if (isLocalHost && !['3000', '5000'].includes(pagePort)) {
    const apiHost = hostname.includes(':') ? `[${hostname}]` : hostname;
    return `http://${apiHost}:5000`;
  }

  return '';
})();

const Api = {
  /**
   * Generic request wrapper handling JSON and credentials
   */
  async request(endpoint, options = {}) {
    const config = {
      headers: {
        'Accept': 'application/json',
        ...(options.headers || {})
      },
      credentials: 'include', // Sends httpOnly session cookie
      ...options
    };

    if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
      config.headers['Content-Type'] = 'application/json';
      config.body = JSON.stringify(config.body);
    }

    // Attach Authorization header if stored in localStorage or sessionStorage as fallback
    const fallbackToken = localStorage.getItem('webbanmt_token') || sessionStorage.getItem('webbanmt_token');
    if (fallbackToken && !config.headers['Authorization']) {
      config.headers['Authorization'] = `Bearer ${fallbackToken}`;
    }

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, config);

      if (response.status === 204) {
        return null;
      }

      const contentType = response.headers.get('content-type') || '';
      let data;
      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      if (!response.ok) {
        const errorMsg = (data && data.message) ? data.message : `Lỗi máy chủ (${response.status})`;
        const err = new Error(errorMsg);
        err.status = response.status;
        err.data = data;
        throw err;
      }

      return data;
    } catch (err) {
      console.error(`[API Error] ${options.method || 'GET'} ${endpoint}:`, err);
      throw err;
    }
  },

  get(endpoint, headers = {}) {
    return this.request(endpoint, { method: 'GET', headers });
  },

  post(endpoint, body, headers = {}) {
    return this.request(endpoint, { method: 'POST', body, headers });
  },

  put(endpoint, body, headers = {}) {
    return this.request(endpoint, { method: 'PUT', body, headers });
  },

  delete(endpoint, headers = {}) {
    return this.request(endpoint, { method: 'DELETE', headers });
  },

  /* --------------------------------------------------------------------------
     AUTH API
     -------------------------------------------------------------------------- */
  async login(identifier, password) {
    const data = await this.post('/api/auth/login', { identifier, password });
    if (data.token) {
      sessionStorage.setItem('webbanmt_token', data.token);
      localStorage.setItem('webbanmt_token', data.token);
    }
    return data.user;
  },

  async register(userData) {
    const data = await this.post('/api/auth/register', userData);
    if (data.token) {
      sessionStorage.setItem('webbanmt_token', data.token);
      localStorage.setItem('webbanmt_token', data.token);
    }
    return data.user;
  },

  async logout() {
    sessionStorage.removeItem('webbanmt_token');
    localStorage.removeItem('webbanmt_token');
    return this.post('/api/auth/logout');
  },

  async getMe() {
    try {
      const res = await this.get('/api/auth/me');
      return res.user || null;
    } catch (e) {
      return null;
    }
  },

  async updateProfile(profileData) {
    const res = await this.put('/api/auth/profile', profileData);
    return res.user;
  },

  async changePassword(oldPassword, newPassword) {
    return this.put('/api/auth/password', { oldPassword, newPassword });
  },

  /* --------------------------------------------------------------------------
     PRODUCTS API
     -------------------------------------------------------------------------- */
  async getProducts(params = {}) {
    const searchParams = new URLSearchParams();
    Object.keys(params).forEach(k => {
      if (params[k] !== null && params[k] !== undefined && params[k] !== '') {
        searchParams.append(k, params[k]);
      }
    });
    const qs = searchParams.toString();
    const endpoint = `/api/products${qs ? '?' + qs : ''}`;
    const res = await this.get(endpoint);
    return res;
  },

  async getProductById(id) {
    return this.get(`/api/products/${encodeURIComponent(id)}`);
  },

  async getCategories() {
    const res = await this.get('/api/products/categories');
    return res.data || [];
  },

  /* --------------------------------------------------------------------------
     ORDERS API
     -------------------------------------------------------------------------- */
  async createOrder(orderPayload) {
    return this.post('/api/orders', orderPayload);
  },

  async getOrders(params = {}) {
    const qs = new URLSearchParams(params).toString();
    const res = await this.get(`/api/orders${qs ? '?' + qs : ''}`);
    return res.orders || [];
  },

  async getOrderById(id, token = '') {
    const url = `/api/orders/${encodeURIComponent(id)}${token ? '?token=' + encodeURIComponent(token) : ''}`;
    const res = await this.get(url);
    return res.order;
  },

  async cancelOrder(id, token = '') {
    const url = `/api/orders/${encodeURIComponent(id)}/cancel${token ? '?token=' + encodeURIComponent(token) : ''}`;
    return this.post(url);
  },

  /* --------------------------------------------------------------------------
     PAYMENT API
     -------------------------------------------------------------------------- */
  async createVnpayUrl(orderCode) {
    return this.post('/api/payments/create-vnpay-url', { orderCode });
  },

  async verifyVnpayReturn(queryString) {
    return this.get(`/api/payments/vnpay-return${queryString}`);
  },

  async simulateSandboxCheckout(orderCode, scenario, bankCode = 'NCB') {
    return this.post('/api/payments/sandbox-checkout', { orderCode, scenario, bankCode });
  },

  /* --------------------------------------------------------------------------
     ADMIN API
     -------------------------------------------------------------------------- */
  async getAdminMetrics() {
    const res = await this.get('/api/admin/metrics');
    return res.data;
  },

  async getAdminProducts(params = {}) {
    const qs = new URLSearchParams(params).toString();
    const res = await this.get(`/api/admin/products${qs ? '?' + qs : ''}`);
    return res.data || [];
  },

  async createAdminProduct(productData) {
    return this.post('/api/admin/products', productData);
  },

  async updateAdminProduct(id, productData) {
    return this.put(`/api/admin/products/${encodeURIComponent(id)}`, productData);
  },

  async deleteAdminProduct(id) {
    return this.delete(`/api/admin/products/${encodeURIComponent(id)}`);
  },

  async getAdminOrders(params = {}) {
    const qs = new URLSearchParams(params).toString();
    const res = await this.get(`/api/admin/orders${qs ? '?' + qs : ''}`);
    return res.data || [];
  },

  async updateAdminOrderStatus(orderId, status) {
    return this.put(`/api/admin/orders/${encodeURIComponent(orderId)}/status`, { status });
  },

  async getAdminUsers(params = {}) {
    const qs = new URLSearchParams(params).toString();
    const res = await this.get(`/api/admin/users${qs ? '?' + qs : ''}`);
    return res.data || [];
  },

  async createAdminUser(userData) {
    return this.post('/api/admin/users', userData);
  },

  async updateAdminUser(userId, userData) {
    return this.put(`/api/admin/users/${encodeURIComponent(userId)}`, userData);
  },

  async deleteAdminUser(userId) {
    return this.delete(`/api/admin/users/${encodeURIComponent(userId)}`);
  },

  async toggleAdminUserLock(userId) {
    return this.put(`/api/admin/users/${encodeURIComponent(userId)}/toggle-lock`);
  },

  async getAdminReports() {
    const res = await this.get('/api/admin/reports');
    return res.data;
  }
};

window.Api = Api;
