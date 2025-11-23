# Materials Management Setup Guide

## Overview
The materials management system allows teachers to upload PDF materials that are automatically watermarked and password-protected for students.

## Features
- **PDF Upload**: Teachers can upload PDF materials to their classes
- **Automatic Watermarking**: Every PDF gets a "TCMS" watermark with student information
- **Password Protection**: PDFs are secured with the student's ID as password
- **Download Tracking**: System logs who downloads what and when

## Prerequisites
- Docker and Docker Compose installed
- PHP 8.1 or higher
- MySQL 8.0 or higher
- PDFtk (automatically installed in Docker)

## Installation Steps

### 1. Database Setup
The materials tables will be created automatically when you run the migration:

```bash
# Connect to MySQL container
docker exec -it teacher-mysql mysql -uroot -ppassword teacher_db

# Run the migration script
source /docker-entrypoint-initdb.d/materials_migration.sql
```

Or manually run:
```bash
docker exec -i teacher-mysql mysql -uroot -ppassword teacher_db < backend/teacher/mysql/materials_migration.sql
```

### 2. Docker Container Setup
The Docker setup is automatic when you run:

```bash
cd backend
docker compose up -d
```

This will:
- Install PDFtk-java and Java runtime
- Install all PHP dependencies via Composer
- Set up the materials directory structure
- Configure permissions correctly

### 3. Directory Permissions
The following directories need write permissions (automatically set in Docker):
- `/var/www/html/uploads/materials/` - For storing uploaded PDFs
- `/var/www/html/uploads/temp/` - For temporary watermarked files

## How It Works

### Teacher Upload Process
1. Teacher selects a class and clicks "Add Material"
2. Teacher fills in title, description, category, and selects PDF file
3. System uploads and stores the original PDF
4. Metadata stored in `materials` table

### Student Download Process
1. Student clicks download button in their class materials section
2. Backend creates a watermarked copy with:
   - Large "TCMS" logo (80pt font, 45° angle, transparent)
   - Student name and ID at the bottom of each page
3. Backend applies password protection using student's ID
4. System logs the download in `material_access_log`
5. Student receives the protected PDF
6. Student must enter their ID (e.g., "S02244") to open the PDF

## Database Schema

### materials
Stores uploaded material information:
- `id` - Primary key
- `class_id` - Foreign key to classes
- `teacher_id` - Who uploaded it
- `title`, `description`, `category`
- `file_path` - Path to original PDF
- `download_count` - How many times downloaded
- `is_password_protected` - Always true

### material_access_log
Tracks every download:
- `student_id` - Who downloaded
- `material_id` - What was downloaded
- `accessed_at` - When it was downloaded

## API Endpoints

### GET /materials.php?class_id={id}
Returns all materials for a class

### POST /materials.php
Upload a new material
- Form data: `file`, `class_id`, `teacher_id`, `teacher_name`, `title`, `description`, `category`

### GET /materials.php?download={id}&student_id={sid}&student_name={name}
Download a password-protected, watermarked PDF

### DELETE /materials.php?id={id}&teacher_id={tid}
Delete a material (teacher only)

## Troubleshooting

### PDFtk Not Working
If you see "PDFtk not installed" warnings:
```bash
# Rebuild the container
cd backend/teacher
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Permission Issues
If uploads fail with permission errors:
```bash
# Fix permissions inside container
docker exec teacher-backend chown -R www-data:www-data /var/www/html/uploads
docker exec teacher-backend chmod -R 777 /var/www/html/uploads
```

### Composer Dependencies Not Installed
```bash
# Install dependencies manually
docker exec teacher-backend composer install
```

## Testing

### Test Upload
```bash
curl -X POST http://localhost:8088/materials.php \
  -F "file=@test.pdf" \
  -F "class_id=42" \
  -F "teacher_id=T001" \
  -F "teacher_name=Mr. Test" \
  -F "title=Test Material" \
  -F "category=notes"
```

### Test Download
```bash
curl "http://localhost:8088/materials.php?download=1&student_id=S02244&student_name=Test%20Student" \
  -o test_protected.pdf
```

### Verify Password Protection
Try to open the downloaded PDF - it should ask for a password. Use the student ID (e.g., "S02244").

## Security Notes
- PDFs are password-protected with student ID
- Watermarks cannot be removed without advanced PDF tools
- All downloads are logged for audit purposes
- Only teachers can upload/delete materials
- Students can only download materials from their enrolled classes

## File Structure
```
backend/teacher/
├── Dockerfile                          # Includes PDFtk installation
├── src/
│   ├── composer.json                   # PHP dependencies
│   ├── materials.php                   # API endpoint
│   ├── MaterialController.php          # Business logic
│   ├── MaterialModel.php               # Database operations
│   └── utils/
│       ├── PDFWatermark.php           # Watermark implementation
│       └── PDFPasswordProtector.php    # Password protection
└── mysql/
    └── materials_migration.sql         # Database schema
```

## Support
For issues, check:
1. Docker logs: `docker logs teacher-backend`
2. PHP error logs inside container
3. Database connection settings in `config.php`
4. File permissions in uploads directory
