-- ========================================
-- FULL DATA RESET + SAMPLE DATA INSERT
-- Run this anytime to reset and repopulate
-- ========================================

-- Step 1: Disable foreign key checks (to allow TRUNCATE)
SET FOREIGN_KEY_CHECKS = 0;

-- Step 2: Clear all tables (in correct order)
TRUNCATE TABLE Message;
TRUNCATE TABLE Booking;
TRUNCATE TABLE Verification;
TRUNCATE TABLE Listing;
TRUNCATE TABLE User;

-- Step 3: Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- ========================================
-- INSERT SAMPLE DATA
-- ========================================

-- 1. Users
INSERT INTO User (username, email, password_hash, role, full_name, phone_number, is_verified) VALUES
('john_doe', 'john@riara.ac.ke', 'hashed_pass_123', 'student', 'John Doe', '0712345678', 1),
('jane_smith', 'jane.landlord@gmail.com', 'hashed_pass_456', 'landlord', 'Jane Smith', '0723456789', 1),
('admin_riara', 'admin@riara.ac.ke', 'hashed_pass_admin', 'admin', 'Riara Admin', '0734567890', 1),
('mary_student', 'mary@riara.ac.ke', 'hashed_pass_789', 'student', 'Mary Johnson', '0745678901', 1),
('peter_landlord', 'peter@gmail.com', 'hashed_pass_012', 'landlord', 'Peter Kamau', '0756789012', 1);

-- 2. Listings (by Jane Smith and Peter Kamau)
INSERT INTO Listing (landlord_id, title, description, location, price, amenities, proximity_to_campus, available_from, is_verified, status) VALUES
(2, 'Cozy 1-Bedroom in Kilimani', 'Fully furnished, secure compound, near Riara University', 'Kilimani, Nairobi', 25000.00, 'WiFi, Kitchen, Parking, Security', 1.5, '2025-11-01', 1, 'available'),
(2, 'Modern Studio Apartment', 'Brand new studio with all amenities', 'Westlands, Nairobi', 30000.00, 'WiFi, Gym, Swimming Pool, Security', 2.0, '2025-11-15', 1, 'available'),
(5, 'Spacious 2-Bedroom House', 'Perfect for sharing, quiet neighborhood', 'Lavington, Nairobi', 45000.00, 'WiFi, Kitchen, Garden, Parking', 3.5, '2025-12-01', 1, 'available'),
(5, 'Affordable Bedsitter', 'Great for students on budget', 'Ngong Road, Nairobi', 15000.00, 'WiFi, Security', 1.0, '2025-10-25', 1, 'booked');

-- 3. Bookings (John and Mary book listings)
INSERT INTO Booking (student_id, listing_id, booking_date, status) VALUES
(1, 1, '2025-11-15', 'pending'),
(4, 4, '2025-10-25', 'confirmed');

-- 4. Messages (chat between users and landlords)
INSERT INTO Message (sender_id, receiver_id, listing_id, content) VALUES
(1, 2, 1, 'Hi, is this apartment still available?'),
(2, 1, 1, 'Yes! When would you like to view it?'),
(1, 2, 1, 'How about this weekend?'),
(4, 5, 4, 'I am interested in the bedsitter'),
(5, 4, 4, 'Great! Let me know when you can view it');

-- 5. Verification (Approved verifications)
INSERT INTO Verification (user_id, verification_type, document_url, status, verified_by, verified_at) VALUES
(2, 'national_id', 'https://example.com/id_jane.pdf', 'approved', 3, '2025-10-20 10:00:00'),
(5, 'title_deed', 'https://example.com/deed_peter.pdf', 'approved', 3, '2025-10-21 14:30:00'),
(1, 'national_id', 'https://example.com/id_john.pdf', 'approved', 3, '2025-10-19 09:00:00');