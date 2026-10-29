require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function migrate() {
  console.log('--- BẮT ĐẦU CHẠY MIGRATION DATABASE Store Anh ---');

  const config = {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true
  };

  const dbName = process.env.DB_NAME || 'webbanmt_db';

  let connection;
  try {
    // 1. Connect without database first to ensure database exists
    connection = await mysql.createConnection(config);
    console.log(`[1/3] Đã kết nối MySQL tại ${config.host}:${config.port}`);

    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    console.log(`[2/3] Cơ sở dữ liệu '${dbName}' đã sẵn sàng.`);

    await connection.changeUser({ database: dbName });

    // 2. Read schema.sql
    const schemaPath = path.join(__dirname, 'schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');

    // 3. Execute schema
    await connection.query(sql);
    console.log('[3/3] Đã tạo thành công toàn bộ bảng: roles, users, categories, products, orders, order_items, payments, inventory_transactions!');
    console.log('✅ Migration hoàn tất thành công 100%!');
  } catch (error) {
    console.error('❌ Lỗi chạy migration:', error.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

if (require.main === module) {
  migrate();
}

module.exports = migrate;
