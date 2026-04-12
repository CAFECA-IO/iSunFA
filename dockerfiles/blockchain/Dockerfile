# Info: (20251213 - Luphia) Base image Ubuntu 24.04
FROM ubuntu:24.04

# Info: (20251213 - Luphia) Install dependencies
# Info: (20251213 - Luphia) git for cloning, golang for building, ca-certificates for HTTPS
RUN apt-get update && apt-get install -y git golang ca-certificates curl

# Info: (20251213 - Luphia) Clone repository
RUN git clone https://github.com/CAFECA-IO/isuncoin /opt/isuncoin

# Info: (20251213 - Luphia) Set working directory
WORKDIR /opt/isuncoin

# Info: (20251218 - Luphia) Patch broken flopsCommand
RUN sed -i '/flopsCommand/d' cmd/isuncoin/main.go

# Info: (20251213 - Luphia) Build binary for Linux AMD64
RUN GOOS=linux GOARCH=amd64 go build -o isuncoin-linux ./cmd/isuncoin

# Info: (20251213 - Luphia) Install to /usr/local/bin
RUN cp isuncoin-linux /usr/local/bin/isuncoin && chmod +x /usr/local/bin/isuncoin

# Info: (20251213 - Luphia) Verify installation
RUN isuncoin --version || echo "isuncoin installed"

# Info: (20260412 - Luphia) Install Node.js for Node Reporter
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && \
  apt-get install -y nodejs && \
  rm -rf /var/lib/apt/lists/*

# Info: (20260412 - Luphia) Copy Reporter script and package
COPY reporter /opt/reporter
RUN cd /opt/reporter && npm install

# Info: (20260412 - Luphia) Copy startup script
COPY start.sh /opt/start.sh
RUN chmod +x /opt/start.sh

# Info: (20260412 - Luphia) Default command
CMD ["/opt/start.sh"]
