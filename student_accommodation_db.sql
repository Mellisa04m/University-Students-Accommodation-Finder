-- phpMyAdmin SQL Dump
-- version 3.4.5
-- http://www.phpmyadmin.net
--
-- Host: localhost
-- Generation Time: Feb 21, 2026 at 12:35 AM
-- Server version: 5.5.16
-- PHP Version: 5.3.8

SET SQL_MODE="NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;

--
-- Database: `student_accommodation_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `booking`
--

CREATE TABLE IF NOT EXISTS `booking` (
  `booking_id` int(11) NOT NULL AUTO_INCREMENT,
  `student_id` int(11) NOT NULL,
  `listing_id` int(11) NOT NULL,
  `booking_date` date NOT NULL,
  `STATUS` enum('pending','confirmed','cancelled') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`booking_id`),
  KEY `student_id` (`student_id`),
  KEY `listing_id` (`listing_id`)
) ENGINE=InnoDB  DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=3 ;

--
-- Dumping data for table `booking`
--

INSERT INTO `booking` (`booking_id`, `student_id`, `listing_id`, `booking_date`, `STATUS`, `created_at`) VALUES
(1, 1, 1, '2025-11-15', 'pending', '2026-02-20 10:06:50'),
(2, 4, 4, '2025-10-25', 'confirmed', '2026-02-20 10:06:50');

-- --------------------------------------------------------

--
-- Table structure for table `listing`
--

CREATE TABLE IF NOT EXISTS `listing` (
  `listing_id` int(11) NOT NULL AUTO_INCREMENT,
  `landlord_id` int(11) NOT NULL,
  `title` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `location` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `amenities` text COLLATE utf8mb4_unicode_ci,
  `proximity_to_campus` decimal(5,2) DEFAULT NULL,
  `available_from` date DEFAULT NULL,
  `STATUS` enum('available','booked','unavailable') COLLATE utf8mb4_unicode_ci DEFAULT 'available',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `is_verified` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`listing_id`),
  KEY `landlord_id` (`landlord_id`),
  KEY `idx_location` (`location`),
  KEY `idx_price` (`price`)
) ENGINE=InnoDB  DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=5 ;

--
-- Dumping data for table `listing`
--

INSERT INTO `listing` (`listing_id`, `landlord_id`, `title`, `description`, `location`, `price`, `amenities`, `proximity_to_campus`, `available_from`, `STATUS`, `created_at`, `is_verified`) VALUES
(1, 2, 'Cozy 1-Bedroom in Kilimani', 'Fully furnished, secure compound, near Riara University', 'Kilimani, Nairobi', 25000.00, 'WiFi, Kitchen, Parking, Security', 1.50, '2025-11-01', 'available', '2026-02-20 10:06:50', 1),
(2, 2, 'Modern Studio Apartment', 'Brand new studio with all amenities', 'Westlands, Nairobi', 30000.00, 'WiFi, Gym, Swimming Pool, Security', 2.00, '2025-11-15', 'available', '2026-02-20 10:06:50', 1),
(3, 5, 'Spacious 2-Bedroom House', 'Perfect for sharing, quiet neighborhood', 'Lavington, Nairobi', 45000.00, 'WiFi, Kitchen, Garden, Parking', 3.50, '2025-12-01', 'available', '2026-02-20 10:06:50', 1),
(4, 5, 'Affordable Bedsitter', 'Great for students on budget', 'Ngong Road, Nairobi', 15000.00, 'WiFi, Security', 1.00, '2025-10-25', 'booked', '2026-02-20 10:06:50', 1);

-- --------------------------------------------------------

--
-- Table structure for table `message`
--

CREATE TABLE IF NOT EXISTS `message` (
  `message_id` int(11) NOT NULL AUTO_INCREMENT,
  `sender_id` int(11) NOT NULL,
  `receiver_id` int(11) NOT NULL,
  `listing_id` int(11) DEFAULT NULL,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `message_text` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `sent_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `is_read` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`message_id`),
  KEY `sender_id` (`sender_id`),
  KEY `receiver_id` (`receiver_id`),
  KEY `listing_id` (`listing_id`)
) ENGINE=InnoDB  DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=7 ;

--
-- Dumping data for table `message`
--

INSERT INTO `message` (`message_id`, `sender_id`, `receiver_id`, `listing_id`, `content`, `message_text`, `sent_at`, `is_read`) VALUES
(1, 1, 2, 1, 'Hi, is this apartment still available?', '', '2026-02-20 10:06:50', 0),
(2, 2, 1, 1, 'Yes! When would you like to view it?', '', '2026-02-20 10:06:50', 0),
(3, 1, 2, 1, 'How about this weekend?', '', '2026-02-20 10:06:50', 0),
(4, 4, 5, 4, 'I am interested in the bedsitter', '', '2026-02-20 10:06:50', 0),
(5, 5, 4, 4, 'Great! Let me know when you can view it', '', '2026-02-20 10:06:50', 1),
(6, 4, 5, NULL, 'Is Monday okay with you??', '', '2026-02-20 11:42:05', 0);

-- --------------------------------------------------------

--
-- Table structure for table `studentverification`
--

CREATE TABLE IF NOT EXISTS `studentverification` (
  `student_verification_id` int(11) NOT NULL AUTO_INCREMENT,
  `student_id` int(11) NOT NULL,
  `landlord_id` int(11) NOT NULL,
  `document_url` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `document_type` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT 'student_id',
  `status` enum('pending','approved','rejected') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `notes` text COLLATE utf8mb4_unicode_ci,
  `submitted_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `reviewed_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`student_verification_id`),
  KEY `student_id` (`student_id`),
  KEY `landlord_id` (`landlord_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=1 ;

-- --------------------------------------------------------

--
-- Table structure for table `user`
--

CREATE TABLE IF NOT EXISTS `user` (
  `user_id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` enum('student','landlord','admin') COLLATE utf8mb4_unicode_ci NOT NULL,
  `full_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone_number` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `is_verified` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_email` (`email`),
  KEY `idx_role` (`role`)
) ENGINE=InnoDB  DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=9 ;

--
-- Dumping data for table `user`
--

INSERT INTO `user` (`user_id`, `username`, `email`, `password_hash`, `role`, `full_name`, `phone_number`, `created_at`, `is_verified`) VALUES
(1, 'john_paul', 'john@riara.ac.ke', '$2b$12$Ty//RwqDnm9EPpnolbVkp.3wjgK6Dwq3rcpqRlw5Gj8pY.T8vWN9u', 'student', 'John Paul', '0712345678', '2026-02-20 10:06:50', 1),
(2, 'jane_smith', 'jane.landlord@gmail.com', '$2b$12$Ty//RwqDnm9EPpnolbVkp.3wjgK6Dwq3rcpqRlw5Gj8pY.T8vWN9u', 'landlord', 'Jane Smith', '0723456789', '2026-02-20 10:06:50', 1),
(3, 'admin_riara', 'admin@riara.ac.ke', '$2b$12$Ty//RwqDnm9EPpnolbVkp.3wjgK6Dwq3rcpqRlw5Gj8pY.T8vWN9u', 'admin', 'Riara Admin', '0734567890', '2026-02-20 10:06:50', 1),
(4, 'mary_student', 'mary@riara.ac.ke', '$2b$12$Ty//RwqDnm9EPpnolbVkp.3wjgK6Dwq3rcpqRlw5Gj8pY.T8vWN9u', 'student', 'Mary Johnson', '0745678901', '2026-02-20 10:06:50', 1),
(5, 'peter_landlord', 'peter@gmail.com', '$2b$12$Ty//RwqDnm9EPpnolbVkp.3wjgK6Dwq3rcpqRlw5Gj8pY.T8vWN9u', 'landlord', 'Peter Kamau', '0756789012', '2026-02-20 10:06:50', 1),
(6, 'Mellisa', 'mellisaawuor@riarauniversity.ac.ke', '$2b$12$PTcmo/6x/6oV1bTrwCyA0u5WS3oLhyL6mFNAOeLrhBGOWlB1.BkPu', 'student', 'Mellisa Awuor', '0701480923', '2026-02-20 11:03:55', 1),
(7, 'Cris', 'cristabellandlord@gmail.com', '$2b$12$K2SQJ6.VQ/0/G2an/A63EuL.VkUOuhAxKCl2Tcj.Jwihdwb9ix/f.', 'landlord', 'Cristabel Owino', '0101470923', '2026-02-20 12:56:37', 1),
(8, 'Kabbis', 'kabbis@riarauniversity.ac.ke', '$2b$12$qNyfLkawbCyWGvsm7hu7aOp/vfw0tY7dgplk.B/RV.rmAfebu6Ieu', 'student', 'Lauryn Kabbis', '0722413451', '2026-02-20 15:34:50', 0);

-- --------------------------------------------------------

--
-- Table structure for table `verification`
--

CREATE TABLE IF NOT EXISTS `verification` (
  `verification_id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `verification_type` enum('national_id','title_deed','utility_bill','other') COLLATE utf8mb4_unicode_ci NOT NULL,
  `document_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('pending','approved','rejected') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `verified_by` int(11) DEFAULT NULL,
  `verified_at` datetime DEFAULT NULL,
  PRIMARY KEY (`verification_id`),
  KEY `user_id` (`user_id`),
  KEY `verified_by` (`verified_by`)
) ENGINE=InnoDB  DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=5 ;

--
-- Dumping data for table `verification`
--

INSERT INTO `verification` (`verification_id`, `user_id`, `verification_type`, `document_url`, `status`, `verified_by`, `verified_at`) VALUES
(1, 2, 'national_id', 'https://example.com/id_jane.pdf', 'approved', 3, '2025-10-20 10:00:00'),
(2, 5, 'title_deed', 'https://example.com/deed_peter.pdf', 'approved', 3, '2025-10-21 14:30:00'),
(3, 1, 'national_id', 'https://example.com/id_john.pdf', 'approved', 3, '2025-10-19 09:00:00'),
(4, 7, 'national_id', 'http://www.testingmcafeesites.com/index.html', 'approved', 3, '2026-02-20 16:04:07');

--
-- Constraints for dumped tables
--

--
-- Constraints for table `booking`
--
ALTER TABLE `booking`
  ADD CONSTRAINT `booking_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `user` (`user_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `booking_ibfk_2` FOREIGN KEY (`listing_id`) REFERENCES `listing` (`listing_id`) ON DELETE CASCADE;

--
-- Constraints for table `listing`
--
ALTER TABLE `listing`
  ADD CONSTRAINT `listing_ibfk_1` FOREIGN KEY (`landlord_id`) REFERENCES `user` (`user_id`) ON DELETE CASCADE;

--
-- Constraints for table `message`
--
ALTER TABLE `message`
  ADD CONSTRAINT `message_ibfk_1` FOREIGN KEY (`sender_id`) REFERENCES `user` (`user_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `message_ibfk_2` FOREIGN KEY (`receiver_id`) REFERENCES `user` (`user_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `message_ibfk_3` FOREIGN KEY (`listing_id`) REFERENCES `listing` (`listing_id`) ON DELETE SET NULL;

--
-- Constraints for table `studentverification`
--
ALTER TABLE `studentverification`
  ADD CONSTRAINT `studentverification_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `user` (`user_id`),
  ADD CONSTRAINT `studentverification_ibfk_2` FOREIGN KEY (`landlord_id`) REFERENCES `user` (`user_id`);

--
-- Constraints for table `verification`
--
ALTER TABLE `verification`
  ADD CONSTRAINT `verification_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`user_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `verification_ibfk_2` FOREIGN KEY (`verified_by`) REFERENCES `user` (`user_id`) ON DELETE SET NULL;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
