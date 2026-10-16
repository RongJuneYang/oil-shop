const multer = require('multer');
const path = require('path');
const express = require('express');
const { Pool } = require('pg');
const {
  authenticateToken,
  requireAdmin,
} = require('../middleware/auth');

const router = express.Router();

const fs = require('fs');

const uploadDir = path.join(__dirname, '../uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;

    cb(null, filename);
  },
});

const upload = multer({
  storage,

  limits: {
    fileSize: 5 * 1024 * 1024,
  },

  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error('只允許上傳 JPG、PNG 或 WebP 圖片'));
    }

    cb(null, true);
  },
});

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});


/**
 * POST /api/products/upload-image
 * 僅限管理員上傳商品圖片
 */
router.post(
  '/upload-image',
  authenticateToken,
  requireAdmin,
  (req, res) => {
    upload.single('image')(req, res, (error) => {
      if (error) {
        if (error instanceof multer.MulterError) {
          if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
              message: '圖片大小不能超過 5 MB',
            })
          }

          return res.status(400).json({
            message: '圖片上傳失敗，請確認檔案大小與格式',
          })
        }

        return res.status(400).json({
          message: error.message || '圖片上傳失敗',
        })
      }

      if (!req.file) {
        return res.status(400).json({
          message: '請選擇要上傳的圖片',
        })
      }

      return res.status(201).json({
        message: '圖片上傳成功',
        image_url: `/uploads/${req.file.filename}`,
      })
    })
  }
)


// GET /api/products
// 查詢所有商品
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         product_id,
         product_name,
         price,
         description,
         stock_quantity,
         image_url
       FROM products
       ORDER BY product_id ASC`
    );

    res.json({
      products: result.rows,
    });
  } catch (error) {
    console.error('查詢商品失敗：', error.message);

    res.status(500).json({
      message: '查詢商品時發生錯誤',
    });
  }
});

// GET /api/products/:id
// 查詢單一商品
router.get('/:id', async (req, res) => {
  try {
    const productId = Number(req.params.id);

    if (!Number.isSafeInteger(productId) || productId <= 0) {
      return res.status(400).json({
        message: '商品編號格式錯誤',
      });
    }

    const result = await pool.query(
      `SELECT
         product_id,
         product_name,
         price,
         description,
         stock_quantity,
         image_url
       FROM products
       WHERE product_id = $1`,
      [productId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: '找不到此商品',
      });
    }

    res.json({
      product: result.rows[0],
    });
  } catch (error) {
    console.error('查詢商品失敗：', error.message);

    res.status(500).json({
      message: '查詢商品時發生錯誤',
    });
  }
});


 // POST /api/products
 // 僅限管理員新增商品
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const {
      product_name,
      price,
      description,
      stock_quantity,
      image_url,
    } = req.body;

    // 檢查必填欄位
    if (
      typeof product_name !== 'string' ||
      !product_name.trim() ||
      typeof description !== 'string' ||
      !description.trim() ||
      price === undefined ||
      stock_quantity === undefined
    ) {
      return res.status(400).json({
        message: '商品名稱、價格、說明與庫存皆為必填',
      });
    }

    const parsedPrice = Number(price);
    const parsedStock = Number(stock_quantity);

    // 檢查價格
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      return res.status(400).json({
        message: '價格必須是大於或等於 0 的數字',
      });
    }

    // 檢查庫存
    if (
      !Number.isSafeInteger(parsedStock) ||
      parsedStock < 0
    ) {
      return res.status(400).json({
        message: '庫存必須是大於或等於 0 的整數',
      });
    }

    // 檢查圖片網址
    if (
      image_url !== undefined &&
      image_url !== null &&
      typeof image_url !== 'string'
    ) {
      return res.status(400).json({
        message: '圖片網址格式錯誤',
      });
    }

    const result = await pool.query(
      `INSERT INTO products
         (product_name, price, description, stock_quantity, image_url)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING product_id, product_name, price,
                 description, stock_quantity, image_url`,
      [
        product_name.trim(),
        parsedPrice,
        description.trim(),
        parsedStock,
        image_url || null,
      ]
    );

    return res.status(201).json({
      message: '商品新增成功',
      product: result.rows[0],
    });
  } catch (error) {
    console.error('新增商品失敗：', error.message);

    return res.status(500).json({
      message: '新增商品時發生錯誤',
    });
  }
});


 // PUT /api/products/:id
 // 僅限管理員修改商品
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const productId = Number(req.params.id);

    if (!Number.isSafeInteger(productId) || productId <= 0) {
      return res.status(400).json({
        message: '商品編號格式錯誤',
      });
    }

    const {
      product_name,
      price,
      description,
      stock_quantity,
      image_url,
    } = req.body;

    if (
      typeof product_name !== 'string' ||
      !product_name.trim() ||
      typeof description !== 'string' ||
      !description.trim() ||
      price === undefined ||
      stock_quantity === undefined
    ) {
      return res.status(400).json({
        message: '商品名稱、價格、說明與庫存皆為必填',
      });
    }

    const parsedPrice = Number(price);
    const parsedStock = Number(stock_quantity);

    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      return res.status(400).json({
        message: '價格必須是大於或等於 0 的數字',
      });
    }

    if (!Number.isSafeInteger(parsedStock) || parsedStock < 0) {
      return res.status(400).json({
        message: '庫存必須是大於或等於 0 的整數',
      });
    }

    if (
      image_url !== undefined &&
      image_url !== null &&
      typeof image_url !== 'string'
    ) {
      return res.status(400).json({
        message: '圖片網址格式錯誤',
      });
    }

    const result = await pool.query(
      `UPDATE products
       SET product_name = $1,
           price = $2,
           description = $3,
           stock_quantity = $4,
           image_url = $5
       WHERE product_id = $6
       RETURNING product_id, product_name, price,
                 description, stock_quantity, image_url`,
      [
        product_name.trim(),
        parsedPrice,
        description.trim(),
        parsedStock,
        image_url || null,
        productId,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: '找不到此商品',
      });
    }

    return res.json({
      message: '商品修改成功',
      product: result.rows[0],
    });
  } catch (error) {
    console.error('修改商品失敗：', error.message);

    return res.status(500).json({
      message: '修改商品時發生錯誤',
    });
  }
});


 // DELETE /api/products/:id
 // 僅限管理員刪除商品
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const productId = Number(req.params.id);

    if (!Number.isSafeInteger(productId) || productId <= 0) {
      return res.status(400).json({
        message: '商品編號格式錯誤',
      });
    }

    const result = await pool.query(
      `DELETE FROM products
       WHERE product_id = $1
       RETURNING product_id, product_name`,
      [productId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: '找不到此商品',
      });
    }

    return res.json({
      message: '商品刪除成功',
      product: result.rows[0],
    });
  } catch (error) {
    console.error('刪除商品失敗：', error.message);

    // 商品若已被訂單明細引用，外鍵限制會阻止刪除
    if (error.code === '23503') {
      return res.status(409).json({
        message: '此商品已有訂單紀錄，無法直接刪除',
      });
    }

    return res.status(500).json({
      message: '刪除商品時發生錯誤',
    });
  }
});


module.exports = router;
