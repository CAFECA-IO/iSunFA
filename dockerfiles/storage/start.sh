#!/bin/bash
set -e

# Info: (20260412 - Luphia) Initialize IPFS if config missing
if [ ! -f "$IPFS_PATH/config" ]; then
  echo "Initializing IPFS..."
  ipfs init
  ipfs config Addresses.API /ip4/0.0.0.0/tcp/5001
  ipfs config Addresses.Gateway /ip4/0.0.0.0/tcp/8080
fi

# Info: (20260412 - Luphia) Apply private swarm network
if [ -f "/swarm.key" ]; then
  echo "Applying private swarm.key..."
  cp /swarm.key "$IPFS_PATH/swarm.key"
fi

# Info: (20260412 - Luphia) Always flush public bootstrap nodes in private mode
ipfs bootstrap rm --all || true

# Info: (20260412 - Luphia) Disable AutoConf for Private Network compatibility
ipfs config --json AutoConf.Enabled false || true

# Info: (20260412 - Luphia) Start IPFS Daemon in background
echo "Starting IPFS Daemon..."
export LIBP2P_FORCE_PNET=1
ipfs daemon &

# Info: (20260412 - Luphia) Wait for IPFS API to be ready
echo "Waiting for IPFS..."
sleep 5

# Info: (20260412 - Luphia) Start SwarmStorage
echo "Starting SwarmStorage..."
cd /swarm-storage
npm run swarm
