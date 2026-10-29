/**
 * Store Anh - Main Application Controller & Shared UI Utilities
 */

// Helper to generate SVG placeholder if offline
function createTechPlaceholder(label, subtitle, color = '#2563EB') {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="450" viewBox="0 0 600 450">
    <rect width="600" height="450" fill="#F8FAFC"/>
    <rect x="20" y="20" width="560" height="410" rx="16" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="2"/>
    <circle cx="300" cy="180" r="70" fill="${color}" fill-opacity="0.1"/>
    <path d="M260 170 L340 170 L340 210 L260 210 Z M280 210 L280 230 L320 230 L320 210" stroke="${color}" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="300" y="280" font-family="sans-serif" font-size="20" font-weight="bold" fill="#0F172A" text-anchor="middle">${label}</text>
    <text x="300" y="310" font-family="sans-serif" font-size="14" fill="#64748B" text-anchor="middle">${subtitle}</text>
    <text x="300" y="390" font-family="sans-serif" font-size="12" font-weight="600" fill="${color}" text-anchor="middle">Store Anh GENUINE HARDWARE</text>
  </svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

const App = {
  async init() {
    this.initToastContainer();
    if (window.auth && typeof window.auth.init === 'function') {
      await window.auth.init();
    }
    this.updateHeaderAuth();
    this.updateCartBadge();
    this.initCategoryNavDraggable();
    this.bindGlobalEvents();
    this.setupImageErrorHandlers();
  },

  /**
   * Draggable and Click-to-Light-Up Category Navigation Bar
   * Silky-smooth drag physics with inertia deceleration and click-to-light-up
   */
  initCategoryNavDraggable() {
    const navWrappers = document.querySelectorAll('.category-navbar');
    if (!navWrappers || navWrappers.length === 0) return;

    navWrappers.forEach(navWrap => {
      const navList = navWrap.querySelector('.category-nav-list');
      if (!navList) return;

      // Inject navigation scroll arrows
      let leftArrow = navWrap.querySelector('.category-nav-arrow-left');
      let rightArrow = navWrap.querySelector('.category-nav-arrow-right');

      if (!leftArrow) {
        leftArrow = document.createElement('button');
        leftArrow.type = 'button';
        leftArrow.className = 'category-nav-arrow category-nav-arrow-left';
        leftArrow.setAttribute('aria-label', 'Cuộn sang trái');
        leftArrow.innerHTML = '‹';
        navWrap.appendChild(leftArrow);
      }

      if (!rightArrow) {
        rightArrow = document.createElement('button');
        rightArrow.type = 'button';
        rightArrow.className = 'category-nav-arrow category-nav-arrow-right';
        rightArrow.setAttribute('aria-label', 'Cuộn sang phải');
        rightArrow.innerHTML = '›';
        navWrap.appendChild(rightArrow);
      }

      const updateArrows = () => {
        const maxScroll = navList.scrollWidth - navList.clientWidth;
        if (maxScroll <= 5) {
          leftArrow.style.display = 'none';
          rightArrow.style.display = 'none';
        } else {
          leftArrow.style.display = 'flex';
          rightArrow.style.display = 'flex';
          leftArrow.style.opacity = navList.scrollLeft <= 5 ? '0.3' : '1';
          leftArrow.style.pointerEvents = navList.scrollLeft <= 5 ? 'none' : 'auto';
          rightArrow.style.opacity = (navList.scrollLeft >= maxScroll - 5) ? '0.3' : '1';
          rightArrow.style.pointerEvents = (navList.scrollLeft >= maxScroll - 5) ? 'none' : 'auto';
        }
      };

      leftArrow.addEventListener('click', (e) => {
        e.preventDefault();
        navList.scrollBy({ left: -260, behavior: 'smooth' });
      });

      rightArrow.addEventListener('click', (e) => {
        e.preventDefault();
        navList.scrollBy({ left: 260, behavior: 'smooth' });
      });

      navList.addEventListener('scroll', updateArrows);
      window.addEventListener('resize', updateArrows);
      setTimeout(updateArrows, 150);

      const items = navList.querySelectorAll('.category-nav-item');
      const params = new URLSearchParams(window.location.search);
      const activeCat = params.get('cat');
      const isProductsPage = window.location.pathname.includes('products.html');
      const isHomePage = window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || window.location.pathname.endsWith('/');

      let matchedItem = null;
      items.forEach(item => {
        const href = item.getAttribute('href') || '';
        if (activeCat && href.includes(`cat=${activeCat}`)) {
          matchedItem = item;
        } else if (!activeCat && (href === 'products.html' || href.endsWith('/products.html'))) {
          if (!matchedItem && (isProductsPage || isHomePage)) {
            matchedItem = item;
          }
        }

        // Click handler: light up item immediately!
        item.addEventListener('click', (e) => {
          if (hasDragged) {
            e.preventDefault();
            e.stopPropagation();
            return;
          }
          items.forEach(i => i.classList.remove('active'));
          item.classList.add('active');

          // If on products.html, seamlessly filter without full page reload
          if (window.location.pathname.includes('products.html') && window.ProductsPage) {
            e.preventDefault();
            const catVal = href.includes('cat=') ? (href.split('cat=')[1] || '').split('&')[0] : '';
            window.ProductsPage.activeFilters.category = catVal;
            const catRadio = document.querySelector(`input[name="catFilter"][value="${catVal}"]`);
            if (catRadio) catRadio.checked = true;
            window.history.pushState({}, '', catVal ? `products.html?cat=${catVal}` : 'products.html');
            window.ProductsPage.currentPage = 1;
            window.ProductsPage.fetchAndRenderCatalog();
          }
        });
      });

      if (matchedItem) {
        items.forEach(i => i.classList.remove('active'));
        matchedItem.classList.add('active');
        setTimeout(() => {
          matchedItem.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }, 150);
      }

      // Silky-Smooth Drag Physics
      let isDown = false;
      let startX = 0;
      let startScrollLeft = 0;
      let hasDragged = false;
      let velocity = 0;
      let lastX = 0;
      let lastTime = 0;
      let animId = null;

      const stopGlide = () => {
        if (animId) {
          cancelAnimationFrame(animId);
          animId = null;
        }
      };

      navList.addEventListener('mousedown', (e) => {
        stopGlide();
        isDown = true;
        hasDragged = false;
        startX = e.pageX;
        startScrollLeft = navList.scrollLeft;
        lastX = e.pageX;
        lastTime = performance.now();
        velocity = 0;
        navList.classList.add('is-dragging');
      });

      window.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        const now = performance.now();
        const deltaX = e.pageX - startX;
        if (Math.abs(deltaX) > 4) {
          hasDragged = true;
        }
        navList.scrollLeft = startScrollLeft - deltaX;

        const dt = now - lastTime;
        if (dt > 0) {
          velocity = (e.pageX - lastX) / dt;
        }
        lastX = e.pageX;
        lastTime = now;
      });

      window.addEventListener('mouseup', () => {
        if (!isDown) return;
        isDown = false;
        navList.classList.remove('is-dragging');

        // Inertia glide deceleration
        if (Math.abs(velocity) > 0.15) {
          let currVelocity = velocity * 16;
          const glide = () => {
            currVelocity *= 0.93;
            navList.scrollLeft -= currVelocity;
            if (Math.abs(currVelocity) > 0.5) {
              animId = requestAnimationFrame(glide);
            } else {
              animId = null;
            }
          };
          glide();
        }

        setTimeout(() => { hasDragged = false; }, 60);
      });

      // Mouse wheel horizontal scroll
      navList.addEventListener('wheel', (e) => {
        if (e.deltaY !== 0) {
          e.preventDefault();
          navList.scrollLeft += e.deltaY;
        }
      }, { passive: false });
    });
  },

  /**
   * Currency formatter in VND: e.g. 15.990.000 ₫
   */
  formatVND(amount) {
    if (isNaN(amount) || amount === null || amount === undefined) return '0 ₫';
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  },

  /**
   * Date and Time formatter in Vietnamese locale
   */
  formatDateTime(isoString) {
    if (!isoString) return '--';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  },

  /**
   * Toast notification builder
   */
  initToastContainer() {
    if (!document.getElementById('toast-container')) {
      const container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }
  },

  showToast(message, type = 'info', title = '') {
    this.initToastContainer();
    const container = document.getElementById('toast-container');

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let defaultTitle = 'Thông báo';
    let iconSvg = 'ℹ️';

    if (type === 'success') {
      defaultTitle = 'Thành công';
      iconSvg = '✅';
    } else if (type === 'danger' || type === 'error') {
      defaultTitle = 'Lỗi';
      iconSvg = '❌';
      toast.className = 'toast toast-danger';
    } else if (type === 'warning') {
      defaultTitle = 'Cảnh báo';
      iconSvg = '⚠️';
    }

    toast.innerHTML = `
      <div class="toast-icon">${iconSvg}</div>
      <div class="toast-content">
        <div class="toast-title">${title || defaultTitle}</div>
        <div class="toast-message">${message}</div>
      </div>
      <button class="toast-close" aria-label="Đóng">&times;</button>
    `;

    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => {
      toast.remove();
    });

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(40px)';
      setTimeout(() => toast.remove(), 250);
    }, 3500);
  },

  /**
   * Universal Modal Dialog Helper
   */
  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  },

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  },

  confirmAction(message, onConfirm, title = 'Xác nhận hành động') {
    let confirmModal = document.getElementById('global-confirm-modal');
    if (!confirmModal) {
      confirmModal = document.createElement('div');
      confirmModal.id = 'global-confirm-modal';
      confirmModal.className = 'modal-overlay';
      confirmModal.innerHTML = `
        <div class="modal-box">
          <div class="modal-header">
            <h3 class="modal-title" id="confirm-modal-title">Xác nhận</h3>
            <button class="modal-close" id="confirm-modal-close">&times;</button>
          </div>
          <div class="modal-body">
            <p id="confirm-modal-msg" style="font-size: 1rem; color: var(--text-body);"></p>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline" id="confirm-modal-cancel">Hủy bỏ</button>
            <button class="btn btn-primary" id="confirm-modal-ok">Đồng ý</button>
          </div>
        </div>
      `;
      document.body.appendChild(confirmModal);
    }

    document.getElementById('confirm-modal-title').textContent = title;
    document.getElementById('confirm-modal-msg').textContent = message;

    const okBtn = document.getElementById('confirm-modal-ok');
    const cancelBtn = document.getElementById('confirm-modal-cancel');
    const closeBtn = document.getElementById('confirm-modal-close');

    const cleanUp = () => {
      confirmModal.classList.remove('active');
      document.body.style.overflow = '';
      okBtn.replaceWith(okBtn.cloneNode(true));
      cancelBtn.replaceWith(cancelBtn.cloneNode(true));
      closeBtn.replaceWith(closeBtn.cloneNode(true));
    };

    document.getElementById('confirm-modal-cancel').onclick = cleanUp;
    document.getElementById('confirm-modal-close').onclick = cleanUp;
    document.getElementById('confirm-modal-ok').onclick = () => {
      cleanUp();
      if (typeof onConfirm === 'function') onConfirm();
    };

    confirmModal.classList.add('active');
    document.body.style.overflow = 'hidden';
  },

  /**
   * Synchronize Cart Counter Badge
   */
  updateCartBadge() {
    const badgeEls = document.querySelectorAll('.badge-cart-count');
    const count = window.db.getCartCount();
    badgeEls.forEach(el => {
      el.textContent = count;
      el.style.display = count > 0 ? 'flex' : 'none';
    });
  },

  /**
   * Synchronize Header Account Status
   */
  updateHeaderAuth() {
    const userWrap = document.getElementById('header-user-menu');
    if (!userWrap) return;

    const user = window.auth ? window.auth.getCurrentUser() : null;
    const isAdmin = window.auth ? window.auth.isAdmin() : false;

    if (user) {
      userWrap.innerHTML = `
        <div class="user-menu-wrap">
          <a href="profile.html" class="header-action-btn">
            <div class="header-action-icon" style="background: var(--accent); color: #fff;">
              ${user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
            </div>
            <div class="header-action-text">
              <span class="header-action-sub">Xin chào,</span>
              <span class="header-action-title">${user.fullName.split(' ').pop()} ▾</span>
            </div>
          </a>
          <div class="user-dropdown">
            <div style="padding: 0.5rem 0.75rem; border-bottom: 1px solid var(--border-color); margin-bottom: 0.25rem;">
              <strong style="display:block; font-size: 0.9rem;">${user.fullName}</strong>
              <small style="color: var(--text-muted);">${user.email}</small>
            </div>
            <a href="profile.html">👤 Thông tin tài khoản</a>
            <a href="orders.html">📦 Đơn hàng của tôi</a>
            ${isAdmin ? `<a href="admin/index.html" style="color: var(--accent); font-weight: 600;">⚡ Trang Quản Trị (Admin)</a>` : ''}
            <div class="user-dropdown-divider"></div>
            <button type="button" id="btn-header-logout" style="color: var(--danger);">🚪 Đăng xuất</button>
          </div>
        </div>
      `;

      const logoutBtn = document.getElementById('btn-header-logout');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
          App.confirmAction('Bạn có chắc chắn muốn đăng xuất?', async () => {
            await window.auth.logout();
          }, 'Đăng xuất');
        });
      }
    } else {
      userWrap.innerHTML = `
        <a href="login.html" class="header-action-btn">
          <div class="header-action-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          </div>
          <div class="header-action-text">
            <span class="header-action-sub">Tài khoản</span>
            <span class="header-action-title">Đăng nhập</span>
          </div>
        </a>
      `;
    }
  },

  /**
   * Bind global header search & cart events
   */
  bindGlobalEvents() {
    window.addEventListener('cartUpdated', () => {
      this.updateCartBadge();
    });

    const searchForm = document.getElementById('global-search-form');
    if (searchForm) {
      searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = searchForm.querySelector('input[name="q"]');
        const q = (input ? input.value : '').trim();
        const currentPath = window.location.pathname;
        const targetPage = currentPath.includes('/admin/') ? '../products.html' : 'products.html';
        window.location.href = `${targetPage}?q=${encodeURIComponent(q)}`;
      });
    }

    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal-overlay')) {
        e.target.classList.remove('active');
        document.body.style.overflow = '';
      }
    });
  },

  /**
   * Image Fallback Handler for missing or broken CDN images
   */
  setupImageErrorHandlers() {
    document.addEventListener('error', (e) => {
      if (e.target.tagName === 'IMG' && !e.target.dataset.hasFailed) {
        e.target.dataset.hasFailed = 'true';
        const label = e.target.alt || 'Sản phẩm Store Anh';
        e.target.src = createTechPlaceholder(label, 'Chính Hãng • Giá Tốt');
      }
    }, true);
  },

  /**
   * Shared Product Card HTML generator
   */
  renderProductCard(product) {
    const isOutOfStock = (product.stock || 0) <= 0;
    const discountBadge = product.discountPercent ? `<span class="product-badge-discount">-${product.discountPercent}%</span>` : '';
    const stockBadge = isOutOfStock
      ? `<span class="product-badge-stock" style="background:#EF4444;">Hết hàng</span>`
      : `<span class="product-badge-stock">Còn hàng</span>`;

    const oldPriceHtml = product.originalPrice
      ? `<span class="product-price-old">${this.formatVND(product.originalPrice)}</span>`
      : '';

    let specPills = '';
    if (product.specs) {
      const keys = Object.keys(product.specs).slice(0, 3);
      specPills = keys.map(k => {
        const val = product.specs[k];
        const shortVal = String(val).split('(')[0].replace(/Intel Core |NVIDIA GeForce /g, '').substring(0, 25);
        return `<span class="spec-pill">${shortVal}</span>`;
      }).join('');
    }

    return `
      <div class="product-card" data-id="${product.id}">
        ${discountBadge}
        ${stockBadge}
        <a href="product-detail.html?id=${product.id}" class="product-thumb-wrap">
          <img src="${product.image || product.fallbackImage}" alt="${product.name}" loading="lazy" onerror="this.src='${product.fallbackImage || ''}'">
        </a>
        <div class="product-info">
          <div class="product-category-brand">
            <span>${product.categoryName}</span>
            <span style="color: var(--accent);">${product.brand}</span>
          </div>
          <a href="product-detail.html?id=${product.id}" class="product-name" title="${product.name}">
            ${product.name}
          </a>
          <div class="product-specs-pills">
            ${specPills}
          </div>
          <div class="product-price-row">
            <span class="product-price-current">${this.formatVND(product.price)}</span>
            ${oldPriceHtml}
          </div>
        </div>
        <div class="product-card-footer">
          <a href="product-detail.html?id=${product.id}" class="btn btn-outline btn-sm" style="padding: 0.45rem 0.6rem;" title="Xem chi tiết">
            👁️
          </a>
          <button type="button" class="btn btn-primary btn-add-cart btn-sm" onclick="App.handleAddToCart('${product.id}')" ${isOutOfStock ? 'disabled' : ''}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
            ${isOutOfStock ? 'Hết hàng' : 'Thêm giỏ'}
          </button>
        </div>
      </div>
    `;
  },

  /**
   * Central Add to Cart handler
   */
  async handleAddToCart(productId, quantity = 1) {
    try {
      await window.db.addToCart(productId, quantity);
      this.showToast('Đã thêm sản phẩm vào giỏ hàng thành công!', 'success', 'Giỏ hàng');
      this.updateCartBadge();
    } catch (err) {
      this.showToast(err.message, 'danger', 'Không thể thêm');
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});

window.App = App;
