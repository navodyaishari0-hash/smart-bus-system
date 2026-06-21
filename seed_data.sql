-- =====================================================
-- Smart Bus System - Complete Seed Data for MySQL
-- Run this entire script in phpMyAdmin SQL tab
-- =====================================================

-- Clear existing data (safe order to respect foreign keys)
SET FOREIGN_KEY_CHECKS = 0;
DELETE FROM `Seats`;
DELETE FROM `Schedules`;
DELETE FROM `Buses`;
DELETE FROM `Routes`;
SET FOREIGN_KEY_CHECKS = 1;

-- 1. ROUTES (Sri Lankan city connections)
INSERT INTO `Routes` (`id`, `name`, `stops`, `distance`, `estimatedDuration`, `createdAt`, `updatedAt`) VALUES
(1, 'Colombo to Kandy', '["Colombo","Kadawatha","Kegalle","Mawanella","Kandy"]', 116.0, '3h 00m', NOW(), NOW()),
(2, 'Colombo to Galle', '["Colombo","Mount Lavinia","Kalutara","Aluthgama","Bentota","Hikkaduwa","Galle"]', 128.0, '2h 45m', NOW(), NOW()),
(3, 'Colombo to Jaffna', '["Colombo","Negombo","Chilaw","Puttalam","Anuradhapura","Vavuniya","Jaffna"]', 396.0, '7h 00m', NOW(), NOW()),
(4, 'Kandy to Nuwara Eliya', '["Kandy","Gampola","Nawalapitiya","Hatton","Nuwara Eliya"]', 75.0, '2h 30m', NOW(), NOW()),
(5, 'Galle to Matara', '["Galle","Ahangama","Weligama","Mirissa","Matara"]', 45.0, '1h 00m', NOW(), NOW()),
(6, 'Colombo to Trincomalee', '["Colombo","Negombo","Kurunegala","Dambulla","Habarana","Trincomalee"]', 257.0, '5h 00m', NOW(), NOW()),
(7, 'Kandy to Batticaloa', '["Kandy","Mahiyangana","Badulla","Ampara","Batticaloa"]', 220.0, '5h 30m', NOW(), NOW()),
(8, 'Colombo to Badulla', '["Colombo","Avissawella","Ratnapura","Balangoda","Haputale","Bandarawela","Badulla"]', 230.0, '5h 45m', NOW(), NOW()),
(9, 'Kandy to Negombo', '["Kandy","Katugastota","Kurunegala","Narammala","Negombo"]', 94.0, '2h 15m', NOW(), NOW());

-- 2. BUSES (fleet - conductorId=NULL for now; assign via Admin Dashboard later)
INSERT INTO `Buses` (`id`, `busNumber`, `capacity`, `type`, `photo`, `status`, `conductorId`, `createdAt`, `updatedAt`) VALUES
(1, 'WP-ND-1001', 40, 'Luxury', '', 'Active', NULL, NOW(), NOW()),
(2, 'WP-ND-1002', 40, 'AC', '', 'Active', NULL, NOW(), NOW()),
(3, 'WP-ND-1003', 45, 'Standard', '', 'Active', NULL, NOW(), NOW()),
(4, 'WP-ND-1004', 40, 'AC', '', 'Active', NULL, NOW(), NOW()),
(5, 'WP-ND-1005', 45, 'Luxury', '', 'Active', NULL, NOW(), NOW()),
(6, 'WP-ND-1006', 40, 'Standard', '', 'Active', NULL, NOW(), NOW()),
(7, 'WP-ND-1007', 45, 'AC', '', 'Active', NULL, NOW(), NOW()),
(8, 'WP-ND-1008', 40, 'Luxury', '', 'Active', NULL, NOW(), NOW()),
(9, 'WP-ND-1009', 40, 'Standard', '', 'Active', NULL, NOW(), NOW()),
(10, 'WP-ND-1010', 45, 'AC', '', 'Active', NULL, NOW(), NOW());

-- 3. SCHEDULES (for today and upcoming days)
SET @today = CURDATE();
SET @tomorrow = DATE_ADD(@today, INTERVAL 1 DAY);
SET @day2 = DATE_ADD(@today, INTERVAL 2 DAY);

INSERT INTO `Schedules` (`id`, `departureDate`, `departureTime`, `fare`, `busId`, `routeId`, `createdAt`, `updatedAt`) VALUES
-- Route 1: Colombo-Kandy
(1, @today,     '06:00 AM', 850,  1, 1, NOW(), NOW()),
(2, @today,     '10:00 AM', 850,  2, 1, NOW(), NOW()),
(3, @today,     '02:00 PM', 750,  3, 1, NOW(), NOW()),
(4, @tomorrow,  '06:00 AM', 850,  1, 1, NOW(), NOW()),
(5, @tomorrow,  '02:00 PM', 750,  2, 1, NOW(), NOW()),

-- Route 2: Colombo-Galle
(6, @today,     '06:30 AM', 950,  4, 2, NOW(), NOW()),
(7, @today,     '09:00 AM', 950,  5, 2, NOW(), NOW()),
(8, @today,     '01:00 PM', 850,  6, 2, NOW(), NOW()),
(9, @tomorrow,  '06:30 AM', 950,  4, 2, NOW(), NOW()),
(10, @tomorrow, '09:00 AM', 950,  5, 2, NOW(), NOW()),

-- Route 3: Colombo-Jaffna
(11, @today,    '05:00 AM', 2200, 7, 3, NOW(), NOW()),
(12, @today,    '10:00 PM', 2500, 8, 3, NOW(), NOW()),
(13, @tomorrow, '05:00 AM', 2200, 7, 3, NOW(), NOW()),

-- Route 4: Kandy-Nuwara Eliya
(14, @today,    '07:00 AM', 500,  9, 4, NOW(), NOW()),
(15, @today,    '12:00 PM', 500,  10, 4, NOW(), NOW()),
(16, @tomorrow, '07:00 AM', 500,  9, 4, NOW(), NOW()),

-- Route 5: Galle-Matara
(17, @today,    '08:00 AM', 350,  1, 5, NOW(), NOW()),
(18, @today,    '11:00 AM', 350,  2, 5, NOW(), NOW()),
(19, @tomorrow, '08:00 AM', 350,  1, 5, NOW(), NOW()),

-- Route 6: Colombo-Trincomalee
(20, @today,    '05:30 AM', 1500, 3, 6, NOW(), NOW()),
(21, @tomorrow, '05:30 AM', 1500, 3, 6, NOW(), NOW()),

-- Route 8: Colombo-Badulla
(22, @today,    '06:00 AM', 1400, 6, 8, NOW(), NOW()),
(23, @tomorrow, '06:00 AM', 1400, 6, 8, NOW(), NOW()),

-- Route 9: Kandy-Negombo
(24, @today,    '07:30 AM', 700,  8, 9, NOW(), NOW()),
(25, @today,    '02:30 PM', 700,  9, 9, NOW(), NOW()),
(26, @tomorrow, '07:30 AM', 700,  8, 9, NOW(), NOW());

-- 4. SEATS (40 seats for each schedule)
-- Schedule 1 (bus 1, cap 40)
INSERT INTO `Seats` (`seatNumber`, `bookedSegments`, `isBroken`, `scheduleId`, `createdAt`, `updatedAt`) VALUES
('S1','[]',0,1,NOW(),NOW()),('S2','[]',0,1,NOW(),NOW()),('S3','[]',0,1,NOW(),NOW()),('S4','[]',0,1,NOW(),NOW()),
('S5','[]',0,1,NOW(),NOW()),('S6','[]',0,1,NOW(),NOW()),('S7','[]',0,1,NOW(),NOW()),('S8','[]',0,1,NOW(),NOW()),
('S9','[]',0,1,NOW(),NOW()),('S10','[]',0,1,NOW(),NOW()),('S11','[]',0,1,NOW(),NOW()),('S12','[]',0,1,NOW(),NOW()),
('S13','[]',0,1,NOW(),NOW()),('S14','[]',0,1,NOW(),NOW()),('S15','[]',0,1,NOW(),NOW()),('S16','[]',0,1,NOW(),NOW()),
('S17','[]',0,1,NOW(),NOW()),('S18','[]',0,1,NOW(),NOW()),('S19','[]',0,1,NOW(),NOW()),('S20','[]',0,1,NOW(),NOW()),
('S21','[]',0,1,NOW(),NOW()),('S22','[]',0,1,NOW(),NOW()),('S23','[]',0,1,NOW(),NOW()),('S24','[]',0,1,NOW(),NOW()),
('S25','[]',0,1,NOW(),NOW()),('S26','[]',0,1,NOW(),NOW()),('S27','[]',0,1,NOW(),NOW()),('S28','[]',0,1,NOW(),NOW()),
('S29','[]',0,1,NOW(),NOW()),('S30','[]',0,1,NOW(),NOW()),('S31','[]',0,1,NOW(),NOW()),('S32','[]',0,1,NOW(),NOW()),
('S33','[]',0,1,NOW(),NOW()),('S34','[]',0,1,NOW(),NOW()),('S35','[]',0,1,NOW(),NOW()),('S36','[]',0,1,NOW(),NOW()),
('S37','[]',0,1,NOW(),NOW()),('S38','[]',0,1,NOW(),NOW()),('S39','[]',0,1,NOW(),NOW()),('S40','[]',0,1,NOW(),NOW());

-- Schedule 2 (bus 2, cap 40)
INSERT INTO `Seats` (`seatNumber`, `bookedSegments`, `isBroken`, `scheduleId`, `createdAt`, `updatedAt`) VALUES
('S1','[]',0,2,NOW(),NOW()),('S2','[]',0,2,NOW(),NOW()),('S3','[]',0,2,NOW(),NOW()),('S4','[]',0,2,NOW(),NOW()),
('S5','[]',0,2,NOW(),NOW()),('S6','[]',0,2,NOW(),NOW()),('S7','[]',0,2,NOW(),NOW()),('S8','[]',0,2,NOW(),NOW()),
('S9','[]',0,2,NOW(),NOW()),('S10','[]',0,2,NOW(),NOW()),('S11','[]',0,2,NOW(),NOW()),('S12','[]',0,2,NOW(),NOW()),
('S13','[]',0,2,NOW(),NOW()),('S14','[]',0,2,NOW(),NOW()),('S15','[]',0,2,NOW(),NOW()),('S16','[]',0,2,NOW(),NOW()),
('S17','[]',0,2,NOW(),NOW()),('S18','[]',0,2,NOW(),NOW()),('S19','[]',0,2,NOW(),NOW()),('S20','[]',0,2,NOW(),NOW()),
('S21','[]',0,2,NOW(),NOW()),('S22','[]',0,2,NOW(),NOW()),('S23','[]',0,2,NOW(),NOW()),('S24','[]',0,2,NOW(),NOW()),
('S25','[]',0,2,NOW(),NOW()),('S26','[]',0,2,NOW(),NOW()),('S27','[]',0,2,NOW(),NOW()),('S28','[]',0,2,NOW(),NOW()),
('S29','[]',0,2,NOW(),NOW()),('S30','[]',0,2,NOW(),NOW()),('S31','[]',0,2,NOW(),NOW()),('S32','[]',0,2,NOW(),NOW()),
('S33','[]',0,2,NOW(),NOW()),('S34','[]',0,2,NOW(),NOW()),('S35','[]',0,2,NOW(),NOW()),('S36','[]',0,2,NOW(),NOW()),
('S37','[]',0,2,NOW(),NOW()),('S38','[]',0,2,NOW(),NOW()),('S39','[]',0,2,NOW(),NOW()),('S40','[]',0,2,NOW(),NOW());

-- Schedule 3 (bus 3, cap 45)
INSERT INTO `Seats` (`seatNumber`, `bookedSegments`, `isBroken`, `scheduleId`, `createdAt`, `updatedAt`) VALUES
('S1','[]',0,3,NOW(),NOW()),('S2','[]',0,3,NOW(),NOW()),('S3','[]',0,3,NOW(),NOW()),('S4','[]',0,3,NOW(),NOW()),
('S5','[]',0,3,NOW(),NOW()),('S6','[]',0,3,NOW(),NOW()),('S7','[]',0,3,NOW(),NOW()),('S8','[]',0,3,NOW(),NOW()),
('S9','[]',0,3,NOW(),NOW()),('S10','[]',0,3,NOW(),NOW()),('S11','[]',0,3,NOW(),NOW()),('S12','[]',0,3,NOW(),NOW()),
('S13','[]',0,3,NOW(),NOW()),('S14','[]',0,3,NOW(),NOW()),('S15','[]',0,3,NOW(),NOW()),('S16','[]',0,3,NOW(),NOW()),
('S17','[]',0,3,NOW(),NOW()),('S18','[]',0,3,NOW(),NOW()),('S19','[]',0,3,NOW(),NOW()),('S20','[]',0,3,NOW(),NOW()),
('S21','[]',0,3,NOW(),NOW()),('S22','[]',0,3,NOW(),NOW()),('S23','[]',0,3,NOW(),NOW()),('S24','[]',0,3,NOW(),NOW()),
('S25','[]',0,3,NOW(),NOW()),('S26','[]',0,3,NOW(),NOW()),('S27','[]',0,3,NOW(),NOW()),('S28','[]',0,3,NOW(),NOW()),
('S29','[]',0,3,NOW(),NOW()),('S30','[]',0,3,NOW(),NOW()),('S31','[]',0,3,NOW(),NOW()),('S32','[]',0,3,NOW(),NOW()),
('S33','[]',0,3,NOW(),NOW()),('S34','[]',0,3,NOW(),NOW()),('S35','[]',0,3,NOW(),NOW()),('S36','[]',0,3,NOW(),NOW()),
('S37','[]',0,3,NOW(),NOW()),('S38','[]',0,3,NOW(),NOW()),('S39','[]',0,3,NOW(),NOW()),('S40','[]',0,3,NOW(),NOW()),
('S41','[]',0,3,NOW(),NOW()),('S42','[]',0,3,NOW(),NOW()),('S43','[]',0,3,NOW(),NOW()),('S44','[]',0,3,NOW(),NOW()),
('S45','[]',0,3,NOW(),NOW());

-- Schedule 4 (bus 1, cap 40)
INSERT INTO `Seats` (`seatNumber`, `bookedSegments`, `isBroken`, `scheduleId`, `createdAt`, `updatedAt`) VALUES
('S1','[]',0,4,NOW(),NOW()),('S2','[]',0,4,NOW(),NOW()),('S3','[]',0,4,NOW(),NOW()),('S4','[]',0,4,NOW(),NOW()),
('S5','[]',0,4,NOW(),NOW()),('S6','[]',0,4,NOW(),NOW()),('S7','[]',0,4,NOW(),NOW()),('S8','[]',0,4,NOW(),NOW()),
('S9','[]',0,4,NOW(),NOW()),('S10','[]',0,4,NOW(),NOW()),('S11','[]',0,4,NOW(),NOW()),('S12','[]',0,4,NOW(),NOW()),
('S13','[]',0,4,NOW(),NOW()),('S14','[]',0,4,NOW(),NOW()),('S15','[]',0,4,NOW(),NOW()),('S16','[]',0,4,NOW(),NOW()),
('S17','[]',0,4,NOW(),NOW()),('S18','[]',0,4,NOW(),NOW()),('S19','[]',0,4,NOW(),NOW()),('S20','[]',0,4,NOW(),NOW()),
('S21','[]',0,4,NOW(),NOW()),('S22','[]',0,4,NOW(),NOW()),('S23','[]',0,4,NOW(),NOW()),('S24','[]',0,4,NOW(),NOW()),
('S25','[]',0,4,NOW(),NOW()),('S26','[]',0,4,NOW(),NOW()),('S27','[]',0,4,NOW(),NOW()),('S28','[]',0,4,NOW(),NOW()),
('S29','[]',0,4,NOW(),NOW()),('S30','[]',0,4,NOW(),NOW()),('S31','[]',0,4,NOW(),NOW()),('S32','[]',0,4,NOW(),NOW()),
('S33','[]',0,4,NOW(),NOW()),('S34','[]',0,4,NOW(),NOW()),('S35','[]',0,4,NOW(),NOW()),('S36','[]',0,4,NOW(),NOW()),
('S37','[]',0,4,NOW(),NOW()),('S38','[]',0,4,NOW(),NOW()),('S39','[]',0,4,NOW(),NOW()),('S40','[]',0,4,NOW(),NOW());

-- Schedule 5 (bus 2, cap 40)
INSERT INTO `Seats` (`seatNumber`, `bookedSegments`, `isBroken`, `scheduleId`, `createdAt`, `updatedAt`) VALUES
('S1','[]',0,5,NOW(),NOW()),('S2','[]',0,5,NOW(),NOW()),('S3','[]',0,5,NOW(),NOW()),('S4','[]',0,5,NOW(),NOW()),
('S5','[]',0,5,NOW(),NOW()),('S6','[]',0,5,NOW(),NOW()),('S7','[]',0,5,NOW(),NOW()),('S8','[]',0,5,NOW(),NOW()),
('S9','[]',0,5,NOW(),NOW()),('S10','[]',0,5,NOW(),NOW()),('S11','[]',0,5,NOW(),NOW()),('S12','[]',0,5,NOW(),NOW()),
('S13','[]',0,5,NOW(),NOW()),('S14','[]',0,5,NOW(),NOW()),('S15','[]',0,5,NOW(),NOW()),('S16','[]',0,5,NOW(),NOW()),
('S17','[]',0,5,NOW(),NOW()),('S18','[]',0,5,NOW(),NOW()),('S19','[]',0,5,NOW(),NOW()),('S20','[]',0,5,NOW(),NOW()),
('S21','[]',0,5,NOW(),NOW()),('S22','[]',0,5,NOW(),NOW()),('S23','[]',0,5,NOW(),NOW()),('S24','[]',0,5,NOW(),NOW()),
('S25','[]',0,5,NOW(),NOW()),('S26','[]',0,5,NOW(),NOW()),('S27','[]',0,5,NOW(),NOW()),('S28','[]',0,5,NOW(),NOW()),
('S29','[]',0,5,NOW(),NOW()),('S30','[]',0,5,NOW(),NOW()),('S31','[]',0,5,NOW(),NOW()),('S32','[]',0,5,NOW(),NOW()),
('S33','[]',0,5,NOW(),NOW()),('S34','[]',0,5,NOW(),NOW()),('S35','[]',0,5,NOW(),NOW()),('S36','[]',0,5,NOW(),NOW()),
('S37','[]',0,5,NOW(),NOW()),('S38','[]',0,5,NOW(),NOW()),('S39','[]',0,5,NOW(),NOW()),('S40','[]',0,5,NOW(),NOW());

-- Schedule 6 (bus 4, cap 40)
INSERT INTO `Seats` (`seatNumber`, `bookedSegments`, `isBroken`, `scheduleId`, `createdAt`, `updatedAt`) VALUES
('S1','[]',0,6,NOW(),NOW()),('S2','[]',0,6,NOW(),NOW()),('S3','[]',0,6,NOW(),NOW()),('S4','[]',0,6,NOW(),NOW()),
('S5','[]',0,6,NOW(),NOW()),('S6','[]',0,6,NOW(),NOW()),('S7','[]',0,6,NOW(),NOW()),('S8','[]',0,6,NOW(),NOW()),
('S9','[]',0,6,NOW(),NOW()),('S10','[]',0,6,NOW(),NOW()),('S11','[]',0,6,NOW(),NOW()),('S12','[]',0,6,NOW(),NOW()),
('S13','[]',0,6,NOW(),NOW()),('S14','[]',0,6,NOW(),NOW()),('S15','[]',0,6,NOW(),NOW()),('S16','[]',0,6,NOW(),NOW()),
('S17','[]',0,6,NOW(),NOW()),('S18','[]',0,6,NOW(),NOW()),('S19','[]',0,6,NOW(),NOW()),('S20','[]',0,6,NOW(),NOW()),
('S21','[]',0,6,NOW(),NOW()),('S22','[]',0,6,NOW(),NOW()),('S23','[]',0,6,NOW(),NOW()),('S24','[]',0,6,NOW(),NOW()),
('S25','[]',0,6,NOW(),NOW()),('S26','[]',0,6,NOW(),NOW()),('S27','[]',0,6,NOW(),NOW()),('S28','[]',0,6,NOW(),NOW()),
('S29','[]',0,6,NOW(),NOW()),('S30','[]',0,6,NOW(),NOW()),('S31','[]',0,6,NOW(),NOW()),('S32','[]',0,6,NOW(),NOW()),
('S33','[]',0,6,NOW(),NOW()),('S34','[]',0,6,NOW(),NOW()),('S35','[]',0,6,NOW(),NOW()),('S36','[]',0,6,NOW(),NOW()),
('S37','[]',0,6,NOW(),NOW()),('S38','[]',0,6,NOW(),NOW()),('S39','[]',0,6,NOW(),NOW()),('S40','[]',0,6,NOW(),NOW());

-- Schedule 7 (bus 5, cap 45)
INSERT INTO `Seats` (`seatNumber`, `bookedSegments`, `isBroken`, `scheduleId`, `createdAt`, `updatedAt`) VALUES
('S1','[]',0,7,NOW(),NOW()),('S2','[]',0,7,NOW(),NOW()),('S3','[]',0,7,NOW(),NOW()),('S4','[]',0,7,NOW(),NOW()),
('S5','[]',0,7,NOW(),NOW()),('S6','[]',0,7,NOW(),NOW()),('S7','[]',0,7,NOW(),NOW()),('S8','[]',0,7,NOW(),NOW()),
('S9','[]',0,7,NOW(),NOW()),('S10','[]',0,7,NOW(),NOW()),('S11','[]',0,7,NOW(),NOW()),('S12','[]',0,7,NOW(),NOW()),
('S13','[]',0,7,NOW(),NOW()),('S14','[]',0,7,NOW(),NOW()),('S15','[]',0,7,NOW(),NOW()),('S16','[]',0,7,NOW(),NOW()),
('S17','[]',0,7,NOW(),NOW()),('S18','[]',0,7,NOW(),NOW()),('S19','[]',0,7,NOW(),NOW()),('S20','[]',0,7,NOW(),NOW()),
('S21','[]',0,7,NOW(),NOW()),('S22','[]',0,7,NOW(),NOW()),('S23','[]',0,7,NOW(),NOW()),('S24','[]',0,7,NOW(),NOW()),
('S25','[]',0,7,NOW(),NOW()),('S26','[]',0,7,NOW(),NOW()),('S27','[]',0,7,NOW(),NOW()),('S28','[]',0,7,NOW(),NOW()),
('S29','[]',0,7,NOW(),NOW()),('S30','[]',0,7,NOW(),NOW()),('S31','[]',0,7,NOW(),NOW()),('S32','[]',0,7,NOW(),NOW()),
('S33','[]',0,7,NOW(),NOW()),('S34','[]',0,7,NOW(),NOW()),('S35','[]',0,7,NOW(),NOW()),('S36','[]',0,7,NOW(),NOW()),
('S37','[]',0,7,NOW(),NOW()),('S38','[]',0,7,NOW(),NOW()),('S39','[]',0,7,NOW(),NOW()),('S40','[]',0,7,NOW(),NOW()),
('S41','[]',0,7,NOW(),NOW()),('S42','[]',0,7,NOW(),NOW()),('S43','[]',0,7,NOW(),NOW()),('S44','[]',0,7,NOW(),NOW()),
('S45','[]',0,7,NOW(),NOW());

-- Schedule 8 (bus 6, cap 40)
INSERT INTO `Seats` (`seatNumber`, `bookedSegments`, `isBroken`, `scheduleId`, `createdAt`, `updatedAt`) VALUES
('S1','[]',0,8,NOW(),NOW()),('S2','[]',0,8,NOW(),NOW()),('S3','[]',0,8,NOW(),NOW()),('S4','[]',0,8,NOW(),NOW()),
('S5','[]',0,8,NOW(),NOW()),('S6','[]',0,8,NOW(),NOW()),('S7','[]',0,8,NOW(),NOW()),('S8','[]',0,8,NOW(),NOW()),
('S9','[]',0,8,NOW(),NOW()),('S10','[]',0,8,NOW(),NOW()),('S11','[]',0,8,NOW(),NOW()),('S12','[]',0,8,NOW(),NOW()),
('S13','[]',0,8,NOW(),NOW()),('S14','[]',0,8,NOW(),NOW()),('S15','[]',0,8,NOW(),NOW()),('S16','[]',0,8,NOW(),NOW()),
('S17','[]',0,8,NOW(),NOW()),('S18','[]',0,8,NOW(),NOW()),('S19','[]',0,8,NOW(),NOW()),('S20','[]',0,8,NOW(),NOW()),
('S21','[]',0,8,NOW(),NOW()),('S22','[]',0,8,NOW(),NOW()),('S23','[]',0,8,NOW(),NOW()),('S24','[]',0,8,NOW(),NOW()),
('S25','[]',0,8,NOW(),NOW()),('S26','[]',0,8,NOW(),NOW()),('S27','[]',0,8,NOW(),NOW()),('S28','[]',0,8,NOW(),NOW()),
('S29','[]',0,8,NOW(),NOW()),('S30','[]',0,8,NOW(),NOW()),('S31','[]',0,8,NOW(),NOW()),('S32','[]',0,8,NOW(),NOW()),
('S33','[]',0,8,NOW(),NOW()),('S34','[]',0,8,NOW(),NOW()),('S35','[]',0,8,NOW(),NOW()),('S36','[]',0,8,NOW(),NOW()),
('S37','[]',0,8,NOW(),NOW()),('S38','[]',0,8,NOW(),NOW()),('S39','[]',0,8,NOW(),NOW()),('S40','[]',0,8,NOW(),NOW());

-- Schedule 11 (bus 7, cap 45)
INSERT INTO `Seats` (`seatNumber`, `bookedSegments`, `isBroken`, `scheduleId`, `createdAt`, `updatedAt`) VALUES
('S1','[]',0,11,NOW(),NOW()),('S2','[]',0,11,NOW(),NOW()),('S3','[]',0,11,NOW(),NOW()),('S4','[]',0,11,NOW(),NOW()),
('S5','[]',0,11,NOW(),NOW()),('S6','[]',0,11,NOW(),NOW()),('S7','[]',0,11,NOW(),NOW()),('S8','[]',0,11,NOW(),NOW()),
('S9','[]',0,11,NOW(),NOW()),('S10','[]',0,11,NOW(),NOW()),('S11','[]',0,11,NOW(),NOW()),('S12','[]',0,11,NOW(),NOW()),
('S13','[]',0,11,NOW(),NOW()),('S14','[]',0,11,NOW(),NOW()),('S15','[]',0,11,NOW(),NOW()),('S16','[]',0,11,NOW(),NOW()),
('S17','[]',0,11,NOW(),NOW()),('S18','[]',0,11,NOW(),NOW()),('S19','[]',0,11,NOW(),NOW()),('S20','[]',0,11,NOW(),NOW()),
('S21','[]',0,11,NOW(),NOW()),('S22','[]',0,11,NOW(),NOW()),('S23','[]',0,11,NOW(),NOW()),('S24','[]',0,11,NOW(),NOW()),
('S25','[]',0,11,NOW(),NOW()),('S26','[]',0,11,NOW(),NOW()),('S27','[]',0,11,NOW(),NOW()),('S28','[]',0,11,NOW(),NOW()),
('S29','[]',0,11,NOW(),NOW()),('S30','[]',0,11,NOW(),NOW()),('S31','[]',0,11,NOW(),NOW()),('S32','[]',0,11,NOW(),NOW()),
('S33','[]',0,11,NOW(),NOW()),('S34','[]',0,11,NOW(),NOW()),('S35','[]',0,11,NOW(),NOW()),('S36','[]',0,11,NOW(),NOW()),
('S37','[]',0,11,NOW(),NOW()),('S38','[]',0,11,NOW(),NOW()),('S39','[]',0,11,NOW(),NOW()),('S40','[]',0,11,NOW(),NOW()),
('S41','[]',0,11,NOW(),NOW()),('S42','[]',0,11,NOW(),NOW()),('S43','[]',0,11,NOW(),NOW()),('S44','[]',0,11,NOW(),NOW()),
('S45','[]',0,11,NOW(),NOW());

-- Schedule 14 (bus 9, cap 40)
INSERT INTO `Seats` (`seatNumber`, `bookedSegments`, `isBroken`, `scheduleId`, `createdAt`, `updatedAt`) VALUES
('S1','[]',0,14,NOW(),NOW()),('S2','[]',0,14,NOW(),NOW()),('S3','[]',0,14,NOW(),NOW()),('S4','[]',0,14,NOW(),NOW()),
('S5','[]',0,14,NOW(),NOW()),('S6','[]',0,14,NOW(),NOW()),('S7','[]',0,14,NOW(),NOW()),('S8','[]',0,14,NOW(),NOW()),
('S9','[]',0,14,NOW(),NOW()),('S10','[]',0,14,NOW(),NOW()),('S11','[]',0,14,NOW(),NOW()),('S12','[]',0,14,NOW(),NOW()),
('S13','[]',0,14,NOW(),NOW()),('S14','[]',0,14,NOW(),NOW()),('S15','[]',0,14,NOW(),NOW()),('S16','[]',0,14,NOW(),NOW()),
('S17','[]',0,14,NOW(),NOW()),('S18','[]',0,14,NOW(),NOW()),('S19','[]',0,14,NOW(),NOW()),('S20','[]',0,14,NOW(),NOW()),
('S21','[]',0,14,NOW(),NOW()),('S22','[]',0,14,NOW(),NOW()),('S23','[]',0,14,NOW(),NOW()),('S24','[]',0,14,NOW(),NOW()),
('S25','[]',0,14,NOW(),NOW()),('S26','[]',0,14,NOW(),NOW()),('S27','[]',0,14,NOW(),NOW()),('S28','[]',0,14,NOW(),NOW()),
('S29','[]',0,14,NOW(),NOW()),('S30','[]',0,14,NOW(),NOW()),('S31','[]',0,14,NOW(),NOW()),('S32','[]',0,14,NOW(),NOW()),
('S33','[]',0,14,NOW(),NOW()),('S34','[]',0,14,NOW(),NOW()),('S35','[]',0,14,NOW(),NOW()),('S36','[]',0,14,NOW(),NOW()),
('S37','[]',0,14,NOW(),NOW()),('S38','[]',0,14,NOW(),NOW()),('S39','[]',0,14,NOW(),NOW()),('S40','[]',0,14,NOW(),NOW());

-- Schedule 17 (bus 1, cap 40)
INSERT INTO `Seats` (`seatNumber`, `bookedSegments`, `isBroken`, `scheduleId`, `createdAt`, `updatedAt`) VALUES
('S1','[]',0,17,NOW(),NOW()),('S2','[]',0,17,NOW(),NOW()),('S3','[]',0,17,NOW(),NOW()),('S4','[]',0,17,NOW(),NOW()),
('S5','[]',0,17,NOW(),NOW()),('S6','[]',0,17,NOW(),NOW()),('S7','[]',0,17,NOW(),NOW()),('S8','[]',0,17,NOW(),NOW()),
('S9','[]',0,17,NOW(),NOW()),('S10','[]',0,17,NOW(),NOW()),('S11','[]',0,17,NOW(),NOW()),('S12','[]',0,17,NOW(),NOW()),
('S13','[]',0,17,NOW(),NOW()),('S14','[]',0,17,NOW(),NOW()),('S15','[]',0,17,NOW(),NOW()),('S16','[]',0,17,NOW(),NOW()),
('S17','[]',0,17,NOW(),NOW()),('S18','[]',0,17,NOW(),NOW()),('S19','[]',0,17,NOW(),NOW()),('S20','[]',0,17,NOW(),NOW()),
('S21','[]',0,17,NOW(),NOW()),('S22','[]',0,17,NOW(),NOW()),('S23','[]',0,17,NOW(),NOW()),('S24','[]',0,17,NOW(),NOW()),
('S25','[]',0,17,NOW(),NOW()),('S26','[]',0,17,NOW(),NOW()),('S27','[]',0,17,NOW(),NOW()),('S28','[]',0,17,NOW(),NOW()),
('S29','[]',0,17,NOW(),NOW()),('S30','[]',0,17,NOW(),NOW()),('S31','[]',0,17,NOW(),NOW()),('S32','[]',0,17,NOW(),NOW()),
('S33','[]',0,17,NOW(),NOW()),('S34','[]',0,17,NOW(),NOW()),('S35','[]',0,17,NOW(),NOW()),('S36','[]',0,17,NOW(),NOW()),
('S37','[]',0,17,NOW(),NOW()),('S38','[]',0,17,NOW(),NOW()),('S39','[]',0,17,NOW(),NOW()),('S40','[]',0,17,NOW(),NOW());

-- Schedule 20 (bus 3, cap 45)
INSERT INTO `Seats` (`seatNumber`, `bookedSegments`, `isBroken`, `scheduleId`, `createdAt`, `updatedAt`) VALUES
('S1','[]',0,20,NOW(),NOW()),('S2','[]',0,20,NOW(),NOW()),('S3','[]',0,20,NOW(),NOW()),('S4','[]',0,20,NOW(),NOW()),
('S5','[]',0,20,NOW(),NOW()),('S6','[]',0,20,NOW(),NOW()),('S7','[]',0,20,NOW(),NOW()),('S8','[]',0,20,NOW(),NOW()),
('S9','[]',0,20,NOW(),NOW()),('S10','[]',0,20,NOW(),NOW()),('S11','[]',0,20,NOW(),NOW()),('S12','[]',0,20,NOW(),NOW()),
('S13','[]',0,20,NOW(),NOW()),('S14','[]',0,20,NOW(),NOW()),('S15','[]',0,20,NOW(),NOW()),('S16','[]',0,20,NOW(),NOW()),
('S17','[]',0,20,NOW(),NOW()),('S18','[]',0,20,NOW(),NOW()),('S19','[]',0,20,NOW(),NOW()),('S20','[]',0,20,NOW(),NOW()),
('S21','[]',0,20,NOW(),NOW()),('S22','[]',0,20,NOW(),NOW()),('S23','[]',0,20,NOW(),NOW()),('S24','[]',0,20,NOW(),NOW()),
('S25','[]',0,20,NOW(),NOW()),('S26','[]',0,20,NOW(),NOW()),('S27','[]',0,20,NOW(),NOW()),('S28','[]',0,20,NOW(),NOW()),
('S29','[]',0,20,NOW(),NOW()),('S30','[]',0,20,NOW(),NOW()),('S31','[]',0,20,NOW(),NOW()),('S32','[]',0,20,NOW(),NOW()),
('S33','[]',0,20,NOW(),NOW()),('S34','[]',0,20,NOW(),NOW()),('S35','[]',0,20,NOW(),NOW()),('S36','[]',0,20,NOW(),NOW()),
('S37','[]',0,20,NOW(),NOW()),('S38','[]',0,20,NOW(),NOW()),('S39','[]',0,20,NOW(),NOW()),('S40','[]',0,20,NOW(),NOW()),
('S41','[]',0,20,NOW(),NOW()),('S42','[]',0,20,NOW(),NOW()),('S43','[]',0,20,NOW(),NOW()),('S44','[]',0,20,NOW(),NOW()),
('S45','[]',0,20,NOW(),NOW());

-- Schedule 22 (bus 6, cap 40)
INSERT INTO `Seats` (`seatNumber`, `bookedSegments`, `isBroken`, `scheduleId`, `createdAt`, `updatedAt`) VALUES
('S1','[]',0,22,NOW(),NOW()),('S2','[]',0,22,NOW(),NOW()),('S3','[]',0,22,NOW(),NOW()),('S4','[]',0,22,NOW(),NOW()),
('S5','[]',0,22,NOW(),NOW()),('S6','[]',0,22,NOW(),NOW()),('S7','[]',0,22,NOW(),NOW()),('S8','[]',0,22,NOW(),NOW()),
('S9','[]',0,22,NOW(),NOW()),('S10','[]',0,22,NOW(),NOW()),('S11','[]',0,22,NOW(),NOW()),('S12','[]',0,22,NOW(),NOW()),
('S13','[]',0,22,NOW(),NOW()),('S14','[]',0,22,NOW(),NOW()),('S15','[]',0,22,NOW(),NOW()),('S16','[]',0,22,NOW(),NOW()),
('S17','[]',0,22,NOW(),NOW()),('S18','[]',0,22,NOW(),NOW()),('S19','[]',0,22,NOW(),NOW()),('S20','[]',0,22,NOW(),NOW()),
('S21','[]',0,22,NOW(),NOW()),('S22','[]',0,22,NOW(),NOW()),('S23','[]',0,22,NOW(),NOW()),('S24','[]',0,22,NOW(),NOW()),
('S25','[]',0,22,NOW(),NOW()),('S26','[]',0,22,NOW(),NOW()),('S27','[]',0,22,NOW(),NOW()),('S28','[]',0,22,NOW(),NOW()),
('S29','[]',0,22,NOW(),NOW()),('S30','[]',0,22,NOW(),NOW()),('S31','[]',0,22,NOW(),NOW()),('S32','[]',0,22,NOW(),NOW()),
('S33','[]',0,22,NOW(),NOW()),('S34','[]',0,22,NOW(),NOW()),('S35','[]',0,22,NOW(),NOW()),('S36','[]',0,22,NOW(),NOW()),
('S37','[]',0,22,NOW(),NOW()),('S38','[]',0,22,NOW(),NOW()),('S39','[]',0,22,NOW(),NOW()),('S40','[]',0,22,NOW(),NOW());

-- Schedule 24 (bus 8, cap 40)
INSERT INTO `Seats` (`seatNumber`, `bookedSegments`, `isBroken`, `scheduleId`, `createdAt`, `updatedAt`) VALUES
('S1','[]',0,24,NOW(),NOW()),('S2','[]',0,24,NOW(),NOW()),('S3','[]',0,24,NOW(),NOW()),('S4','[]',0,24,NOW(),NOW()),
('S5','[]',0,24,NOW(),NOW()),('S6','[]',0,24,NOW(),NOW()),('S7','[]',0,24,NOW(),NOW()),('S8','[]',0,24,NOW(),NOW()),
('S9','[]',0,24,NOW(),NOW()),('S10','[]',0,24,NOW(),NOW()),('S11','[]',0,24,NOW(),NOW()),('S12','[]',0,24,NOW(),NOW()),
('S13','[]',0,24,NOW(),NOW()),('S14','[]',0,24,NOW(),NOW()),('S15','[]',0,24,NOW(),NOW()),('S16','[]',0,24,NOW(),NOW()),
('S17','[]',0,24,NOW(),NOW()),('S18','[]',0,24,NOW(),NOW()),('S19','[]',0,24,NOW(),NOW()),('S20','[]',0,24,NOW(),NOW()),
('S21','[]',0,24,NOW(),NOW()),('S22','[]',0,24,NOW(),NOW()),('S23','[]',0,24,NOW(),NOW()),('S24','[]',0,24,NOW(),NOW()),
('S25','[]',0,24,NOW(),NOW()),('S26','[]',0,24,NOW(),NOW()),('S27','[]',0,24,NOW(),NOW()),('S28','[]',0,24,NOW(),NOW()),
('S29','[]',0,24,NOW(),NOW()),('S30','[]',0,24,NOW(),NOW()),('S31','[]',0,24,NOW(),NOW()),('S32','[]',0,24,NOW(),NOW()),
('S33','[]',0,24,NOW(),NOW()),('S34','[]',0,24,NOW(),NOW()),('S35','[]',0,24,NOW(),NOW()),('S36','[]',0,24,NOW(),NOW()),
('S37','[]',0,24,NOW(),NOW()),('S38','[]',0,24,NOW(),NOW()),('S39','[]',0,24,NOW(),NOW()),('S40','[]',0,24,NOW(),NOW());

SELECT CONCAT('Seed complete! Added: ', 
  (SELECT COUNT(*) FROM Routes), ' routes, ',
  (SELECT COUNT(*) FROM Buses), ' buses, ',
  (SELECT COUNT(*) FROM Schedules), ' schedules, ',
  (SELECT COUNT(*) FROM Seats), ' seats') AS Result;
