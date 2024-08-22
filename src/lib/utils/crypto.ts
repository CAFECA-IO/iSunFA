/* Info: (20240822 - Shirley)
- 實作混合加密 (hybrid encryption)，用對稱加密密鑰將檔案加密，用非對稱加密的 public key 加密對稱密鑰，用非對稱加密的 private key 解密對稱密鑰
    1. 使用 AES 演算法產生 `symmetricKey`
    2. 將檔案用 `symmetricKey` 加密，產生 `encryptedContent`
    3. 使用 RSA 演算法產生 `publicKey` 跟 `privateKey`
    4. 使用 `publicKey` 對 `symmetricKey` 加密，產生 `encryptedSymmetricKey`
    5. 將不須保密的`encryptedSymmetricKey`、`publicKey`、`encryptedContent`、一次性的 `IV` 儲存跟傳輸
    6. 需保密的 `symmetricKey` 不能存在任何地方，需透過`encryptedSymmetricKey`跟`privateKey`獲得
    7. 需保密的 `privateKey` 要妥善保存，不能洩漏
*/
const ENCRYPTION_ALGORITHM = 'RSA-OAEP';
const ENCRYPTION_KEY_LENGTH = 2048;
const HASH_ALGORITHM = 'SHA-256';

/*
  Info: [0x01, 0x00, 0x01]，對應到十進制的 65537 (20240822 - Shirley)
  使用 65537 作為 publicExponent 是一種常見且安全的做法，因為：
  它是一個費馬素數（Fermat prime），形式為 2^(2^n) + 1，在這個例子中，n = 4，2^16+1=65537。
  它是一個奇數，可以確保在模乘運算中不會有因數 2。
  它足夠大，可以抵抗某些攻擊，同時又足夠小，在加密和解密過程中計算效率高。
*/
export async function generateKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(
    {
      name: ENCRYPTION_ALGORITHM,
      modulusLength: ENCRYPTION_KEY_LENGTH,
      publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
      hash: HASH_ALGORITHM,
    },
    true,
    ['encrypt', 'decrypt']
  );
}

export async function exportPublicKey(publicKey: CryptoKey): Promise<JsonWebKey> {
  return crypto.subtle.exportKey('jwk', publicKey);
}

export async function exportPrivateKey(privateKey: CryptoKey): Promise<JsonWebKey> {
  return crypto.subtle.exportKey('jwk', privateKey);
}

export async function importPublicKey(keyData: JsonWebKey): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'jwk',
    keyData,
    {
      name: ENCRYPTION_ALGORITHM,
      hash: HASH_ALGORITHM,
    },
    true,
    ['encrypt']
  );
}

export async function importPrivateKey(keyData: JsonWebKey): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'jwk',
    keyData,
    {
      name: ENCRYPTION_ALGORITHM,
      hash: HASH_ALGORITHM,
    },
    true,
    ['decrypt']
  );
}

export async function encryptData(data: string, publicKey: CryptoKey): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  return new Uint8Array(
    await crypto.subtle.encrypt(
      {
        name: ENCRYPTION_ALGORITHM,
      },
      publicKey,
      encoder.encode(data)
    )
  );
}

export async function decryptData(
  encryptedData: Uint8Array,
  privateKey: CryptoKey
): Promise<string> {
  const decoder = new TextDecoder();
  const decryptedData = await crypto.subtle.decrypt(
    {
      name: ENCRYPTION_ALGORITHM,
    },
    privateKey,
    encryptedData
  );
  return decoder.decode(decryptedData);
}

export async function encrypt(data: string, publicKey: CryptoKey): Promise<string> {
  const encryptedData = await encryptData(data, publicKey);
  return JSON.stringify(Array.from(encryptedData));
}

export async function decrypt(encryptedData: string, privateKey: CryptoKey): Promise<string> {
  const data = new Uint8Array(JSON.parse(encryptedData));
  return decryptData(data, privateKey);
}

// Info: 加密文件 (20240822 - Shirley)
export const encryptFile = async (
  fileArrayBuffer: ArrayBuffer,
  publicKey: CryptoKey,
  iv: Uint8Array
): Promise<{ encryptedContent: ArrayBuffer; encryptedSymmetricKey: string }> => {
  const symmetricKey = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
    'encrypt',
    'decrypt',
  ]);
  const encryptedContent = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    symmetricKey,
    fileArrayBuffer
  );

  const exportedSymmetricKey = await crypto.subtle.exportKey('raw', symmetricKey);
  const encryptedSymmetricKey = await encrypt(
    JSON.stringify(Array.from(new Uint8Array(exportedSymmetricKey))),
    publicKey
  );

  return { encryptedContent, encryptedSymmetricKey };
};

// Info: 解密文件 (20240822 - Shirley)
export const decryptFile = async (
  encryptedContent: ArrayBuffer,
  encryptedSymmetricKey: string,
  privateKey: CryptoKey,
  iv: Uint8Array
): Promise<ArrayBuffer> => {
  const decryptedSymmetricKeyJSON = await decrypt(encryptedSymmetricKey, privateKey);
  const decryptedSymmetricKey = new Uint8Array(JSON.parse(decryptedSymmetricKeyJSON)).buffer;
  const importedSymmetricKey = await crypto.subtle.importKey(
    'raw',
    decryptedSymmetricKey,
    { name: 'AES-GCM', length: 256 },
    true,
    ['decrypt']
  );

  const decryptedContent = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    importedSymmetricKey,
    encryptedContent
  );

  return decryptedContent;
};
