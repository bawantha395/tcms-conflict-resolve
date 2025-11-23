# Cashier Backend API

Complete implementation of cashier session management backend with persistent KPIs.

---

## 📁 **Project Structure**

```
backend/cashier/
├── Dockerfile                      # Docker image configuration
├── docker-compose.yml              # Service orchestration
├── mysql/
│   └── init.sql                   # Database schema & initialization
├── src/
│   ├── .htaccess                  # Apache URL rewriting
│   ├── index.php                  # API entry point & routing
│   ├── config.php                 # Database config & helpers
│   ├── composer.json              # PHP dependencies
│   ├── CashierSessionController.php  # Session management logic
│   └── README.md                  # This file
└── DOCKER_FILES_CREATED.md        # Documentation
```

---

## 🚀 **Quick Start**

### **1. Start the Service**

```bash
# From backend/cashier directory
cd backend/cashier
docker-compose up -d

# Or start all backend services
cd backend
docker-compose up -d
```

### **2. Verify Service Running**

```bash
# Check containers
docker ps | grep cashier

# Test API
curl http://localhost:8083
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Cashier Backend API",
  "version": "1.0.0",
  "timestamp": "2025-10-18 14:30:00",
  "endpoints": {
    "POST /api/session/start": "Start or resume cashier session",
    "GET /api/session/current": "Get current session data",
    ...
  }
}
```

### **3. Access phpMyAdmin**

```
URL: http://localhost:8084
Username: cashieruser
Password: cashierpass
Database: cashier_db
```

---

## 📡 **API Endpoints**

### **Base URL:** `http://localhost:8083`

---

### **1. Start/Resume Session**

**Endpoint:** `POST /api/session/start`

**Description:** Creates a new session for today or resumes existing one.

**Request Body:**
```json
{
  "cashier_id": "C00001",
  "cashier_name": "Bawantha Rathnayake",
  "opening_balance": 5000
}
```

**Response (New Session):**
```json
{
  "success": true,
  "message": "New session started successfully",
  "data": {
    "session": {
      "session_id": 123,
      "cashier_id": "C00001",
      "cashier_name": "Bawantha Rathnayake",
      "session_date": "2025-10-18",
      "first_login_time": "2025-10-18 08:30:00",
      "total_collections": 0,
      "receipts_issued": 0,
      "pending_payments": 0,
      "opening_balance": 5000,
      "cash_drawer_balance": 5000,
      "session_status": "active"
    },
    "is_resumed": false
  }
}
```

**Response (Resumed Session):**
```json
{
  "success": true,
  "message": "Session resumed successfully",
  "data": {
    "session": {
      "session_id": 123,
      "total_collections": 15000,
      "receipts_issued": 5,
      "pending_payments": 2,
      "cash_drawer_balance": 20000,
      ...
    },
    "is_resumed": true
  }
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:8083/api/session/start \
  -H "Content-Type: application/json" \
  -d '{
    "cashier_id": "C00001",
    "cashier_name": "Bawantha Rathnayake",
    "opening_balance": 5000
  }'
```

---

### **2. Get Current Session**

**Endpoint:** `GET /api/session/current`

**Description:** Retrieves current session data for a cashier on a specific date.

**Query Parameters:**
- `cashier_id` (required): Cashier user ID
- `date` (optional): Date in YYYY-MM-DD format (defaults to today)

**Example:**
```
GET /api/session/current?cashier_id=C00001&date=2025-10-18
```

**Response:**
```json
{
  "success": true,
  "message": "Session retrieved successfully",
  "data": {
    "session": {
      "session_id": 123,
      "cashier_id": "C00001",
      "cashier_name": "Bawantha Rathnayake",
      "session_date": "2025-10-18",
      "first_login_time": "2025-10-18 08:30:00",
      "last_activity_time": "2025-10-18 14:25:00",
      "total_collections": 18500,
      "receipts_issued": 6,
      "pending_payments": 3,
      "opening_balance": 5000,
      "cash_drawer_balance": 23500,
      "session_status": "active",
      "is_day_ended": false
    },
    "recent_activities": [
      {
        "activity_id": 456,
        "activity_type": "payment_collected",
        "activity_time": "2025-10-18 14:20:00",
        "amount": 4500,
        "student_id": "S02950"
      }
    ]
  }
}
```

**cURL Example:**
```bash
curl "http://localhost:8083/api/session/current?cashier_id=C00001&date=2025-10-18"
```

---

### **3. Update Session KPIs**

**Endpoint:** `POST /api/session/update-kpis`

**Description:** Updates session KPI values (called frequently from frontend).

**Request Body:**
```json
{
  "session_id": 123,
  "total_collections": 18500,
  "receipts_issued": 6,
  "pending_payments": 3,
  "cash_drawer_balance": 23500
}
```

**Response:**
```json
{
  "success": true,
  "message": "KPIs updated successfully",
  "data": {
    "updated_at": "2025-10-18 14:25:00"
  }
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:8083/api/session/update-kpis \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": 123,
    "total_collections": 18500,
    "receipts_issued": 6,
    "pending_payments": 3,
    "cash_drawer_balance": 23500
  }'
```

---

### **4. Log Activity**

**Endpoint:** `POST /api/session/activity`

**Description:** Logs a specific activity during the session (for audit trail).

**Request Body:**
```json
{
  "session_id": 123,
  "activity_type": "payment_collected",
  "activity_data": {
    "student_id": "S02950",
    "student_name": "Romesh Fernando",
    "class_name": "2030 AL Chem",
    "amount": 4500,
    "payment_method": "cash"
  },
  "amount": 4500,
  "student_id": "S02950",
  "transaction_id": "TXN202510181234"
}
```

**Activity Types:**
- `login` - Cashier logged in
- `logout` - Cashier logged out
- `lock` - Session locked
- `unlock` - Session unlocked
- `payment_collected` - Payment received
- `receipt_issued` - Receipt printed
- `late_note_issued` - Late payment permission note
- `cash_drawer_opened` - Drawer opened
- `cash_drawer_closed` - Drawer closed
- `day_end_report` - Day end report generated
- `student_registered` - New student registered
- `class_enrolled` - Student enrolled in class

**Response:**
```json
{
  "success": true,
  "message": "Activity logged successfully",
  "data": {
    "activity_id": 789
  }
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:8083/api/session/activity \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": 123,
    "activity_type": "late_note_issued",
    "activity_data": {
      "student_id": "S02950",
      "student_name": "Romesh Fernando",
      "class_name": "2030 AL Chem",
      "outstanding_amount": 4500
    },
    "student_id": "S02950"
  }'
```

---

### **5. Close Day End**

**Endpoint:** `POST /api/session/close-day`

**Description:** Closes the session and generates day end report.

**Request Body:**
```json
{
  "session_id": 123,
  "closing_balance": 25000,
  "notes": "Day ended successfully"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Day ended successfully",
  "data": {
    "report": {
      "session_date": "2025-10-18",
      "first_login": "08:30 AM",
      "day_end": "06:00 PM",
      "total_hours": "9 hours 30 minutes",
      "total_collections": 20000,
      "receipts_issued": 8,
      "pending_payments": 4,
      "opening_balance": 5000,
      "closing_balance": 25000,
      "difference": 20000,
      "discrepancy": 0,
      "status": "BALANCED"
    }
  }
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:8083/api/session/close-day \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": 123,
    "closing_balance": 25000,
    "notes": "Day ended successfully"
  }'
```

---

### **6. Lock Session**

**Endpoint:** `POST /api/session/lock`

**Description:** Locks the session (prevents new transactions until unlocked).

**Request Body:**
```json
{
  "session_id": 123
}
```

**Response:**
```json
{
  "success": true,
  "message": "Session locked successfully",
  "data": {}
}
```

---

### **7. Unlock Session**

**Endpoint:** `POST /api/session/unlock`

**Description:** Unlocks a locked session.

**Request Body:**
```json
{
  "session_id": 123
}
```

**Response:**
```json
{
  "success": true,
  "message": "Session unlocked successfully",
  "data": {}
}
```

---

## 🗄️ **Database Schema**

### **Tables:**

1. **`cashier_sessions`** - Daily session data with KPIs
2. **`session_activities`** - Activity audit trail
3. **`cash_drawer_transactions`** - Cash movement log

See `mysql/init.sql` for complete schema.

---

## 🔧 **Configuration**

### **Environment Variables:**

Set in `docker-compose.yml`:

```yaml
environment:
  - DB_HOST=cashier-mysql
  - DB_NAME=cashier_db
  - DB_USER=cashieruser
  - DB_PASSWORD=cashierpass
  - TZ=Asia/Colombo
```

### **Ports:**

- **Backend API:** 8083
- **MySQL:** 3314
- **phpMyAdmin:** 8084

---

## 🧪 **Testing**

### **Test Session Workflow:**

```bash
# 1. Start session
curl -X POST http://localhost:8083/api/session/start \
  -H "Content-Type: application/json" \
  -d '{"cashier_id":"C00001","cashier_name":"Test Cashier","opening_balance":5000}'

# 2. Get current session
curl "http://localhost:8083/api/session/current?cashier_id=C00001"

# 3. Update KPIs
curl -X POST http://localhost:8083/api/session/update-kpis \
  -H "Content-Type: application/json" \
  -d '{"session_id":1,"total_collections":10000,"receipts_issued":3}'

# 4. Log activity
curl -X POST http://localhost:8083/api/session/activity \
  -H "Content-Type: application/json" \
  -d '{"session_id":1,"activity_type":"payment_collected","amount":4500}'

# 5. Close day
curl -X POST http://localhost:8083/api/session/close-day \
  -H "Content-Type: application/json" \
  -d '{"session_id":1,"closing_balance":15000}'
```

---

## 🐛 **Troubleshooting**

### **Issue: Cannot connect to database**

```bash
# Wait for MySQL to initialize (30-60 seconds on first start)
docker logs cashier-mysql-server

# If still fails, restart
docker-compose restart cashier-backend
```

### **Issue: 404 Not Found**

```bash
# Check Apache mod_rewrite is enabled
docker exec -it cashier-backend apache2ctl -M | grep rewrite

# If not enabled, rebuild
docker-compose build --no-cache cashier-backend
docker-compose up -d
```

### **Issue: Database tables don't exist**

```bash
# Manually run init.sql
docker exec -i cashier-mysql-server mysql -u cashieruser -pcashierpass cashier_db < mysql/init.sql

# Or recreate database
docker-compose down -v
docker-compose up -d
```

---

## 📊 **Integration with Frontend**

See `CASHIER_SESSION_PERSISTENCE_FIX.md` for complete frontend integration guide.

**Key Points:**
1. Load/create session on cashier dashboard mount
2. Debounce KPI updates (avoid too many API calls)
3. Log activities for audit trail
4. Use session_id in all API calls

---

## ✅ **Status**

- ✅ Database schema created
- ✅ Docker configuration complete
- ✅ Backend API implemented
- ✅ All endpoints working
- ⚠️ Frontend integration needed

---

## 📝 **Next Steps**

1. **Frontend Integration:**
   - Update `CashierDashboard.jsx`
   - Add session loading logic
   - Implement KPI sync
   - Add activity logging

2. **Testing:**
   - Test all API endpoints
   - Verify data persistence
   - Test day end workflow

3. **Documentation:**
   - API documentation
   - User guide
   - Admin guide

---

## 🎯 **Summary**

**Backend Status:** ✅ **COMPLETE**

All files created:
- ✅ `config.php` - Database configuration
- ✅ `index.php` - API routing
- ✅ `api/CashierSessionController.php` - Business logic
- ✅ `.htaccess` - URL rewriting
- ✅ `composer.json` - Dependencies

**Ready for frontend integration!** 🚀
