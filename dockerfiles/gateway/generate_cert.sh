#!/bin/sh

# Info: (20260412 - Luphia) Create SSL directory if not exists
mkdir -p /etc/nginx/ssl

# Info: (20260412 - Luphia) Generate self-signed certificate if it doesn't exist
if [ ! -f /etc/nginx/ssl/nginx.crt ]; then
    echo "Generating self-signed certificate..."
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout /etc/nginx/ssl/nginx.key \
        -out /etc/nginx/ssl/nginx.crt \
        -subj '/C=TW/ST=Taiwan/L=Taipei/O=Development/CN=localhost'
    echo "Certificate generated successfully."
else
    echo "Self-signed certificate already exists. Skipping..."
fi
