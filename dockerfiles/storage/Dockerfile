FROM ipfs/kubo:v0.40.1 AS ipfs_source
FROM node:22-bookworm-slim

# Info: (20260412 - Luphia) Install git
RUN apt-get update && apt-get install -y git

# Info: (20260412 - Luphia) Copy IPFS binary
COPY --from=ipfs_source /usr/local/bin/ipfs /usr/local/bin/ipfs

# Info: (20260412 - Luphia) Setup IPFS environment
ENV IPFS_PATH=/root/.ipfs
RUN ipfs init || true
RUN ipfs config Addresses.API /ip4/0.0.0.0/tcp/5001
RUN ipfs config Addresses.Gateway /ip4/0.0.0.0/tcp/8080

# Info: (20260412 - Luphia) Apply private swarm network
COPY swarm.key /root/.ipfs/swarm.key
COPY swarm.key /swarm.key
RUN ipfs bootstrap rm --all || true

# Info: (20260412 - Luphia) Clone and Build SwarmStorage
RUN git clone https://github.com/CAFECA-IO/SwarmStorage.git /swarm-storage
WORKDIR /swarm-storage
RUN npm install && npm run build

# Info: (20260412 - Luphia) Start Script
COPY start.sh /start.sh
RUN chmod +x /start.sh

# Info: (20260412 - Luphia) Default command
CMD ["/start.sh"]
