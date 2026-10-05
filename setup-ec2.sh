#!/bin/bash
# Threads-IT-Carousel — EC2 setup script (Ubuntu 24.04 LTS, Node 20, PM2, Nginx)
# Run as ubuntu user:  bash setup-ec2.sh [BRANCH]
set -euo pipefail

DEPLOY_BRANCH="${1:-main}"
APP_DIR="/var/www/threads-it-carousel"

echo "=== 1/5 System packages ==="
sudo apt-get update -qq
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq nginx git
sudo mkdir -p "$APP_DIR"
sudo chown -R ubuntu:ubuntu "$APP_DIR"

echo "=== 2/5 Node.js 20 LTS (nvm) ==="
export NVM_DIR="$HOME/.nvm"
if [ ! -d "$NVM_DIR" ]; then
  curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
fi
. "$NVM_DIR/nvm.sh"
nvm install 20
nvm alias default 20
nvm use 20
node -v && npm -v

echo "=== 3/5 Clone repo + build ==="
cd "$APP_DIR"
if [ -d .git ]; then
  git pull origin "$DEPLOY_BRANCH"
else
  git clone --branch "$DEPLOY_BRANCH" https://github.com/Reyonl/threads-it-carousel.git .
fi
npm ci
npm run build

echo "=== 4/5 PM2 process manager ==="
npm install -g pm2
cat > "$APP_DIR/ecosystem.config.cjs" <<'EOF'
module.exports = {
  apps: [{
    name: "threads-it-carousel",
    script: "node_modules/next/dist/bin/next",
    args: "start -p 3000",
    cwd: "/var/www/threads-it-carousel",
    env: { NODE_ENV: "production", PORT: "3000" },
    max_memory_restart: "400M",
  }]
};
EOF
pm2 delete threads-it-carousel 2>/dev/null || true
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup systemd -u ubuntu --hp /home/ubuntu | tail -1 | sudo bash || true

echo "=== 5/5 Nginx reverse proxy (port 80 -> 3000) ==="
cat > /tmp/threads-it-carousel.conf <<'EOF'
server {
    listen 80;
    server_name _;
    client_max_body_size 20M;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
EOF
sudo mv /tmp/threads-it-carousel.conf /etc/nginx/sites-available/threads-it-carousel.conf
sudo ln -sf /etc/nginx/sites-available/threads-it-carousel.conf /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx

echo ""
echo "=== DEPLOY SUCCESSFUL ==="
echo "Test:     curl http://<PUBLIC_IP>/"
echo "Logs:     pm2 logs threads-it-carousel --lines 50"
echo "Restart:  pm2 restart threads-it-carousel"
echo "Redeploy: cd /var/www/threads-it-carousel && git pull && npm ci && npm run build && pm2 restart threads-it-carousel"
