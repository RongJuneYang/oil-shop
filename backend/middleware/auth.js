
const jwt = require('jsonwebtoken');

// 驗證使用者是否已登入
function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;

  // 檢查 Authorization 標頭
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      message: '請先登入',
    });
  }

  const token = authHeader.slice(7);

  // 確認 JWT_SECRET 已設定
  if (!process.env.JWT_SECRET) {
    console.error('缺少 JWT_SECRET 設定');
    return res.status(500).json({
      message: '伺服器設定錯誤',
    });
  }

  // 驗證 Token
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({
        message: '登入憑證無效或已過期，請重新登入',
      });
    }

    req.user = decoded;
    next();
  });
}

// 檢查使用者是否為管理員
function requireAdmin(req, res, next) {
  if (!req.user || req.user.is_admin !== true) {
    return res.status(403).json({
      message: '權限不足，僅限管理員使用',
    });
  }

  next();
}

module.exports = {
  authenticateToken,
  requireAdmin,
};
