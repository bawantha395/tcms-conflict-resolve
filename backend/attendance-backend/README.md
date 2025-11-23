<<<<<<< HEAD
# Attendance System Backend

A Dockerized PHP backend for an attendance tracking system.

## Features

- Mark attendance with UserID, ClassID, and Timestamp
- Delete old attendance records
- Get attendance records by UserID and ClassID
- Get all attendance records for a ClassID

## API Endpoints

- `POST /`: Mark attendance
    - Requires JSON body with `user_id` and `class_id`
    - curl -X POST -H "Content-Type: application/json" -d '{"user_id":"user1","class_id":"class1"}' http://localhost:8000

- `DELETE /?days=30`: Delete records older than specified days (default: 30)
    - curl -X DELETE "http://localhost:8000?days=60"
  
- `GET /?user_id=USERID&class_id=CLASSID`: Get attendance for specific user in class
    - curl "http://localhost:8000?user_id=user1&class_id=class1"
    
- `GET /?class_id=CLASSID`: Get all attendance for a class
    - curl "http://localhost:8000?class_id=class1"




## Setup

1. Clone this repository
2. Run `docker-compose up -d`
3. The API will be available at `http://localhost:8000`

## Environment Variables

You can customize these in `docker-compose.yml`:

- `DB_HOST`: Database host (default: db)
- `DB_NAME`: Database name (default: attendance)
- `DB_USER`: Database user (default: root)
- `DB_PASSWORD`: Database password (default: secret)
=======
# Attendance System - Database Initialization

## 🎯 **PERMANENT SOLUTION: Automatic Database Setup**

The attendance system now has a **permanent, automatic database initialization solution** that creates all necessary tables and sample data when the MySQL container starts for the first time.

## 📋 **What Gets Created Automatically**

### **🗄️ Database Tables:**
1. **`attendance_records`** - Main attendance tracking table
2. **`zoom_meetings`** - Zoom meeting sessions
3. **`attendance_summary`** - Analytics summary data
4. **`attendance_settings`** - System configuration
5. **`attendance_logs`** - Debug and audit logs

### **👁️ Database Views:**
1. **`attendance_report`** - Easy attendance reporting view
2. **`daily_attendance_summary`** - Daily attendance statistics view

### **⚙️ Default Settings:**
- Late threshold: 15 minutes
- Available methods: zoom_webhook, zoom_manual, recorded_video, barcode
- Auto-calculate duration: true
- Default status: present
- Max duration: 4 hours

### **📊 Sample Data:**
- 4 sample attendance records across different sources
- 2 sample zoom meetings
- 3 sample attendance summaries
- Initialization log entry

## 🚀 **How It Works**

### **Automatic Initialization Process:**

1. **Container Startup**: When `attendance-db` container starts for the first time
2. **Volume Mount**: `./attendance-backend/sql:/docker-entrypoint-initdb.d` mounts the init script
3. **Script Execution**: MySQL automatically runs `init.sql` during initialization
4. **Database Creation**: Creates `` database if it doesn't exist
5. **Table Creation**: Creates all tables with proper indexes and constraints
6. **Sample Data**: Inserts sample data for immediate testing
7. **Views Creation**: Creates reporting views for easy data access

### **Docker Compose Configuration:**

```yaml
attendance-db:
  image: mysql:8.0
  container_name: attendance-db
  ports:
    - "3307:3306"
  environment:
    - MYSQL_ROOT_PASSWORD=secret
    - MYSQL_DATABASE=attendance
    - TZ=Asia/Colombo
  volumes:
    - ./attendance-backend/sql:/docker-entrypoint-initdb.d  # ← This enables auto-init
    - attendance-db-data:/var/lib/mysql
  networks:
    - attendance-network
```

## 🧪 **Testing the Solution**

### **Fresh Database Test:**
```bash
# Remove existing database and recreate
docker compose down attendance-db
docker volume rm backend_attendance-db-data
docker compose up attendance-db -d

# Wait for initialization (15-20 seconds)
sleep 20

# Test endpoints
curl -s "http://localhost:8092/attendance-analytics"
curl -s "http://localhost:8092/attendance/1"
curl -s "http://localhost:8092/student-attendance/STU001"
```

### **Expected Results:**
- ✅ All tables created automatically
- ✅ Sample data inserted
- ✅ All endpoints working with real data
- ✅ Analytics showing 4 records (3 present, 1 late)

## 📁 **File Structure**

```
backend/attendance-backend/
├── sql/
│   └── init.sql                    # ← Permanent initialization script
├── src/
│   ├── routes.php                  # API endpoints
│   └── ...
└── README.md                       # This documentation
```

## 🔧 **Key Features of the Solution**

### **🔄 Idempotent Operations:**
- Uses `DROP TABLE IF EXISTS` for clean initialization
- `WHERE NOT EXISTS` clauses prevent duplicate sample data
- Safe to run multiple times

### **📊 Comprehensive Schema:**
- Proper indexes for performance
- Foreign key relationships (when needed)
- Audit timestamps on all tables
- JSON support for flexible data storage

### **🎯 Production Ready:**
- Proper data types and constraints
- Indexed columns for fast queries
- Sample data for immediate testing
- Logging for debugging

### **🛡️ Error Handling:**
- Graceful handling of existing data
- Proper SQL error handling
- Logging of initialization process

## 🚀 **Deployment Instructions**

### **For New Deployments:**
1. Clone the repository
2. Run `docker compose up attendance-db -d`
3. Wait 15-20 seconds for initialization
4. Start the attendance backend: `docker compose up attendance-backend -d`
5. Test endpoints

### **For Existing Deployments:**
1. Backup existing data if needed
2. Run the initialization script manually:
   ```bash
   docker exec attendance-db mysql -u root -psecret attendance_system < attendance-backend/sql/init.sql
   ```

## 📈 **Database Schema Details**

### **attendance_records Table:**
```sql
CREATE TABLE attendance_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    class_id INT NOT NULL,
    student_id VARCHAR(50) NOT NULL,
    student_name VARCHAR(255),
    meeting_id VARCHAR(100),
    source VARCHAR(50) NOT NULL DEFAULT 'manual',
    attendance_status ENUM('present', 'late', 'absent') NOT NULL DEFAULT 'present',
    join_time DATETIME,
    leave_time DATETIME,
    duration_minutes INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_class_id (class_id),
    INDEX idx_student_id (student_id),
    INDEX idx_meeting_id (meeting_id),
    INDEX idx_join_time (join_time),
    INDEX idx_source (source),
    INDEX idx_status (attendance_status)
);
```

### **Key Indexes:**
- `idx_class_id` - Fast class-based queries
- `idx_student_id` - Fast student-based queries
- `idx_join_time` - Time-based filtering
- `idx_source` - Source-based analytics
- `idx_status` - Status-based filtering

## 🎉 **Success Indicators**

When the solution is working correctly, you should see:

1. **Container Status**: `attendance-db` running without errors
2. **Database Tables**: All 7 tables created (5 tables + 2 views)
3. **Sample Data**: 4 attendance records, 2 zoom meetings, 3 summaries
4. **API Endpoints**: All endpoints returning real data
5. **Analytics**: Showing proper statistics and counts

## 🔍 **Troubleshooting**

### **Common Issues:**

1. **Container Exits**: Check logs with `docker logs attendance-db`
2. **Tables Not Created**: Ensure volume mount is correct
3. **Permission Issues**: Check file permissions on `init.sql`
4. **JSON Errors**: Ensure valid JSON in log entries

### **Manual Recovery:**
```bash
# Connect to database manually
docker exec -it attendance-db mysql -u root -psecret

# Check tables
USE attendance_system;
SHOW TABLES;

# Run initialization manually if needed
source /docker-entrypoint-initdb.d/init.sql
```

## 📝 **Maintenance**

### **Adding New Tables:**
1. Edit `init.sql`
2. Add `DROP TABLE IF EXISTS new_table;`
3. Add `CREATE TABLE new_table (...);`
4. Recreate container or run manually

### **Updating Sample Data:**
1. Edit the INSERT statements in `init.sql`
2. Use `WHERE NOT EXISTS` to prevent duplicates
3. Test with fresh database

### **Schema Changes:**
1. Add migration scripts if needed
2. Update `init.sql` for new deployments
3. Test thoroughly before production

---

## ✅ **Status: PERMANENT SOLUTION ACTIVE**

The attendance system database is now **automatically initialized** with every fresh deployment. No manual setup required! 🎉

>>>>>>> cd7986cdf52ec46c7124c09f9dead86097a32995
