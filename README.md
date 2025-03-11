# wangchen-cms

##  Docker MySQL 8 docker compose for local development

Place file under root of the project.
file: `./docker-compose.yaml`
command: `docker compose up -d`

```yaml
services:
  mysql:
    image: mysql:8.0
    container_name: wangchen_mysql
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_DATABASE: wangchen_db
      MYSQL_USER: admin
      MYSQL_PASSWORD: admin
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql # This will be fresh since we used -v with down
    command: --default-authentication-plugin=mysql_native_password
    healthcheck:
      test: [ "CMD", "mysqladmin", "ping", "-h", "localhost" ]
      timeout: 5s
      retries: 10

volumes:
  mysql_data:
    name: mysql_data
```

# Prisma DB

verion: >= 6

```
npx prisma migrate reset --force && npx prisma migrate dev
```

# Start development server

Node version: >22 LTS

`npm run dev`

## Local development `.env` data

```
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
DATABASE_URL="mysql://root:root@127.0.0.1:3306/wangchen_db"
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=wangchen_db
DB_USER=root
DB_PASSWORD=admin

# Session Configuration
SESSION_SECRET=your_secure_session_secret

# File Upload Configuration
UPLOAD_PATH=uploads/
MAX_FILE_SIZE=5242880 # 5MB in bytes

# Logging Configuration
LOG_LEVEL=debug
LOG_DIR=./logs
LOG_FILE_ERROR=error.log
LOG_FILE_COMBINED=combined.log
LOG_MAX_SIZE=10m
LOG_MAX_FILES=7

```