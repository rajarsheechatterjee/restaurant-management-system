DROP DATABASE foodapp;

CREATE DATABASE foodapp;

USE foodapp;

CREATE TABLE users(
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
);


CREATE TABLE food_items(
    id INT AUTO_INCREMENT PRIMARY KEY,
    item_name VARCHAR(255) NOT NULL,
    image_url TEXT NOT NULL,
    body MEDIUMTEXT NOT NULL,
    price INT NOT NULL
);

CREATE TABLE order_details(
    id INT AUTO_INCREMENT PRIMARY KEY,
    quantity INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    payment VARCHAR(255) NOT NULL,
    address VARCHAR(255) NOT NULL,
    mobile_no VARCHAR(20) NOT NULL,
    user_id INT NOT NULL,
    food_id INT NOT NULL,
    placed_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(food_id) REFERENCES food_items(id)
);

CREATE TABLE reviews(
    id INT AUTO_INCREMENT PRIMARY KEY,
    review MEDIUMTEXT NOT NULL,
    reviewed_at TIMESTAMP DEFAULT NOW(),
    user_id INT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id)
);
