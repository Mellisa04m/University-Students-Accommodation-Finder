CREATE DATABASE IF NOT EXISTS student_accommodation_db 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE student_accommodation_db;

-- =========================
-- USER TABLE
-- =========================
CREATE TABLE User (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('student', 'landlord', 'admin') NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_verified TINYINT(1) DEFAULT 0,
    INDEX idx_email (email),
    INDEX idx_role (role)
) ENGINE=InnoDB;

-- =========================
-- LISTING TABLE
-- =========================
CREATE TABLE Listing (
    listing_id INT AUTO_INCREMENT PRIMARY KEY,
    landlord_id INT NOT NULL,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    location VARCHAR(100) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    amenities TEXT,
    proximity_to_campus DECIMAL(5,2),
    available_from DATE,
    status ENUM('available', 'booked', 'unavailable') DEFAULT 'available',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_verified TINYINT(1) DEFAULT 0,
    FOREIGN KEY (landlord_id) 
        REFERENCES User(user_id) 
        ON DELETE CASCADE,
    INDEX idx_location (location),
    INDEX idx_price (price)
) ENGINE=InnoDB;

-- =========================
-- BOOKING TABLE
-- =========================
CREATE TABLE Booking (
    booking_id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    listing_id INT NOT NULL,
    booking_date DATE NOT NULL,
    status ENUM('pending', 'confirmed', 'cancelled') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) 
        REFERENCES User(user_id) 
        ON DELETE CASCADE,
    FOREIGN KEY (listing_id) 
        REFERENCES Listing(listing_id) 
        ON DELETE CASCADE
) ENGINE=InnoDB;

-- =========================
-- MESSAGE TABLE
-- =========================
CREATE TABLE Message (
    message_id INT AUTO_INCREMENT PRIMARY KEY,
    sender_id INT NOT NULL,
    receiver_id INT NOT NULL,
    listing_id INT NULL,
    content TEXT NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_read TINYINT(1) DEFAULT 0,
    FOREIGN KEY (sender_id) 
        REFERENCES User(user_id) 
        ON DELETE CASCADE,
    FOREIGN KEY (receiver_id) 
        REFERENCES User(user_id) 
        ON DELETE CASCADE,
    FOREIGN KEY (listing_id) 
        REFERENCES Listing(listing_id) 
        ON DELETE SET NULL
) ENGINE=InnoDB;

-- =========================
-- VERIFICATION TABLE
-- =========================
CREATE TABLE Verification (
    verification_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    verification_type ENUM('national_id', 'title_deed', 'utility_bill', 'other') NOT NULL,
    document_url VARCHAR(255),
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    verified_by INT NULL,
    verified_at TIMESTAMP NULL DEFAULT NULL,
    FOREIGN KEY (user_id) 
        REFERENCES User(user_id) 
        ON DELETE CASCADE,
    FOREIGN KEY (verified_by) 
        REFERENCES User(user_id) 
        ON DELETE SET NULL
) ENGINE=InnoDB;