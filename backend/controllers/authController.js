const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const SALT_ROUNDS = 10;

/**
 * Tạo JWT token từ thông tin user
 */
const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

/**
 * POST /api/auth/register
 * Đăng ký tài khoản mới
 * Body: { email, password, fullName }
 */
const register = async (req, res) => {
  const { email, password, fullName } = req.body;

  // Validate input
  if (!email || !password || !fullName) {
    return res.status(400).json({ error: 'Email, password, and fullName are required.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  try {
    // Kiểm tra email đã tồn tại chưa
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered.' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Tạo user mới
    const newUser = await pool.query(
      `INSERT INTO users (email, password_hash, role)
       VALUES ($1, $2, 'USER')
       RETURNING id, email, role, created_at`,
      [email, passwordHash]
    );

    const user = newUser.rows[0];

    // Tạo profile rỗng cho user
    await pool.query(
      `INSERT INTO profiles (user_id, full_name)
       VALUES ($1, $2)`,
      [user.id, fullName]
    );

    // Tạo và trả về token
    const token = generateToken(user);

    res.status(201).json({
      message: 'Registration successful.',
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        fullName,
        avatarUrl: null,
      },
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

/**
 * POST /api/auth/login
 * Đăng nhập
 * Body: { email, password }
 */
const login = async (req, res) => {
  const { email, password } = req.body;

  // Validate input
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    // Tìm user theo email
    const result = await pool.query(
      `SELECT u.id, u.email, u.password_hash, u.role, p.full_name, p.avatar_url
       FROM users u
       LEFT JOIN profiles p ON p.user_id = u.id
       WHERE u.email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const user = result.rows[0];

    // So sánh password
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Tạo và trả về token
    const token = generateToken(user);

    res.json({
      message: 'Login successful.',
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        fullName: user.full_name,
        avatarUrl: user.avatar_url,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

module.exports = { register, login };
