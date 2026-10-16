require('dotenv').config({
  path: require('path').join(__dirname, '.env'),
});

const express = require('express');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');

const app = express();

app.use(
  '/uploads',
  express.static(path.join(__dirname, 'uploads'))
);

// 允許前端存取後端 API
app.use(cors({
  origin: 'http://localhost:5173',
}));

app.use(express.json());

app.use('/uploads', express.static('uploads'));
app.use('/api/members', require('./routes/members'));
app.use('/api/products', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));


const {
  authenticateToken,
  requireAdmin,
} = require('./middleware/auth');

// 測試：任何已登入的會員都可以存取
app.get('/api/test-auth', authenticateToken, (req, res) => {
  res.json({
    message: 'JWT 驗證成功',
    user: req.user,
  });
});

// 測試：只有管理員可以存取
app.get(
  '/api/test-admin',
  authenticateToken,
  requireAdmin,
  (req, res) => {
    res.json({
      message: '管理員權限驗證成功',
    });
  }
);


const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({
      status: 'ok',
      message: '後端與資料庫連線成功',
    });
  
} catch (error) {
  console.error('資料庫連線失敗：', error);
  res.status(500).json({
    status: 'error',
    message: '資料庫連線失敗',
  });
}
});

const PORT = Number(process.env.PORT) || 3000;

app.listen(PORT, () => {
  console.log(`後端伺服器已啟動：http://localhost:${PORT}`);
});
