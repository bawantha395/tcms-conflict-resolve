# Payment Backend - Database Management

## Folder Structure

### `/mysql` - Database Setup
This folder contains SQL files that run **automatically when the Docker container is first created**.

Files in this folder:
- `init.sql` - Creates the database and sets up initial configuration
- `payment_tables.sql` - Creates all tables with the complete, latest schema
- `payhere_payments.sql` - PayHere integration tables

**How it works:**
- On **fresh install**: All files run automatically in alphabetical order, creating the complete database with all features
- Files are idempotent (safe to run multiple times) using `CREATE TABLE IF NOT EXISTS`

**Manual database updates** (for existing databases):
If you need to update an already-running database, execute SQL commands directly:
```bash
# Example: Add missing column to existing database
docker exec -i payment-mysql mysql -u root -ppassword payment_db -e "ALTER TABLE financial_records ADD COLUMN payment_type ENUM('class_payment', 'admission_fee') DEFAULT 'class_payment';"
```

## Database Schema

### `financial_records` table
Stores all payment transactions (class payments and admission fees).

Key columns:
- `payment_type` - 'class_payment' or 'admission_fee'
- `class_id` - NULL for admission fees (collected before class enrollment)
- `user_id` - Student ID
- `category` - General category (admission_fee, class_enrollment, etc.)
- `status` - pending, paid, cancelled, refunded

## Important Notes

1. **Fresh Install:** Just start the Docker container - everything is set up automatically
2. **Existing Database:** Run migrations from the `/migrations` folder manually
3. **Always update BOTH folders** when schema changes:
   - Update `/mysql/payment_tables.sql` for fresh installs
   - Create migration in `/migrations/` for existing databases
