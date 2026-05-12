#!/bin/bash

# Info: (20260412 - Luphia) Start the background node reporter
echo "[Start] Initializing Node Reporter in background..."
cd /opt/reporter && npm start &

# Info: (20260412 - Luphia) Start the main blockchain node process
echo "[Start] Starting ISUNCOIN Node..."

# Info: (20260512 - Luphia) Add background process to add peers after node starts
(
  echo "[Start] Waiting for node HTTP RPC to be ready..."
  while ! curl -s -X POST -H "Content-Type: application/json" --data '{"jsonrpc":"2.0","method":"net_version","params":[],"id":1}' http://127.0.0.1:20024 > /dev/null; do
    sleep 10
  done
  echo "[Start] Node is up, executing admin.addPeer..."

  isuncoin attach --exec \
    'admin.addPeer("enode://4187d61fd4ea7423dabf26b746844f6dfabfb7f295a2dc4ff4570765aba29f77b88774aac15811cbc46dc4e5e3b512e8d82b2a1f8b26ec73f372d385c9f847fa@211.22.118.146:30303")'
  isuncoin attach --exec \
    'admin.addPeer("enode://346b3bd08e94fede9da36e976b781e2d9bb7b9cdd4bc254f5373e32176af3c9d17ca2b82b9c5a3807b39c8fe0641a68ade895b2099374699fdb9f37251e03078@211.22.118.147:30303")'
  isuncoin attach --exec \
    'admin.addPeer("enode://35e060c329bb27e41aea566918b30ca655619feba5200a605be8bae1ea183a845adc2f71350398096da3b2c4a8548ac7749cae799db1a405a62d75d7380fb64d@211.22.118.148:30303")'
  isuncoin attach --exec \
    'admin.addPeer("enode://9bf20bea0a1f0f11eb808234807fbd738a76eb47f61e6d0d27a346910462396c1adc5095fd1828120cd50fe6574a893ccc4814a1d98fd5abed1273b902b91996@211.22.118.150:30303")'
) &

exec isuncoin --port 20023 --discovery.port 20023 --http --http.addr 0.0.0.0 --http.port 20024 --http.vhosts "*" --http.corsdomain "*" --http.api "eth,net,web3,miner,personal,admin"
