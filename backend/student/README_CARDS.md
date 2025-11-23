# Student Cards Migration and Docker instructions

This file contains instructions to create the `student_cards` table used by the frontend `FreeHalfCards` page.

If you're using the project's Docker Compose setup, the student MySQL service is defined in `backend/student/docker-compose.yml` and mounts `backend/student/mysql/init.sql` at container init. Since the project already includes `init.sql`, you can either:

- Append the contents of `create_student_cards_table.sql` into `backend/student/mysql/init.sql` and restart the `student-mysql` service, or
- Run the SQL file manually against the running student MySQL container.

Quick commands (PowerShell) — adjust if your compose uses different names or ports:

# 1) Apply migration file to running MySQL container
# Replace the container name if different (check `docker ps`)

docker exec -i student-mysql-server mysql -u studentuser -pstudentpass student_db < /var/lib/mysql/create_student_cards_table.sql

# If the file is on the host, copy it into the container first (example):
# (from repo root)
COPY_CMD="docker cp backend/student/mysql/create_student_cards_table.sql student-mysql-server:/create_student_cards_table.sql"
Invoke-Expression $COPY_CMD
docker exec -i student-mysql-server mysql -u studentuser -pstudentpass student_db < /create_student_cards_table.sql

# 2) Alternatively, append to init.sql and re-create the container (init runs only on first start):
# - Open backend/student/mysql/init.sql and paste the SQL from create_student_cards_table.sql at the end.
# - Then run:
#	cd backend/student
#	docker-compose down
#	docker-compose up -d --build

# Notes
- Default DB credentials in compose: user `studentuser`, password `studentpass`, database `student_db`.
- If you run the SQL manually, ensure the SQL file is available in the container path used above, or use a shell session inside the container to run `mysql` and paste the SQL.
- After applying the migration, restart the `student-backend` PHP container to ensure route handlers and DB connections operate against the updated schema.
