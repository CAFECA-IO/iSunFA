FROM nginx:latest

# Info: (20260412 - Luphia) Install OpenSSL for generating self-signed certificates
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Info: (20260412 - Luphia) Copy the Nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Info: (20260412 - Luphia) Copy the startup script into docker-entrypoint.d so it runs automatically
COPY generate_cert.sh /docker-entrypoint.d/99-generate_cert.sh
RUN chmod +x /docker-entrypoint.d/99-generate_cert.sh

EXPOSE 443
