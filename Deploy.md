## Deploy the app

```bash

zip -r output.zip . -x '.git' -x 'node_modules'

# Send entire file via croc
croc send output.zip

# on server directory path
cd /data/wwwroot/stsvpo.bun.tw

unzip output.zip

# password: oneinstack
nano .env


# Run prisma migrate 

npx prisma migrate dev

# Restart the pm2 application
pm2 restart 0
pm2 logs 0

```