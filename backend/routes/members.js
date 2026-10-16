const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// POST /api/members/register
router.post('/register', async (req, res) => {
  try {
    const { user_name, phone, password } = req.body;

    // 1. 檢查必填欄位
    if (
      typeof user_name !== 'string' ||
      typeof phone !== 'string' ||
      typeof password !== 'string' ||
      !user_name.trim() ||
      !phone.trim() ||
      !password
    ) {
      return res.status(400).json({
        message: '姓名、手機號碼與密碼皆為必填',
      });
    }

    // 2. 檢查密碼長度
    if (password.length < 8) {
      return res.status(400).json({
        message: '密碼至少需要 8 個字元',
      });
    }

    // 3. 檢查手機號碼是否已註冊
    const existing = await pool.query(
      'SELECT user_id FROM members WHERE phone = $1',
      [phone.trim()]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({
        message: '此手機號碼已註冊',
      });
    }

    // 4. 雜湊密碼
    const password_hash = await bcrypt.hash(password, 10);

    // 5. 新增會員
    const result = await pool.query(
      `INSERT INTO members (user_name, phone, password_hash)
       VALUES ($1, $2, $3)
       RETURNING user_id, user_name, phone`,
      [user_name.trim(), phone.trim(), password_hash]
    );

    return res.status(201).json({
      message: '註冊成功',
      member: result.rows[0],
    });
  } catch (error) {
    console.error('會員註冊失敗：', error.message);

    if (error.code === '23505') {
      return res.status(409).json({
        message: '此手機號碼已註冊',
      });
    }

    return res.status(500).json({
      message: '伺服器發生錯誤',
    });
  }
});


const jwt = require('jsonwebtoken');

// POST /api/members/login
router.post('/login', async (req, res) => {
  try {
    const { phone, password } = req.body;

    // 1. 檢查必填欄位
    if (
      typeof phone !== 'string' ||
      typeof password !== 'string' ||
      !phone.trim() ||
      !password
    ) {
      return res.status(400).json({
        message: '手機號碼與密碼皆為必填',
      });
    }

    // 2. 查詢會員
    const result = await pool.query(
      `SELECT user_id, user_name, phone, password_hash, is_admin
       FROM members
       WHERE phone = $1`,
      [phone.trim()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        message: '手機號碼或密碼錯誤',
      });
    }

    const member = result.rows[0];

    // 3. 驗證密碼
    const passwordMatch = await bcrypt.compare(
      password,
      member.password_hash
    );

    if (!passwordMatch) {
      return res.status(401).json({
        message: '手機號碼或密碼錯誤',
      });
    }

    // 4. 確認 JWT_SECRET 已設定
    if (!process.env.JWT_SECRET) {
      console.error('缺少 JWT_SECRET 設定');
      return res.status(500).json({
        message: '伺服器設定錯誤',
      });
    }

    // 5. 簽發 JWT Token
    const token = jwt.sign(
      {
        user_id: member.user_id,
        is_admin: member.is_admin,
      },
      process.env.JWT_SECRET,
      { expiresIn: '2h' }
    );

    return res.json({
      message: '登入成功',
      token,
      member: {
        user_id: member.user_id,
        user_name: member.user_name,
        phone: member.phone,
        is_admin: member.is_admin,
      },
    });
  } catch (error) {
    console.error('會員登入失敗：', error.message);
    return res.status(500).json({
      message: '伺服器發生錯誤',
    });
  }
});

// GET /api/members/admin/all
// 管理員查詢所有會員
router.get('/admin/all', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT user_id, user_name, phone, is_admin
       FROM members
       ORDER BY user_id ASC`
    );

    return res.json({
      members: result.rows,
    });
  } catch (error) {
    console.error('管理員查詢會員失敗：', error.message);

    return res.status(500).json({
      message: '查詢會員資料時發生錯誤',
    });
  }
});


router.put('/admin/:id', authenticateToken, requireAdmin, async (req, res) => {
  const userId = Number(req.params.id)
  const { user_name, phone, is_admin } = req.body

  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ message: '會員編號不正確' })
  }

  if (
    typeof user_name !== 'string' ||
    !user_name.trim() ||
    typeof phone !== 'string' ||
    !phone.trim() ||
    typeof is_admin !== 'boolean'
  ) {
    return res.status(400).json({
      message: '請提供有效的姓名、電話及會員權限',
    })
  }

  try {
    const result = await pool.query(
      `UPDATE members
       SET user_name = $1,
           phone = $2,
           is_admin = $3
       WHERE user_id = $4
       RETURNING user_id, user_name, phone, is_admin`,
      [user_name.trim(), phone.trim(), is_admin, userId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ message: '找不到這位會員' })
    }

    return res.json({
      message: '會員資料更新成功',
      member: result.rows[0],
    })
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({
        message: '這個電話號碼已被其他會員使用',
      })
    }

    console.error('更新會員資料失敗：', error.message)

    return res.status(500).json({
      message: '更新會員資料時發生錯誤',
    })
  }
})


/**
 * DELETE /api/members/admin/:id
 * 管理員刪除會員
 */
router.delete(
  '/admin/:id',
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    const memberId = Number(req.params.id);

    if (!Number.isSafeInteger(memberId) || memberId <= 0) {
      return res.status(400).json({
        message: '會員編號不正確',
      });
    }

    // 使用共用資料庫連線池
    let client;

    try {
      client = await pool.connect();
      await client.query('BEGIN');

      // 鎖定會員資料，避免同時修改
      const memberResult = await client.query(
        `SELECT user_id, is_admin
         FROM members
         WHERE user_id = $1
         FOR UPDATE`,
        [memberId]
      );

      if (memberResult.rowCount === 0) {
        await client.query('ROLLBACK');

        return res.status(404).json({
          message: '找不到此會員',
        });
      }

      // 防止管理員刪除自己的帳號
      if (memberId === Number(req.user.user_id)) {
        await client.query('ROLLBACK');

        return res.status(400).json({
          message: '不能刪除目前登入的管理員帳號',
        });
      }

      // 防止透過此功能刪除其他管理員
      if (memberResult.rows[0].is_admin === true) {
        await client.query('ROLLBACK');

        return res.status(403).json({
          message: '此功能不允許刪除管理員帳號',
        });
      }

      // 保留訂單及訂單明細，避免破壞歷史交易紀錄
      const orderResult = await client.query(
        `SELECT 1
         FROM orders
         WHERE user_id = $1
         LIMIT 1`,
        [memberId]
      );

      if (orderResult.rowCount > 0) {
        await client.query('ROLLBACK');

        return res.status(409).json({
          message: '此會員已有訂單，為保留交易紀錄，不能直接刪除',
        });
      }

      await client.query(
        `DELETE FROM members
         WHERE user_id = $1`,
        [memberId]
      );

      await client.query('COMMIT');

      return res.json({
        message: '會員刪除成功',
        user_id: memberId,
      });
    } catch (error) {
      if (client) {
        try {
          await client.query('ROLLBACK');
        } catch (rollbackError) {
          console.error('刪除會員回滾失敗：', rollbackError.message);
        }
      }

      console.error('刪除會員失敗：', error.message);

      return res.status(500).json({
        message: '刪除會員失敗',
      });
    } finally {
      if (client) {
        client.release();
      }
    }
  }
);


module.exports = router;
