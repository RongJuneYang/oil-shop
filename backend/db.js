
require('dotenv').config({
  path: require('path').join(__dirname, '.env'),
});

const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

pool.on('error', (err) => {
  console.error('資料庫閒置連線發生錯誤：', err.message);
});

module.exports = pool;
