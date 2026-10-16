const express = require('express');
const pool = require('../db');
const {
  authenticateToken,
  requireAdmin,
} = require('../middleware/auth');

const router = express.Router();

// POST /api/orders
// 會員建立訂單
router.post('/', authenticateToken, async (req, res) => {
  const { shipping_address, items } = req.body;

  if (
    typeof shipping_address !== 'string' ||
    !shipping_address.trim() ||
    !Array.isArray(items) ||
    items.length === 0
  ) {
    return res.status(400).json({
      message: '收件地址與訂單商品皆為必填',
    });
  }

  // 驗證商品編號及數量
  const quantityByProduct = new Map();

  for (const item of items) {
    const productId = Number(item.product_id);
    const quantity = Number(item.quantity);

    if (
      !Number.isSafeInteger(productId) ||
      productId <= 0 ||
      !Number.isSafeInteger(quantity) ||
      quantity <= 0
    ) {
      return res.status(400).json({
        message: '商品編號或購買數量格式錯誤',
      });
    }

    const newQuantity =
      (quantityByProduct.get(productId) || 0) + quantity;

    if (!Number.isSafeInteger(newQuantity)) {
      return res.status(400).json({
        message: '商品購買數量超出允許範圍',
      });
    }

    quantityByProduct.set(productId, newQuantity);
  }

  let client;

  try {
    client = await pool.connect();
    await client.query('BEGIN');

    let totalAmount = 0;
    const orderItems = [];

    // 依商品編號排序，降低多筆訂單互相等待鎖定的機會
    const productIds = [...quantityByProduct.keys()].sort(
      (a, b) => a - b
    );

    for (const productId of productIds) {
      const quantity = quantityByProduct.get(productId);

      const result = await client.query(
        `SELECT product_id, product_name, price, stock_quantity
         FROM products
         WHERE product_id = $1
         FOR UPDATE`,
        [productId]
      );

      if (result.rows.length === 0) {
        throw Object.assign(new Error('找不到商品'), {
          statusCode: 400,
        });
      }

      const product = result.rows[0];
      const stock = Number(product.stock_quantity);
      const unitPrice = Number(product.price);

      if (stock < quantity) {
        throw Object.assign(
          new Error(`商品「${product.product_name}」庫存不足`),
          { statusCode: 409 }
        );
      }

      if (!Number.isFinite(unitPrice) || unitPrice < 0) {
        throw new Error('商品價格資料不正確');
      }

      totalAmount += unitPrice * quantity;

      if (!Number.isFinite(totalAmount)) {
        throw new Error('訂單金額超出允許範圍');
      }

      orderItems.push({
        productId,
        quantity,
        unitPrice,
      });
    }

    // 建立訂單
    const orderResult = await client.query(
      `INSERT INTO orders
         (user_id, shipping_address, total_amount, status)
       VALUES ($1, $2, $3, $4)
       RETURNING order_id, user_id, shipping_address,
                 total_amount, status, order_date`,
      [
        req.user.user_id,
        shipping_address.trim(),
        totalAmount.toFixed(2),
        '待處理',
      ]
    );

    const order = orderResult.rows[0];

    // 建立訂單明細，並扣除商品庫存
    for (const item of orderItems) {
      await client.query(
        `INSERT INTO order_items
           (order_id, product_id, quantity, unit_price)
         VALUES ($1, $2, $3, $4)`,
        [
          order.order_id,
          item.productId,
          item.quantity,
          item.unitPrice.toFixed(2),
        ]
      );

      await client.query(
        `UPDATE products
         SET stock_quantity = stock_quantity - $1
         WHERE product_id = $2`,
        [item.quantity, item.productId]
      );
    }

    await client.query('COMMIT');

    return res.status(201).json({
      message: '訂單建立成功',
      order,
      items: orderItems.map((item) => ({
        product_id: item.productId,
        quantity: item.quantity,
        unit_price: item.unitPrice,
      })),
    });
  } catch (error) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('訂單交易回滾失敗：', rollbackError.message);
      }
    }

    if (error.statusCode) {
      return res.status(error.statusCode).json({
        message: error.message,
      });
    }

    console.error('建立訂單失敗：', error.message);

    return res.status(500).json({
      message: '建立訂單時發生錯誤',
    });
  } finally {
    if (client) {
      client.release();
    }
  }
});


// GET /api/orders
// 會員查詢自己的訂單
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         o.order_id,
         o.shipping_address,
         o.total_amount,
         o.status,
         o.order_date,
         COALESCE(
           json_agg(
             json_build_object(
               'product_id', oi.product_id,
               'product_name', p.product_name,
               'quantity', oi.quantity,
               'unit_price', oi.unit_price
             )
           ) FILTER (WHERE oi.order_item_id IS NOT NULL),
           '[]'::json
         ) AS items
       FROM orders o
       LEFT JOIN order_items oi
         ON o.order_id = oi.order_id
       LEFT JOIN products p
         ON oi.product_id = p.product_id
       WHERE o.user_id = $1
       GROUP BY o.order_id
       ORDER BY o.order_date DESC`,
      [req.user.user_id]
    );

    return res.json({
      orders: result.rows,
    });
  } catch (error) {
    console.error('查詢會員訂單失敗：', error.message);

    return res.status(500).json({
      message: '查詢訂單時發生錯誤',
    });
  }
});


// GET /api/orders/admin/all
// 管理員查詢所有訂單
router.get(
  '/admin/all',
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT
           o.order_id,
           o.user_id,
           m.user_name,
           m.phone,
           o.shipping_address,
           o.total_amount,
           o.status,
           o.order_date,
           COALESCE(
             json_agg(
               json_build_object(
                 'product_id', oi.product_id,
                 'product_name', p.product_name,
                 'quantity', oi.quantity,
                 'unit_price', oi.unit_price
               )
             ) FILTER (WHERE oi.order_item_id IS NOT NULL),
             '[]'::json
           ) AS items
         FROM orders o
         JOIN members m
           ON o.user_id = m.user_id
         LEFT JOIN order_items oi
           ON o.order_id = oi.order_id
         LEFT JOIN products p
           ON oi.product_id = p.product_id
         GROUP BY o.order_id, m.user_name, m.phone
         ORDER BY o.order_date DESC`
      );

      return res.json({
        orders: result.rows,
      });
    } catch (error) {
      console.error('管理員查詢訂單失敗：', error.message);

      return res.status(500).json({
        message: '查詢所有訂單時發生錯誤',
      });
    }
  }
);


// PUT /api/orders/:id/status
// 管理員更新訂單狀態
router.put(
  '/:id/status',
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    const orderId = Number(req.params.id);
    const { status } = req.body;

    const allowedStatuses = [
      '待處理',
      '已確認',
      '運送中',
      '已完成',
      '已取消',
    ];

    if (!Number.isSafeInteger(orderId) || orderId <= 0) {
      return res.status(400).json({
        message: '訂單編號不正確',
      });
    }

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: '不合法的訂單狀態',
        allowedStatuses,
      });
    }

    try {
      const result = await pool.query(
        `UPDATE orders
         SET status = $1
         WHERE order_id = $2
         RETURNING order_id, user_id, status,
                   order_date, total_amount`,
        [status, orderId]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({
          message: '找不到此訂單',
        });
      }

      return res.json({
        message: '訂單狀態更新成功',
        order: result.rows[0],
      });
    } catch (error) {
      console.error('更新訂單狀態失敗：', error.message);

      return res.status(500).json({
        message: '更新訂單狀態時發生錯誤',
      });
    }
  }
);


// DELETE /api/orders/:id
// 管理員刪除訂單及其明細
router.delete(
  '/:id',
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    const orderId = Number(req.params.id);

    if (!Number.isSafeInteger(orderId) || orderId <= 0) {
      return res.status(400).json({
        message: '訂單編號不正確',
      });
    }

    let client;

    try {
      client = await pool.connect();
      await client.query('BEGIN');

      // 鎖定訂單，避免同時修改或刪除
      const orderResult = await client.query(
        `SELECT order_id
         FROM orders
         WHERE order_id = $1
         FOR UPDATE`,
        [orderId]
      );

      if (orderResult.rowCount === 0) {
        await client.query('ROLLBACK');

        return res.status(404).json({
          message: '找不到此訂單',
        });
      }

      // 先刪除明細，避免留下孤立資料
      await client.query(
        `DELETE FROM order_items
         WHERE order_id = $1`,
        [orderId]
      );

      // 再刪除訂單主檔
      await client.query(
        `DELETE FROM orders
         WHERE order_id = $1`,
        [orderId]
      );

      await client.query('COMMIT');

      return res.json({
        message: '訂單及其明細已成功刪除',
        order_id: orderId,
      });
    } catch (error) {
      if (client) {
        try {
          await client.query('ROLLBACK');
        } catch (rollbackError) {
          console.error('刪除訂單回滾失敗：', rollbackError.message);
        }
      }

      console.error('刪除訂單失敗：', error.message);

      return res.status(500).json({
        message: '刪除訂單時發生錯誤，資料交易已回滾',
      });
    } finally {
      if (client) {
        client.release();
      }
    }
  }
);

module.exports = router;
