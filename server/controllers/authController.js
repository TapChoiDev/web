const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { JWT_SECRET } = require('../middlewares/auth');

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
};

function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      role: user.role,
      email: user.email,
      username: user.username
    },
    JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

/**
 * Register a new customer
 */
async function register(req, res, next) {
  try {
    const { fullName, email, username, phone, address, password } = req.body;

    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = username.trim().toLowerCase();

    // Check if email or username already exists
    const existing = await db.query(
      'SELECT id, email, username FROM users WHERE email = ? OR username = ? LIMIT 1',
      [cleanEmail, cleanUsername]
    );

    if (existing.length > 0) {
      if (existing[0].email.toLowerCase() === cleanEmail) {
        return res.status(409).json({ success: false, message: 'Địa chỉ email này đã được sử dụng.' });
      }
      return res.status(409).json({ success: false, message: 'Tên đăng nhập này đã có người sử dụng.' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Insert new customer (role_id = 2)
    const result = await db.query(`
      INSERT INTO users (role_id, full_name, email, username, phone, address, password_hash, status)
      VALUES (2, ?, ?, ?, ?, ?, ?, 'active')
    `, [fullName.trim(), cleanEmail, cleanUsername, phone ? phone.trim() : null, address ? address.trim() : null, passwordHash]);

    const newUser = {
      id: result.insertId,
      role: 'customer',
      role_id: 2,
      fullName: fullName.trim(),
      email: cleanEmail,
      username: cleanUsername,
      phone: phone ? phone.trim() : '',
      address: address ? address.trim() : '',
      status: 'active'
    };

    const token = generateToken(newUser);
    res.cookie('token', token, COOKIE_OPTIONS);

    res.status(201).json({
      success: true,
      message: 'Đăng ký tài khoản thành công!',
      user: newUser,
      token
    });
  } catch (error) {
    next(error);
  }
}

/**
 * User login
 */
async function login(req, res, next) {
  try {
    const { identifier, password } = req.body;
    const cleanId = identifier.trim().toLowerCase();

    const users = await db.query(`
      SELECT u.id, u.role_id, r.name AS role, u.full_name, u.email, u.username, u.phone, u.address, u.password_hash, u.status
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE LOWER(u.email) = ? OR LOWER(u.username) = ?
      LIMIT 1
    `, [cleanId, cleanId]);

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Tài khoản hoặc mật khẩu không chính xác.'
      });
    }

    const user = users[0];

    if (user.status === 'locked') {
      return res.status(403).json({
        success: false,
        message: 'Tài khoản của bạn đã bị khóa bởi Quản trị viên. Vui lòng liên hệ tổng đài hỗ trợ.'
      });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Tài khoản hoặc mật khẩu không chính xác.'
      });
    }

    const safeUser = {
      id: user.id,
      role: user.role,
      role_id: user.role_id,
      fullName: user.full_name,
      email: user.email,
      username: user.username,
      phone: user.phone || '',
      address: user.address || '',
      status: user.status
    };

    const token = generateToken(safeUser);
    res.cookie('token', token, COOKIE_OPTIONS);

    res.json({
      success: true,
      message: 'Đăng nhập thành công!',
      user: safeUser,
      token
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Logout
 */
function logout(req, res) {
  res.clearCookie('token', { httpOnly: true, sameSite: 'lax' });
  res.json({
    success: true,
    message: 'Đăng xuất tài khoản thành công.'
  });
}

/**
 * Get current authenticated user profile
 */
async function me(req, res) {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Chưa đăng nhập.' });
  }
  res.json({
    success: true,
    user: {
      id: req.user.id,
      role: req.user.role,
      role_id: req.user.role_id,
      fullName: req.user.full_name,
      email: req.user.email,
      username: req.user.username,
      phone: req.user.phone || '',
      address: req.user.address || '',
      status: req.user.status
    }
  });
}

/**
 * Update personal profile
 */
async function updateProfile(req, res, next) {
  try {
    const { fullName, phone, address } = req.body;

    if (!fullName || !fullName.trim()) {
      return res.status(400).json({ success: false, message: 'Họ và tên không được để trống.' });
    }

    await db.query(`
      UPDATE users
      SET full_name = ?, phone = ?, address = ?
      WHERE id = ?
    `, [fullName.trim(), phone ? phone.trim() : null, address ? address.trim() : null, req.user.id]);

    const updatedUsers = await db.query(`
      SELECT u.id, u.role_id, r.name AS role, u.full_name, u.email, u.username, u.phone, u.address, u.status
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = ?
    `, [req.user.id]);

    const safeUser = updatedUsers[0];

    res.json({
      success: true,
      message: 'Cập nhật thông tin thành công!',
      user: {
        id: safeUser.id,
        role: safeUser.role,
        fullName: safeUser.full_name,
        email: safeUser.email,
        username: safeUser.username,
        phone: safeUser.phone || '',
        address: safeUser.address || '',
        status: safeUser.status
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Change account password
 */
async function changePassword(req, res, next) {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp mật khẩu cũ và mật khẩu mới.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Mật khẩu mới phải có tối thiểu 6 ký tự.' });
    }

    const rows = await db.query('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản.' });
    }

    const isMatch = await bcrypt.compare(oldPassword, rows[0].password_hash);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Mật khẩu hiện tại không chính xác.' });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, req.user.id]);

    res.json({
      success: true,
      message: 'Đổi mật khẩu thành công!'
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  register,
  login,
  logout,
  me,
  updateProfile,
  changePassword
};
