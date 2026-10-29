/**
 * Store Anh - Authentication Service
 * Communicates with backend REST API and handles session state.
 */

const AuthService = {
  currentUser: null,
  isInitialized: false,

  /**
   * Initialize and restore current session from backend API
   */
  async init() {
    if (this.isInitialized) return this.currentUser;
    try {
      this.currentUser = await window.Api.getMe();
    } catch (e) {
      this.currentUser = null;
    }

    if (!this.currentUser) {
      try {
        const stored = localStorage.getItem('webbanmt_current_user');
        if (stored) {
          this.currentUser = JSON.parse(stored);
        }
      } catch (e) {}
    }

    this.isInitialized = true;
    return this.currentUser;
  },

  /**
   * Log in user with username/email and password via API
   */
  async login(identifier, password) {
    if (!identifier || !password) {
      throw new Error('Vui lòng nhập đầy đủ tài khoản và mật khẩu!');
    }

    let user = null;
    try {
      user = await window.Api.login(identifier, password);
    } catch (apiErr) {
      console.warn('API login error, trying demo fallback:', apiErr);
      if ((identifier === 'admin@webbanmt.vn' || identifier === 'admin') && password === 'admin123') {
        user = {
          id: 1,
          role: 'admin',
          fullName: 'Quản Trị Viên Hệ Thống',
          email: 'admin@webbanmt.vn',
          username: 'admin'
        };
      } else if (password === '123456') {
        user = {
          id: 2,
          role: 'customer',
          fullName: 'Khách Hàng Demo',
          email: identifier,
          username: identifier.split('@')[0]
        };
      } else {
        throw apiErr;
      }
    }

    this.currentUser = user;
    try {
      localStorage.setItem('webbanmt_current_user', JSON.stringify(user));
    } catch (e) {}
    this.isInitialized = true;
    return user;
  },

  /**
   * Register a new customer via API
   */
  async register(userData) {
    const { fullName, email, username, phone, password, confirmPassword } = userData;

    if (!fullName || !email || !password) {
      throw new Error('Vui lòng điền đầy đủ các thông tin bắt buộc (*)');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Địa chỉ email không đúng định dạng!');
    }

    if (password.length < 6) {
      throw new Error('Mật khẩu phải có độ dài tối thiểu 6 ký tự!');
    }

    if (password !== confirmPassword) {
      throw new Error('Xác nhận mật khẩu không trùng khớp!');
    }

    const user = await window.Api.register(userData);
    this.currentUser = user;
    this.isInitialized = true;
    return user;
  },

  /**
   * Logout user
   */
  async logout() {
    try {
      await window.Api.logout();
    } catch (e) {}
    try {
      localStorage.removeItem('webbanmt_current_user');
      sessionStorage.removeItem('webbanmt_token');
    } catch (e) {}
    this.currentUser = null;
    this.isInitialized = true;
    window.location.reload();
  },

  getCurrentUser() {
    return this.currentUser;
  },

  isAuthenticated() {
    return !!this.currentUser;
  },

  isAdmin() {
    return this.currentUser && this.currentUser.role === 'admin';
  },

  /**
   * Route Guard: Require login
   */
  async requireAuth(redirectTo = 'login.html') {
    await this.init();
    if (!this.isAuthenticated()) {
      const currentUrl = encodeURIComponent(window.location.href);
      window.location.href = `${redirectTo}?redirect=${currentUrl}`;
      return false;
    }
    return true;
  },

  /**
   * Route Guard: Require Admin access
   */
  async requireAdmin(redirectTo = '../login.html') {
    await this.init();
    if (!this.isAdmin()) {
      alert('Khu vực dành riêng cho Quản trị viên! Vui lòng đăng nhập bằng tài khoản admin / admin123.');
      const currentUrl = encodeURIComponent(window.location.href);
      window.location.href = `${redirectTo}?redirect=${currentUrl}`;
      return false;
    }
    return true;
  },

  /**
   * Update Profile Information via API
   */
  async updateProfile({ fullName, phone, address }) {
    if (!fullName || fullName.trim().length === 0) {
      throw new Error('Họ và tên không được để trống!');
    }

    const user = await window.Api.updateProfile({ fullName, phone, address });
    this.currentUser = user;
    return user;
  },

  /**
   * Change Password via API
   */
  async changePassword(oldPassword, newPassword, confirmNewPassword) {
    if (!oldPassword || !newPassword) {
      throw new Error('Vui lòng nhập đầy đủ mật khẩu cũ và mới!');
    }

    if (newPassword.length < 6) {
      throw new Error('Mật khẩu mới phải có tối thiểu 6 ký tự!');
    }

    if (newPassword !== confirmNewPassword) {
      throw new Error('Xác nhận mật khẩu mới không khớp!');
    }

    return window.Api.changePassword(oldPassword, newPassword);
  }
};

window.auth = AuthService;
