#!/bin/bash

# Info: (20260708 - Luphia) Exit immediately if a command exits with a non-zero status
set -e

# Info: (20260708 - Luphia) Help message
show_help() {
    echo "Usage: $0 [username] [ip] [key_name]"
    echo "  username: Remote machine username"
    echo "  ip      : Remote machine IP address"
    echo "  key_name: SSH key name (default: CAFECA.pem)"
}

# Info: (20260708 - Luphia) 1. Parse arguments or prompt
USER_NAME=$1
IP_ADDRESS=$2
KEY_NAME=$3

if [ -z "$USER_NAME" ]; then
    read -p "Enter remote username: " USER_NAME
fi

if [ -z "$IP_ADDRESS" ]; then
    read -p "Enter remote IP address: " IP_ADDRESS
fi

if [ -z "$KEY_NAME" ]; then
    read -p "Enter SSH key name [CAFECA.pem]: " KEY_NAME
    if [ -z "$KEY_NAME" ]; then
        KEY_NAME="CAFECA.pem"
    fi
fi

# Info: (20260708 - Luphia) Validate inputs
if [ -z "$USER_NAME" ] || [ -z "$IP_ADDRESS" ]; then
    echo "Error: Username and IP address are required."
    show_help
    exit 1
fi

SSH_DIR="$HOME/.ssh"
KEY_PATH="$SSH_DIR/$KEY_NAME"
PUB_KEY_PATH="${KEY_PATH}.pub"

# Info: (20260708 - Luphia) Create local ~/.ssh directory if it doesn't exist
mkdir -p "$SSH_DIR"
chmod 700 "$SSH_DIR"

# Info: (20260708 - Luphia) 2. Generate local SSH key if it doesn't exist
if [ ! -f "$KEY_PATH" ]; then
    echo "Generating SSH key: $KEY_PATH..."
    # Info: (20260708 - Luphia) Generate RSA key without passphrase
    ssh-keygen -t rsa -b 4096 -f "$KEY_PATH" -N ""
    echo "SSH key generated successfully."
else
    echo "SSH key already exists at $KEY_PATH. Skipping generation."
fi

# Info: (20260708 - Luphia) Ensure correct permissions on the local keys
chmod 600 "$KEY_PATH"
if [ -f "$PUB_KEY_PATH" ]; then
    chmod 644 "$PUB_KEY_PATH"
fi

# Info: (20260708 - Luphia) 3. Copy the public key to the remote machine
echo "Copying public key to remote machine ($USER_NAME@$IP_ADDRESS)..."
echo "You may be prompted to enter the remote user's password."

# Info: (20260708 - Luphia) Try using ssh-copy-id first as it's the standard and safest way.
# Info: (20260708 - Luphia) If ssh-copy-id is not available, fall back to manual copy over ssh.
if command -v ssh-copy-id &> /dev/null; then
    ssh-copy-id -i "$PUB_KEY_PATH" "${USER_NAME}@${IP_ADDRESS}"
else
    echo "ssh-copy-id not found, using fallback ssh copy method..."
    # Info: (20260708 - Luphia) Read public key content
    PUB_KEY_CONTENT=$(cat "$PUB_KEY_PATH")
    ssh "${USER_NAME}@${IP_ADDRESS}" "mkdir -p ~/.ssh && chmod 700 ~/.ssh && echo \"$PUB_KEY_CONTENT\" >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"
fi

# Info: (20260708 - Luphia) 4. Verify login using the new key
echo "Testing connection using the new SSH key..."
if ssh -i "$KEY_PATH" -o BatchMode=yes -o ConnectTimeout=5 "${USER_NAME}@${IP_ADDRESS}" "echo 'Success'" &> /dev/null; then
    echo "=========================================================="
    echo "SUCCESS: Remote machine configured for SSH key login!"
    echo "You can now log in using:"
    echo "  ssh -i $KEY_PATH ${USER_NAME}@${IP_ADDRESS}"
    echo "=========================================================="
else
    echo "WARNING: Test connection failed. Please check the remote machine's SSH configuration."
fi
