#!/bin/bash

echo "🚀 Deploying LiveSoko on Oracle Cloud ARM Instance..."

# 1. Update system and install dependencies
sudo apt-get update -y
sudo apt-get install -y curl git build-essential

# 2. Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. Install PM2 globally
sudo npm install -g pm2

# 4. Prepare Persistent Storage Directory
# Oracle Cloud provides 200GB block volumes. We mount a directory to ensure SQLite data survives reboots.
sudo mkdir -p /data
sudo chown -R $USER:$USER /data

# 5. Build Frontend
echo "📦 Building Frontend..."
cd frontend
npm install
npm run build
cd ..

# 6. Install Backend Dependencies
echo "📦 Installing Backend Dependencies..."
cd backend
npm install
cd ..

# 7. Start PM2 Server
echo "🟢 Starting PM2 Server..."
pm2 start ecosystem.config.js
pm2 save
pm2 startup | tail -n 1 > startup_cmd.sh
chmod +x startup_cmd.sh
sudo ./startup_cmd.sh

echo "✅ Deployment Complete!"
echo "Make sure to open port 3000 in your Oracle Cloud Ingress Rules."
