#!/bin/bash

# Info: (20260412 - Luphia) Start the background node reporter
echo "[Start] Initializing Node Reporter in background..."
cd /opt/reporter && npm start &

# Info: (20260412 - Luphia) Start the main blockchain node process
echo "[Start] Starting ISUNCOIN Node..."
exec isuncoin --port 20023 --discovery.port 20023 --http --http.addr 0.0.0.0 --http.port 20024 --http.vhosts "*" --http.corsdomain "*" --http.api "eth,net,web3,miner,personal,admin"
