-- Safe migration: ensure teachers and hall_bookings exist and have compatible foreign keys
CREATE DATABASE IF NOT EXISTS teacher_db;
USE teacher_db;

-- Ensure teachers table exists (create only if missing; schema aligned with init.sql)
CREATE TABLE IF NOT EXISTS teachers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  teacherId VARCHAR(10) UNIQUE NOT NULL,
  designation VARCHAR(50) NOT NULL,
  name VARCHAR(200) NOT NULL,
  stream VARCHAR(50) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(15) NOT NULL,
  password VARCHAR(255) NOT NULL,
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Create hall_bookings table (teacherId nullable so ON DELETE SET NULL works)
CREATE TABLE IF NOT EXISTS hall_bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  hall_name VARCHAR(100) NOT NULL,
  subject VARCHAR(100),
  class_id INT,
  teacherId VARCHAR(10) DEFAULT NULL,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status ENUM('booked', 'cancelled') DEFAULT 'booked',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_hall_date_time (hall_name, date, start_time, end_time),
  CONSTRAINT fk_hallbook_teacher FOREIGN KEY (teacherId) REFERENCES teachers(teacherId) ON DELETE SET NULL
) ENGINE=InnoDB;
