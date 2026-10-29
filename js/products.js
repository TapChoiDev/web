/**
 * Store Anh - Products & Product Detail Logic (REST API Connected)
 */

const ProductsPage = {
  products: [],
  categories: [],
  totalMatches: 0,
  currentPage: 1,
  pageSize: 8,
  activeFilters: {
    search: '',
    category: '',
    brands: [],
    minPrice: null,
    maxPrice: null,
    inStockOnly: false,
    sortBy: 'default'
  },

  async initCatalog() {
    // Parse URL params
    const params = new URLSearchParams(window.location.search);
    if (params.get('q')) {
      this.activeFilters.search = params.get('q').trim();
      const searchInput = document.getElementById('catalog-search-input');
      if (searchInput) searchInput.value = this.activeFilters.search;
    }
    if (params.get('cat')) {
      this.activeFilters.category = params.get('cat').trim();
    }
    if (params.get('brand')) {
      this.activeFilters.brands = [params.get('brand').trim()];
    }

    await this.loadCategoriesAndFilterOptions();
    this.bindCatalogEvents();
    await this.fetchAndRenderCatalog();
  },

  async loadCategoriesAndFilterOptions() {
    try {
      let categories = [];
      try {
        if (window.Api && window.Api.getCategories) {
          categories = await window.Api.getCategories();
        }
      } catch (err) {
        console.warn('Error loading categories from API, using fallback:', err);
      }

      if (!categories || categories.length === 0) {
        categories = (window.db && window.db.getCategories) ? window.db.getCategories() : (window.DATA_CATEGORIES || []);
      }
      this.categories = categories;

      const catContainer = document.getElementById('filter-categories-list');
      if (catContainer) {
        let html = `
          <label class="filter-item-label">
            <input type="radio" name="catFilter" value="" ${!this.activeFilters.category ? 'checked' : ''}>
            <span>Tất cả danh mục</span>
          </label>
        `;
        this.categories.forEach(cat => {
          const isChecked = this.activeFilters.category === cat.id ? 'checked' : '';
          const countBadge = (cat.productCount !== undefined && cat.productCount !== null) ? `(${cat.productCount})` : '';
          html += `
            <label class="filter-item-label">
              <input type="radio" name="catFilter" value="${cat.id}" ${isChecked}>
              <span>${cat.name}</span>
              <span class="filter-item-count">${countBadge}</span>
            </label>
          `;
        });
        catContainer.innerHTML = html;
      }
    } catch (err) {
      console.error('Error loading categories:', err);
    }
  },

  renderBrands(productsList) {
    const brandContainer = document.getElementById('filter-brands-list');
    if (brandContainer && brandContainer.children.length === 0) {
      const allProds = (window.db && window.db.getProducts) ? window.db.getProducts() : (productsList || []);
      const brandCounts = {};
      allProds.forEach(p => {
        if (p.brand) {
          brandCounts[p.brand] = (brandCounts[p.brand] || 0) + 1;
        }
      });

      let html = '';
      Object.keys(brandCounts).sort().forEach(brand => {
        const isChecked = this.activeFilters.brands.includes(brand) ? 'checked' : '';
        html += `
          <label class="filter-item-label">
            <input type="checkbox" name="brandFilter" value="${brand}" ${isChecked}>
            <span>${brand}</span>
            <span class="filter-item-count">(${brandCounts[brand]})</span>
          </label>
        `;
      });
      brandContainer.innerHTML = html;
    }
  },

  bindCatalogEvents() {
    const catContainer = document.getElementById('filter-categories-list');
    if (catContainer) {
      catContainer.addEventListener('change', (e) => {
        if (e.target.name === 'catFilter') {
          this.activeFilters.category = e.target.value;
          this.currentPage = 1;
          this.fetchAndRenderCatalog();
        }
      });
    }

    const brandContainer = document.getElementById('filter-brands-list');
    if (brandContainer) {
      brandContainer.addEventListener('change', () => {
        const checked = Array.from(brandContainer.querySelectorAll('input[name="brandFilter"]:checked')).map(cb => cb.value);
        this.activeFilters.brands = checked;
        this.currentPage = 1;
        this.fetchAndRenderCatalog();
      });
    }

    const inStockEl = document.getElementById('filter-in-stock');
    if (inStockEl) {
      inStockEl.addEventListener('change', (e) => {
        this.activeFilters.inStockOnly = e.target.checked;
        this.currentPage = 1;
        this.fetchAndRenderCatalog();
      });
    }

    const priceForm = document.getElementById('price-filter-form');
    if (priceForm) {
      priceForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const minVal = parseInt(document.getElementById('price-min').value, 10);
        const maxVal = parseInt(document.getElementById('price-max').value, 10);
        this.activeFilters.minPrice = isNaN(minVal) ? null : minVal;
        this.activeFilters.maxPrice = isNaN(maxVal) ? null : maxVal;
        this.currentPage = 1;
        this.fetchAndRenderCatalog();
      });
    }

    const sortEl = document.getElementById('catalog-sort');
    if (sortEl) {
      sortEl.addEventListener('change', (e) => {
        this.activeFilters.sortBy = e.target.value;
        this.fetchAndRenderCatalog();
      });
    }

    const resetBtn = document.getElementById('btn-reset-filters');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.resetFilters();
      });
    }
  },

  resetFilters() {
    this.activeFilters = {
      search: '',
      category: '',
      brands: [],
      minPrice: null,
      maxPrice: null,
      inStockOnly: false,
      sortBy: 'default'
    };

    const minInput = document.getElementById('price-min');
    const maxInput = document.getElementById('price-max');
    if (minInput) minInput.value = '';
    if (maxInput) maxInput.value = '';

    const inStock = document.getElementById('filter-in-stock');
    if (inStock) inStock.checked = false;

    const sortEl = document.getElementById('catalog-sort');
    if (sortEl) sortEl.value = 'default';

    const brandContainer = document.getElementById('filter-brands-list');
    if (brandContainer) {
      brandContainer.querySelectorAll('input[type="checkbox"]').forEach(c => { c.checked = false; });
    }

    const allCatRadio = document.querySelector('input[name="catFilter"][value=""]');
    if (allCatRadio) allCatRadio.checked = true;

    this.currentPage = 1;
    this.fetchAndRenderCatalog();
  },

  async fetchAndRenderCatalog() {
    const gridEl = document.getElementById('catalog-products-grid');
    const countEl = document.getElementById('catalog-count');
    const paginationEl = document.getElementById('catalog-pagination');
    if (!gridEl) return;

    gridEl.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 3rem;">Đang tải sản phẩm...</div>';

    try {
      const params = {
        page: this.currentPage,
        limit: this.pageSize,
        sort: this.activeFilters.sortBy
      };

      if (this.activeFilters.search) params.q = this.activeFilters.search;
      if (this.activeFilters.category) params.cat = this.activeFilters.category;
      if (this.activeFilters.brands.length > 0) params.brand = this.activeFilters.brands.join(',');
      if (this.activeFilters.minPrice !== null) params.minPrice = this.activeFilters.minPrice;
      if (this.activeFilters.maxPrice !== null) params.maxPrice = this.activeFilters.maxPrice;
      if (this.activeFilters.inStockOnly) params.inStock = 'true';

      let res = null;
      try {
        if (window.Api && window.Api.getProducts) {
          res = await window.Api.getProducts(params);
        }
      } catch (apiErr) {
        console.warn('API error in fetchAndRenderCatalog, using local fallback:', apiErr);
      }

      let totalPages = 1;

      if (res && res.success && Array.isArray(res.data)) {
        this.products = res.data;
        const pagination = res.pagination || { total: this.products.length, totalPages: 1 };
        this.totalMatches = pagination.total;
        totalPages = pagination.totalPages;
      } else {
        // In-memory fallback
        let all = (window.db && window.db.getProducts) ? window.db.getProducts() : (window.DATA_PRODUCTS || []);

        if (this.activeFilters.search) {
          const q = this.activeFilters.search.toLowerCase();
          all = all.filter(p =>
            (p.name && p.name.toLowerCase().includes(q)) ||
            (p.sku && p.sku.toLowerCase().includes(q)) ||
            (p.brand && p.brand.toLowerCase().includes(q))
          );
        }

        if (this.activeFilters.category) {
          all = all.filter(p => (p.category_id || p.category) === this.activeFilters.category);
        }

        if (this.activeFilters.brands.length > 0) {
          all = all.filter(p => this.activeFilters.brands.includes(p.brand));
        }

        if (this.activeFilters.minPrice !== null) {
          all = all.filter(p => p.price >= this.activeFilters.minPrice);
        }
        if (this.activeFilters.maxPrice !== null) {
          all = all.filter(p => p.price <= this.activeFilters.maxPrice);
        }

        if (this.activeFilters.inStockOnly) {
          all = all.filter(p => (p.stock || 0) > 0);
        }

        if (this.activeFilters.sortBy === 'price-asc') {
          all.sort((a, b) => a.price - b.price);
        } else if (this.activeFilters.sortBy === 'price-desc') {
          all.sort((a, b) => b.price - a.price);
        } else if (this.activeFilters.sortBy === 'name-asc') {
          all.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        }

        this.totalMatches = all.length;
        totalPages = Math.ceil(all.length / this.pageSize) || 1;
        const start = (this.currentPage - 1) * this.pageSize;
        this.products = all.slice(start, start + this.pageSize);
      }

      if (countEl) {
        countEl.textContent = `${this.totalMatches} sản phẩm phù hợp`;
      }

      // Populate brand list on first load
      this.renderBrands(this.products);

      if (this.products.length === 0) {
        gridEl.innerHTML = `
          <div class="empty-state" style="grid-column: 1 / -1;">
            <div class="empty-state-icon">🔍</div>
            <h3 class="empty-state-title">Không tìm thấy sản phẩm nào</h3>
            <p class="empty-state-desc">Hãy thử thay đổi từ khóa tìm kiếm hoặc bỏ bớt các tiêu chí lọc đang chọn.</p>
            <button class="btn btn-primary" onclick="ProductsPage.resetFilters()">Xóa tất cả bộ lọc</button>
          </div>
        `;
        if (paginationEl) paginationEl.innerHTML = '';
        return;
      }

      gridEl.innerHTML = this.products.map(p => App.renderProductCard(p)).join('');

      // Render Pagination
      if (paginationEl) {
        if (totalPages <= 1) {
          paginationEl.innerHTML = '';
          return;
        }

        let pagesHtml = '';
        pagesHtml += `<button class="page-item ${this.currentPage === 1 ? 'disabled' : ''}" onclick="ProductsPage.changePage(${this.currentPage - 1})">«</button>`;

        for (let i = 1; i <= totalPages; i++) {
          pagesHtml += `<button class="page-item ${this.currentPage === i ? 'active' : ''}" onclick="ProductsPage.changePage(${i})">${i}</button>`;
        }

        pagesHtml += `<button class="page-item ${this.currentPage === totalPages ? 'disabled' : ''}" onclick="ProductsPage.changePage(${this.currentPage + 1})">»</button>`;
        paginationEl.innerHTML = pagesHtml;
      }
    } catch (err) {
      gridEl.innerHTML = `<div class="empty-state" style="grid-column: 1 / -1; color: var(--danger);">Lỗi tải dữ liệu sản phẩm: ${err.message}</div>`;
    }
  },

  changePage(newPage) {
    if (newPage < 1) return;
    this.currentPage = newPage;
    this.fetchAndRenderCatalog();
    window.scrollTo({ top: 120, behavior: 'smooth' });
  },

  /* --------------------------------------------------------------------------
     PRODUCT DETAIL PAGE
     -------------------------------------------------------------------------- */
  async initDetail() {
    const params = new URLSearchParams(window.location.search);
    const productId = params.get('id');

    if (!productId) {
      window.location.href = 'products.html';
      return;
    }

    const container = document.getElementById('product-detail-container');
    if (!container) return;

    container.innerHTML = '<div style="text-align:center; padding: 4rem;">Đang tải thông tin sản phẩm...</div>';

    let product = null;
    let relatedProducts = [];

    try {
      if (window.Api && window.Api.getProductById) {
        const res = await window.Api.getProductById(productId);
        if (res && res.product) {
          product = res.product;
          relatedProducts = res.relatedProducts || [];
        }
      }
    } catch (err) {
      console.warn('API getProductById error, fallback to local:', err);
    }

    if (!product) {
      const all = (window.db && window.db.getProducts) ? window.db.getProducts() : (window.DATA_PRODUCTS || []);
      product = all.find(p => String(p.id) === String(productId));
      if (product) {
        relatedProducts = all.filter(p => (p.category === product.category || p.category_id === product.category_id) && String(p.id) !== String(product.id)).slice(0, 4);
      }
    }

    if (!product) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">⚠️</div>
          <h2 class="empty-state-title">Sản phẩm không tồn tại</h2>
          <p class="empty-state-desc">Rất tiếc, sản phẩm bạn đang tìm kiếm không tồn tại hoặc đã bị gỡ bỏ.</p>
          <a href="products.html" class="btn btn-primary">Quay lại danh sách sản phẩm</a>
        </div>
      `;
      return;
    }

    document.title = `${product.name} - Store Anh`;
    this.renderProductDetail(product);
    this.renderRelatedProducts(relatedProducts);
  },

  renderProductDetail(product) {
    const container = document.getElementById('product-detail-container');
    if (!container) return;

    const isOutOfStock = (product.stock || 0) <= 0;
    const gallery = [product.image || product.fallbackImage];

    let specsRows = '';
    if (product.specs && typeof product.specs === 'object') {
      Object.entries(product.specs).forEach(([k, v]) => {
        specsRows += `<tr><td>${k}</td><td>${v}</td></tr>`;
      });
    }

    container.innerHTML = `
      <div class="breadcrumb">
        <a href="index.html">Trang chủ</a>
        <span class="breadcrumb-separator">/</span>
        <a href="products.html?cat=${product.category}">${product.categoryName}</a>
        <span class="breadcrumb-separator">/</span>
        <span>${product.brand}</span>
      </div>

      <div class="product-detail-layout">
        <!-- Gallery Column -->
        <div class="detail-gallery">
          <div class="detail-main-img-wrap">
            <img id="detail-main-img" src="${gallery[0]}" alt="${product.name}" onerror="this.src='${product.fallbackImage}'">
          </div>
        </div>

        <!-- Info Column -->
        <div class="detail-info">
          <span class="detail-brand-badge">${product.brand}</span>
          <h1 class="detail-title">${product.name}</h1>
          <div class="detail-meta-row">
            <span>Mã SP: <strong style="color:var(--text-main);">${product.sku}</strong></span>
            <span>Đánh giá: ⭐ <strong>${product.rating || '5.0'}</strong> (${product.reviewCount || 10} nhận xét)</span>
            <span>Tình trạng: <strong style="color:${isOutOfStock ? 'var(--danger)' : 'var(--success)'};">${isOutOfStock ? 'Tạm hết hàng' : `Còn hàng (${product.stock} chiếc)`}</strong></span>
          </div>

          <div class="detail-price-box">
            <span class="detail-price-current">${App.formatVND(product.price)}</span>
            ${product.originalPrice ? `<span class="detail-price-old">${App.formatVND(product.originalPrice)}</span>` : ''}
            ${product.discountPercent ? `<span class="badge badge-danger">Tiết kiệm ${product.discountPercent}%</span>` : ''}
          </div>

          <div style="margin-bottom: 1.5rem;">
            <p style="color: var(--text-body); line-height: 1.6;">${product.description || ''}</p>
          </div>

          <!-- Quantity Stepper -->
          <div class="detail-quantity-row">
            <span style="font-weight: 600; font-size: 0.95rem;">Số lượng:</span>
            <div class="quantity-stepper">
              <button class="qty-btn" type="button" onclick="ProductsPage.changeDetailQty(-1)" ${isOutOfStock ? 'disabled' : ''}>-</button>
              <input type="number" id="detail-qty-input" class="qty-input" value="1" min="1" max="${product.stock || 1}" readonly>
              <button class="qty-btn" type="button" onclick="ProductsPage.changeDetailQty(1)" ${isOutOfStock ? 'disabled' : ''}>+</button>
            </div>
            <span style="color: var(--text-muted); font-size: 0.85rem;">(Có sẵn ${product.stock || 0} sản phẩm)</span>
          </div>

          <!-- Actions -->
          <div class="detail-actions">
            <button class="btn btn-outline-primary btn-lg" type="button" onclick="ProductsPage.addDetailToCart('${product.id}')" ${isOutOfStock ? 'disabled' : ''}>
              🛒 Thêm vào giỏ hàng
            </button>
            <button class="btn btn-primary btn-lg" type="button" onclick="ProductsPage.buyNow('${product.id}')" ${isOutOfStock ? 'disabled' : ''}>
              ⚡ Mua ngay
            </button>
          </div>

          <!-- Policy Box -->
          <div style="background: var(--bg-subtle); border-radius: var(--radius-md); padding: 1.25rem; border: 1px solid var(--border-color); font-size: 0.85rem; display: flex; flex-direction: column; gap: 0.6rem;">
            <div style="display:flex; align-items:center; gap:0.5rem; color:var(--text-main); font-weight:600;">
              🛡️ Chính sách bảo hành & dịch vụ tại Store Anh:
            </div>
            <div>✅ <strong>Bảo hành chính hãng 12 - 36 tháng</strong> tại trung tâm ủy quyền toàn quốc.</div>
            <div>✅ <strong>1 đổi 1 trong 30 ngày</strong> nếu phát sinh lỗi kỹ thuật từ nhà sản xuất.</div>
            <div>✅ <strong>Miễn phí giao hàng tiêu chuẩn</strong> cho mọi đơn hàng máy tính & linh kiện.</div>
            <div>✅ Hỗ trợ trả góp 0%, tư vấn kỹ thuật và vệ sinh máy trọn đời miễn phí.</div>
          </div>
        </div>
      </div>

      <!-- Specs Section -->
      <div class="card" style="padding: 2rem; margin-bottom: 3rem;">
        <h3 style="margin-bottom: 1.25rem; font-size: 1.25rem;">Thông số kỹ thuật chi tiết</h3>
        <table class="specs-table">
          <tbody>
            ${specsRows || '<tr><td colspan="2">Đang cập nhật thông số kỹ thuật.</td></tr>'}
          </tbody>
        </table>
      </div>
    `;
  },

  changeDetailQty(delta) {
    const qtyInput = document.getElementById('detail-qty-input');
    if (!qtyInput) return;

    let val = parseInt(qtyInput.value, 10) || 1;
    const max = parseInt(qtyInput.getAttribute('max'), 10) || 99;

    val += delta;
    if (val < 1) val = 1;
    if (val > max) val = max;

    qtyInput.value = val;
  },

  async addDetailToCart(productId) {
    const qtyInput = document.getElementById('detail-qty-input');
    const qty = parseInt(qtyInput ? qtyInput.value : 1, 10);
    await App.handleAddToCart(productId, qty);
  },

  async buyNow(productId) {
    const qtyInput = document.getElementById('detail-qty-input');
    const qty = parseInt(qtyInput ? qtyInput.value : 1, 10);
    try {
      await window.db.addToCart(productId, qty);
      window.location.href = 'checkout.html';
    } catch (err) {
      App.showToast(err.message, 'danger', 'Lỗi mua ngay');
    }
  },

  renderRelatedProducts(relatedProducts) {
    const relatedWrap = document.getElementById('related-products-grid');
    if (!relatedWrap) return;

    if (!relatedProducts || relatedProducts.length === 0) {
      relatedWrap.innerHTML = '<p style="color:var(--text-muted);">Không có sản phẩm tương tự.</p>';
      return;
    }

    relatedWrap.innerHTML = relatedProducts.map(p => App.renderProductCard(p)).join('');
  }
};

window.ProductsPage = ProductsPage;
