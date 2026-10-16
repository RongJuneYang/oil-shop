
-- 1. 會員資料表
CREATE TABLE members (
    user_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_name VARCHAR(50) NOT NULL,
    phone VARCHAR(20) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    is_admin BOOLEAN NOT NULL DEFAULT FALSE
);

-- 2. 商品資料表
CREATE TABLE products (
    product_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    product_name VARCHAR(100) NOT NULL,
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    description TEXT NOT NULL,
    stock_quantity INTEGER NOT NULL DEFAULT 0
        CHECK (stock_quantity >= 0),
    image_url VARCHAR(500)
);

-- 3. 訂單資料表
CREATE TABLE orders (
    order_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES members(user_id),
    shipping_address VARCHAR(255) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0
        CHECK (total_amount >= 0),
    status VARCHAR(20) NOT NULL DEFAULT '待處理'
        CHECK (status IN ('待處理', '已確認', '運送中', '已完成', '已取消')),
    order_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. 訂單明細資料表
CREATE TABLE order_items (
    order_item_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(order_id),
    product_id INTEGER NOT NULL REFERENCES products(product_id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0)
);
