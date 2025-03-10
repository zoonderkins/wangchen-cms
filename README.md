# wangchen-cms

# Docker MySQL 8 docker compose

file: `docker-compose.yaml`

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

# Prisma DB init

verion: >= 6


```
npx prisma migrate reset --force && npx prisma migrate dev
```