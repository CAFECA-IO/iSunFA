FROM ubuntu:24.04

# Info: (20260626 - Luphia) Disable interactive prompts during apt-get
ENV DEBIAN_FRONTEND=noninteractive

# Info: (20260626 - Luphia) Install basics
RUN apt-get update && apt-get install -y \
    curl \
    git \
    build-essential \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Info: (20260626 - Luphia) Install NVM and Node.js 24.18.0
ENV NVM_DIR /root/.nvm
ENV NODE_VERSION 24.18.0

RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash \
    && . $NVM_DIR/nvm.sh \
    && nvm install $NODE_VERSION \
    && nvm alias default $NODE_VERSION \
    && nvm use default

# Info: (20260626 - Luphia) Add node and npm to path so the commands are available
ENV NODE_PATH $NVM_DIR/v$NODE_VERSION/lib/node_modules
ENV PATH $NVM_DIR/versions/node/v$NODE_VERSION/bin:$PATH

# Info: (20260626 - Luphia) Install pm2 globally
RUN npm install -g pm2

# Info: (20260626 - Luphia) Prepare app directory
WORKDIR /app

# Info: (20260626 - Luphia) Copy entrypoint
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
