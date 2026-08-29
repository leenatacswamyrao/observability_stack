-- 1. Drop existing tables if they exist (CASCADE handles foreign key relationships)
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 2. Recreate Users Table
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Recreate Products Table
CREATE TABLE products (
    product_id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    stock_quantity INT NOT NULL
);

-- 4. Recreate Orders Table
CREATE TABLE orders (
    order_id VARCHAR(50) PRIMARY KEY,
    user_id INT REFERENCES users(user_id),
    total_amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Seed Fresh Test Data
INSERT INTO users (username, password_hash, email) VALUES
('testuser1', '$2a$12$e8R6.V2UqGf3YxK4lQ.9eO4yZ3.W8M8zJ2k3x4v5b6n7m8a9b0c1d', 'user1@flexcart.com'),
('testuser2', '$2a$12$e8R6.V2UqGf3YxK4lQ.9eO4yZ3.W8M8zJ2k3x4v5b6n7m8a9b0c1d', 'user2@flexcart.com');

INSERT INTO products (product_id, name, category, price, stock_quantity) VALUES
('PROD_99', 'Wireless Headphones', 'electronics', 199.99, 500),
('PROD_100', 'Gaming Keyboard', 'electronics', 89.99, 300);