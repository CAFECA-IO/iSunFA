#!/bin/bash
set -e

# Info: (20260626 - Luphia) Load NVM into environment
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

REPO_DIR="/app/iSunFA"

if [ -z "$(ls -A $REPO_DIR 2>/dev/null)" ]; then
  echo "=> Repository directory is empty. Cloning feature/turn_key_solution..."
  git clone -b feature/turn_key_solution https://github.com/CAFECA-IO/iSunFA.git $REPO_DIR
else
  echo "=> Repository already exists. Pulling latest changes..."
  cd $REPO_DIR
  git pull origin feature/turn_key_solution
fi

cd $REPO_DIR

echo "=> Installing dependencies..."
npm install

echo "=> Starting swarm using pm2-runtime..."
# Info: (20260626 - Luphia) pm2-runtime keeps the container alive
pm2-runtime start npm --name "isunfa-swarm" -- run swarm
