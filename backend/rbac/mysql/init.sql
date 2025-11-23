-- Create permissions table for RBAC
CREATE TABLE IF NOT EXISTS permissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    target_userrole ENUM('student', 'teacher', 'admin', 'cashier', 'teacher_assistant') NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (name),
    INDEX idx_target_userrole (target_userrole)
);

-- Create users table (simplified for RBAC - would be synced from main system)
CREATE TABLE IF NOT EXISTS users (
    userid VARCHAR(10) PRIMARY KEY,
    firstName VARCHAR(100),
    lastName VARCHAR(100),
    email VARCHAR(255),
    role VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_role (role)
);

-- Create roles table for RBAC
CREATE TABLE IF NOT EXISTS roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (name)
);

-- Create role_permissions junction table for many-to-many relationship
CREATE TABLE IF NOT EXISTS role_permissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    role_id INT NOT NULL,
    permission_id INT NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
    UNIQUE KEY unique_role_permission (role_id, permission_id),
    INDEX idx_role_id (role_id),
    INDEX idx_permission_id (permission_id)
);

-- Create user_roles junction table for user-role assignments
CREATE TABLE IF NOT EXISTS user_roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(10) NOT NULL,
    role_id INT NOT NULL,
    assigned_by VARCHAR(10),
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    revoked_by VARCHAR(10) NULL,
    revoked_at TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (user_id) REFERENCES users(userid) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_by) REFERENCES users(userid) ON DELETE SET NULL,
    FOREIGN KEY (revoked_by) REFERENCES users(userid) ON DELETE SET NULL,
    UNIQUE KEY unique_active_user_role (user_id, role_id, is_active),
    INDEX idx_user_id (user_id),
    INDEX idx_role_id (role_id),
    INDEX idx_assigned_by (assigned_by),
    INDEX idx_is_active (is_active)
);

-- Insert sample users
INSERT INTO users (userid, firstName, lastName, email, role) VALUES
('A002', 'System', 'Administrator', 'admin@system.com', 'admin')
ON DUPLICATE KEY UPDATE
    firstName = VALUES(firstName),
    lastName = VALUES(lastName),
    email = VALUES(email),
    role = VALUES(role);

-- Insert sample permissions
INSERT IGNORE INTO permissions (name, target_userrole, description) VALUES
('dashboard_overview.dashboard_overview', 'admin', 'Can view dashboard overview'),
('core_admin_management.create_core_admin', 'admin', 'Can create core admin users'),
('core_admin_management.core_admin_info', 'admin', 'Can view core admin information'),
('cashier_management.create_cashier', 'admin', 'Can create cashier users'),
('cashier_management.cashier_info', 'admin', 'Can view cashier information'),
('teacher_management.create_teacher', 'admin', 'Can create teacher users'),
('teacher_management.teacher_info', 'admin', 'Can view teacher information'),
('student_management.student_enrollment', 'admin', 'Can manage student enrollment'),
('student_management.student_cards', 'admin', 'Can manage student cards'),
('student_management.attendance_management', 'admin', 'Can manage student attendance'),
('student_management.purchased_classes', 'admin', 'Can view purchased classes'),
('class_and_schedule.create_class', 'admin', 'Can create classes'),
('class_and_schedule.all_classes', 'admin', 'Can view all classes'),
('class_and_schedule.class_payments', 'admin', 'Can manage class payments'),
('class_and_schedule.class_enrollments', 'admin', 'Can manage class enrollments'),
('class_and_schedule.class_halls', 'admin', 'Can manage class halls'),
('finance_and_reports.financial_records', 'admin', 'Can view financial records'),
('finance_and_reports.generate_reports', 'admin', 'Can generate reports'),
('finance_and_reports.student_all_payments', 'admin', 'Can view all student payments'),
('delivery_management.speed_post_deliveries', 'admin', 'Can manage speed post deliveries'),
('user_roles.all_roles', 'admin', 'Can view all roles'),
('user_roles.permission_management', 'admin', 'Can manage permissions'),
('user_roles.manage_roles', 'admin', 'Can manage roles'),
('user_roles.assign_roles', 'admin', 'Can assign roles to users'),
('communication.announcements', 'admin', 'Can manage announcements'),
('communication.messages', 'admin', 'Can manage messages'),
('security_and_monitoring.student_monitoring', 'admin', 'Can monitor students'),
('system_management.system_settings', 'admin', 'Can manage system settings'),
('system_management.access_all_data', 'admin', 'Can access all system data'),
('system_management.notifications', 'admin', 'Can manage notifications'),
('system_management.backup_and_restore', 'admin', 'Can perform backup and restore operations'),
('payment_processing.process_payment', 'cashier', 'Can process payments'),
('payment_processing.payment_history', 'cashier', 'Can view payment history'),
('student_management.student_records', 'cashier', 'Can view student records'),
('student_management.student_payments', 'cashier', 'Can view student payments'),
('financial_records.daily_transactions', 'cashier', 'Can view daily transactions'),
('financial_records.monthly_reports', 'cashier', 'Can generate monthly reports'),
('financial_records.revenue_summary', 'cashier', 'Can view revenue summary'),
('reports_and_analytics.financial_reports', 'cashier', 'Can generate financial reports'),
('reports_and_analytics.payment_analytics', 'cashier', 'Can view payment analytics'),
('reports_and_analytics.print_receipts', 'cashier', 'Can print receipts'),
('schedule_and_calendar.payment_schedule', 'cashier', 'Can view payment schedule'),
('schedule_and_calendar.due_dates', 'cashier', 'Can view due dates'),
('settings_and_profile.my_profile', 'cashier', 'Can view own profile'),
('settings_and_profile.settings', 'cashier', 'Can manage own settings'),
('settings_and_profile.notifications', 'cashier', 'Can manage notifications'),
('student.enrollment', 'student', 'Can enroll in classes'),


('dashboard_overview.dashboard_overview', 'teacher', 'Can view dashboard overview'),
('class_schedules.my_classes', 'teacher', 'Can view and manage own classes'),
('class_schedules.class_session_schedules', 'teacher', 'Can view class session schedules'),
('class_schedules.hall_availability', 'teacher', 'Can view hall availability'),
('class_schedules.class_enrollments', 'teacher', 'Can manage class enrollments'),
('class_schedules.class_payments', 'teacher', 'Can manage class payments'),
('attendance.attendance_management', 'teacher', 'Can manage attendance'),
('attendance.student_attendance_overview', 'teacher', 'Can view student attendance overview'),
('student_performance.view_performance', 'teacher', 'Can view student performance'),
('student_performance.relevant_student_data', 'teacher', 'Can view relevant student data'),
('student_performance.fees_report', 'teacher', 'Can view fees report'),
('financial_records.payment_days', 'teacher', 'Can view payment days'),
('financial_records.monthly_daily_records', 'teacher', 'Can view monthly and daily financial records'),
('class_materials.create_folders_and_links', 'teacher', 'Can create folders and links for class materials'),
('class_materials.manage_materials', 'teacher', 'Can manage class materials'),
('class_materials.upload_assignments', 'teacher', 'Can upload assignments'),
('exams.exam_dashboard', 'teacher', 'Can access exam dashboard'),
('communication.announcements', 'teacher', 'Can manage announcements'),
('communication.message_students', 'teacher', 'Can message students'),
('reports.generate_reports', 'teacher', 'Can generate reports'),
('teacher_staff.create_and_manage_staff', 'teacher', 'Can create and manage teacher staff');

-- Insert sample roles
INSERT IGNORE INTO roles (name, description) VALUES
('admin', 'System administrator with full access'),
('content_manager', 'Can manage website content'),
('student', 'Basic student permissions'),
('teacher', 'Basic teacher permissions'),
('cashier', 'Basic cashier permissions for payment processing');

-- Insert sample role permissions
INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES
-- Admin role gets all admin permissions (role_id = 1)
(1, 1), (1, 2), (1, 3), (1, 4), (1, 5), (1, 6), (1, 7), (1, 8), (1, 9), (1, 10),
(1, 11), (1, 12), (1, 13), (1, 14), (1, 15), (1, 16), (1, 17), (1, 18), (1, 19), (1, 20),
(1, 21), (1, 22), (1, 23), (1, 24), (1, 25), (1, 26), (1, 27), (1, 28), (1, 29), (1, 30),
(1, 31),
-- Content manager gets some permissions (role_id = 2)
(2, 22), -- permission_management
-- Student gets enrollment (role_id = 3)
(3, 47), -- student.enrollment
-- Teacher gets class management (role_id = 4) targeted for teacher role
(4, 48), (4, 50), (4, 51), (4, 52), (4, 53), (4, 54), (4, 55), (4, 56), (4, 57), (4, 58), (4, 59), (4, 60), (4, 61), (4, 62), (4, 63),
-- Cashier gets all cashier permissions (role_id = 5)
(5, 32), (5, 33), (5, 34), (5, 35), (5, 36), (5, 37), (5, 38), (5, 39), (5, 40),
(5, 41), (5, 42), (5, 43), (5, 44), (5, 45), (5, 46), (5, 49);

-- Assign roles to users
-- NOTE: Roles are now assigned automatically when users are created via the auth system sync
-- This ensures proper RBAC integration without hardcoded assignments



