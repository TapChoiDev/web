-- ==============================================================================
-- Store Anh - COMPLETE DATABASE SCHEMA (MySQL 8.0 / MariaDB 10.4+)
-- ==============================================================================

CREATE DATABASE IF NOT EXISTS webbanmt_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE webbanmt_db;

-- 1. Roles Table
CREATE TABLE IF NOT EXISTS roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  description VARCHAR(255) NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Users Table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  role_id INT NOT NULL,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  username VARCHAR(100) NOT NULL UNIQUE,
  phone VARCHAR(25) NULL,
  address TEXT NULL,
  password_hash VARCHAR(255) NOT NULL,
  status ENUM('active', 'locked') NOT NULL DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(id) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Categories Table
CREATE TABLE IF NOT EXISTS categories (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  icon VARCHAR(50) NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Products Table
CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sku VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  brand VARCHAR(100) NOT NULL,
  category_id VARCHAR(50) NOT NULL,
  price BIGINT NOT NULL,
  original_price BIGINT NULL,
  discount_percent INT DEFAULT 0,
  stock INT NOT NULL DEFAULT 0,
  image TEXT NOT NULL,
  fallback_image LONGTEXT NULL,
  description TEXT NULL,
  specs_json LONGTEXT NULL,
  rating DECIMAL(3, 2) DEFAULT 5.00,
  review_count INT DEFAULT 0,
  is_featured TINYINT(1) DEFAULT 0,
  is_bestseller TINYINT(1) DEFAULT 0,
  is_new TINYINT(1) DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories(id) ON UPDATE CASCADE,
  INDEX idx_products_brand (brand),
  INDEX idx_products_price (price),
  INDEX idx_products_stock (stock)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Orders Table
CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_code VARCHAR(50) NOT NULL UNIQUE,
  user_id INT NULL,
  customer_name VARCHAR(150) NOT NULL,
  customer_phone VARCHAR(25) NOT NULL,
  customer_email VARCHAR(150) NOT NULL,
  shipping_address TEXT NOT NULL,
  order_note TEXT NULL,
  payment_method ENUM('COD', 'VNPAY') NOT NULL DEFAULT 'COD',
  payment_status ENUM('pending', 'paid', 'failed') NOT NULL DEFAULT 'pending',
  order_status ENUM('cho_xac_nhan', 'dang_giao', 'da_giao', 'da_huy') NOT NULL DEFAULT 'cho_xac_nhan',
  subtotal BIGINT NOT NULL,
  shipping_fee BIGINT NOT NULL DEFAULT 0,
  total BIGINT NOT NULL,
  transaction_no VARCHAR(100) NULL,
  guest_lookup_token VARCHAR(64) NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  delivered_at DATETIME NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  INDEX idx_orders_status (order_status),
  INDEX idx_orders_created (created_at),
  INDEX idx_orders_lookup (order_code, guest_lookup_token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Order Items Table (Stores snapshot of product name, SKU and price at order time)
CREATE TABLE IF NOT EXISTS order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  product_sku VARCHAR(100) NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  product_price BIGINT NOT NULL,
  quantity INT NOT NULL,
  subtotal BIGINT NOT NULL,
  image TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_order_items_product FOREIGN KEY (product_id) REFERENCES products(id) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Payments Table (VNPAY / COD transaction logs)
CREATE TABLE IF NOT EXISTS payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  payment_method VARCHAR(50) NOT NULL,
  amount BIGINT NOT NULL,
  transaction_no VARCHAR(100) NULL,
  response_code VARCHAR(20) NULL,
  bank_code VARCHAR(50) NULL,
  pay_date VARCHAR(30) NULL,
  status ENUM('pending', 'success', 'failed', 'cancelled') NOT NULL DEFAULT 'pending',
  raw_payload LONGTEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_payments_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX idx_payments_txn (transaction_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Inventory Transactions Table (Audit trail for every stock deduction / restock)
CREATE TABLE IF NOT EXISTS inventory_transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  order_id INT NULL,
  type ENUM('SALE_DEDUCT', 'CANCEL_RESTOCK', 'ADMIN_ADJUST', 'INITIAL_STOCK') NOT NULL,
  quantity INT NOT NULL,
  balance_after INT NOT NULL,
  note VARCHAR(255) NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_inv_product FOREIGN KEY (product_id) REFERENCES products(id) ON UPDATE CASCADE,
  CONSTRAINT fk_inv_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL ON UPDATE CASCADE,
  INDEX idx_inv_product_type (product_id, type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
