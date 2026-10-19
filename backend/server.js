
require('dotenv').config({
  path: require('path').join(__dirname, '.env'),
});

const express = require('express');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');

const app = express();

// 靜態圖片
app.use(
  '/uploads',
  express.static(path.join(__dirname, 'uploads'))
);

// 允許的前端來源
const allowedOrigins = [
  'http://localhost:5173',
  'https://rongjuneyang.github.io',
];

// CORS 設定：允許本機及 GitHub Pages 呼叫 API
app.use(
  cors({
    origin: allowedOrigins,
  })
);

app.use(express.json());

// API 路由
app.use('/api/members', require('./routes/members'));
app.use('/api/products', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));

// JWT 驗證中介層
const {
  authenticateToken,
  requireAdmin,
} = require('./middleware/auth');

// 測試：已登入會員
app.get('/api/test-auth', authenticateToken, (req, res) => {
  res.json({
    message: 'JWT 驗證成功',
    user: req.user,
  });
});

// 測試：管理員權限
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

// PostgreSQL 資料庫連線
const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// 健康檢查 API
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

// Render 會自動提供 PORT
const PORT = Number(process.env.PORT) || 3000;

app.listen(PORT, () => {
  console.log(`後端伺服器已啟動，Port：${PORT}`);
});
