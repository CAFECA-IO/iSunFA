import crypto from 'crypto';

// Info: (20241008 - tzuhan) 使用 AES 加密算法
const algorithm = 'aes-256-ctr';
const secretKey = process.env.TOKEN_SECRET_KEY!;

if (!secretKey || secretKey.trim().length === 0) {
  throw new Error('Missing secret key for encryption. Please check your environment variables.');
}

// Info: (20241008 - tzuhan) 確保密鑰是 32 字節（256 位），如果長度不夠，通過哈希生成
const key = crypto.createHash('sha256').update(secretKey).digest();
const iv = crypto.randomBytes(16);

// Info: (20241008 - tzuhan) 加密函數
export function encrypt(text: string): string {
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);

  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

export function decrypt(token: string): string {
  const [ivHex, encryptedText] = token.split(':');
  const decipher = crypto.createDecipheriv(algorithm, key, Buffer.from(ivHex, 'hex'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedText, 'hex')),
    decipher.final(),
  ]);

  return decrypted.toString(); // Info: (20241008 - tzuhan) 返回解密後的原始字符串
}
