const db = require('../config/db');

function parseProduct(p) {
  if (!p) return null;
  let specs = {};
  if (p.specs_json) {
    try {
      specs = typeof p.specs_json === 'string' ? JSON.parse(p.specs_json) : p.specs_json;
    } catch (e) {
      specs = {};
    }
  }

  return {
    id: p.id,
    sku: p.sku,
    name: p.name,
    brand: p.brand,
    category: p.category_id,
    categoryName: p.category_name || p.category_id,
    price: Number(p.price),
    originalPrice: p.original_price ? Number(p.original_price) : null,
    discountPercent: p.discount_percent,
    stock: p.stock,
    image: p.image,
    fallbackImage: p.fallback_image,
    description: p.description,
    specs: specs,
    rating: parseFloat(p.rating || 5.0),
    reviewCount: p.review_count || 0,
    featured: Boolean(p.is_featured),
    bestSeller: Boolean(p.is_bestseller),
    isNew: Boolean(p.is_new)
  };
}

/**
 * Public catalog listing with searching, filtering, sorting, and pagination
 */
async function getProducts(req, res, next) {
  try {
    const {
      q,
      cat,
      brand,
      minPrice,
      maxPrice,
      inStock,
      featured,
      bestSeller,
      sort,
      page = 1,
      limit = 8
    } = req.query;

    const whereClauses = [];
    const params = [];

    // Search query
    if (q && q.trim()) {
      const searchWord = `%${q.trim()}%`;
      whereClauses.push('(p.name LIKE ? OR p.sku LIKE ? OR p.brand LIKE ? OR c.name LIKE ?)');
      params.push(searchWord, searchWord, searchWord, searchWord);
    }

    // Category filter
    if (cat && cat.trim()) {
      whereClauses.push('p.category_id = ?');
      params.push(cat.trim());
    }

    // Brand filter (can be single string or comma-separated)
    if (brand && brand.trim()) {
      const brands = brand.split(',').map(b => b.trim()).filter(Boolean);
      if (brands.length > 0) {
        whereClauses.push(`p.brand IN (${brands.map(() => '?').join(',')})`);
        params.push(...brands);
      }
    }

    // Price range
    if (minPrice && !isNaN(minPrice)) {
      whereClauses.push('p.price >= ?');
      params.push(Number(minPrice));
    }

    if (maxPrice && !isNaN(maxPrice)) {
      whereClauses.push('p.price <= ?');
      params.push(Number(maxPrice));
    }

    // Stock availability
    if (inStock === 'true' || inStock === '1') {
      whereClauses.push('p.stock > 0');
    }

    // Flags
    if (featured === 'true' || featured === '1') {
      whereClauses.push('p.is_featured = 1');
    }

    if (bestSeller === 'true' || bestSeller === '1') {
      whereClauses.push('p.is_bestseller = 1');
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Count total matches
    const countResult = await db.query(`
      SELECT COUNT(*) AS total
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ${whereSql}
    `, params);

    const total = countResult[0].total;

    // Sorting
    let orderSql = 'ORDER BY p.is_featured DESC, p.id DESC';
    switch (sort) {
      case 'price-asc':
        orderSql = 'ORDER BY p.price ASC';
        break;
      case 'price-desc':
        orderSql = 'ORDER BY p.price DESC';
        break;
      case 'name-asc':
        orderSql = 'ORDER BY p.name ASC';
        break;
      case 'newest':
        orderSql = 'ORDER BY p.is_new DESC, p.created_at DESC';
        break;
      default:
        orderSql = 'ORDER BY p.is_featured DESC, p.id DESC';
    }

    // Pagination
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 8));
    const offset = (pageNum - 1) * limitNum;

    const productsRows = await db.query(`
      SELECT p.*, c.name AS category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ${whereSql}
      ${orderSql}
      LIMIT ? OFFSET ?
    `, [...params, limitNum, offset]);

    res.json({
      success: true,
      data: productsRows.map(parseProduct),
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get product details by ID or SKU
 */
async function getProductById(req, res, next) {
  try {
    const { id } = req.params;

    let rows = await db.query(`
      SELECT p.*, c.name AS category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ? OR p.sku = ?
      LIMIT 1
    `, [id, id]);

    if (rows.length === 0 && String(id).startsWith('prod-')) {
      const idx = parseInt(String(id).replace('prod-', ''), 10) - 1;
      const allRows = await db.query(`
        SELECT p.*, c.name AS category_name
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        ORDER BY p.id ASC
      `);
      if (idx >= 0 && idx < allRows.length) {
        rows = [allRows[idx]];
      }
    }

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Sản phẩm không tồn tại hoặc đã bị gỡ bỏ.'
      });
    }

    const product = parseProduct(rows[0]);

    // Fetch related products
    const relatedRows = await db.query(`
      SELECT p.*, c.name AS category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE (p.category_id = ? OR p.brand = ?) AND p.id != ?
      ORDER BY p.is_featured DESC, p.rating DESC
      LIMIT 4
    `, [product.category, product.brand, product.id]);

    res.json({
      success: true,
      product,
      relatedProducts: relatedRows.map(parseProduct)
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get all product categories with count
 */
async function getCategories(req, res, next) {
  try {
    const rows = await db.query(`
      SELECT c.*, COUNT(p.id) AS product_count
      FROM categories c
      LEFT JOIN products p ON c.id = p.category_id
      GROUP BY c.id
      ORDER BY c.name ASC
    `);

    res.json({
      success: true,
      data: rows.map(r => ({
        id: r.id,
        name: r.name,
        icon: r.icon,
        productCount: Number(r.product_count)
      }))
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getProducts,
  getProductById,
  getCategories,
  parseProduct
};
