import SSSSecret from '@/lib/utils/sss_secret';
import {
  CRYPTO_KEY_TOTAL_AMOUNT,
  CRYPTO_KEY_PASS_THRESHOLD,
  CRYPTO_PUBLIC_FOLDER_PATH,
  CRYPTO_PRIVATE_FOLDER_PATH,
  CRYPTO_PRIVATE_METADATA_FOLDER_PATH,
} from '@/constants/crypto';
import { promises as fs } from 'fs';
import path from 'path';
import logger from '@/lib/utils/logger';

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
const ASYMMETRIC_CRYPTO_ALGORITHM = 'RSA-OAEP';
const ASYMMETRIC_KEY_LENGTH = 2048;
const HASH_ALGORITHM = 'SHA-256';
const SYMMETRIC_CRYPTO_ALGORITHM = 'AES-GCM';
const SYMMETRIC_KEY_LENGTH = 256;
const FERMAT_PRIME_NUMBER_IN_HEX = [0x01, 0x00, 0x01];
const ASYMMETRIC_KEY_FORMAT = 'jwk';
const SYMMETRIC_KEY_FORMAT = 'raw';
enum CryptoOperationMode {
  ENCRYPT = 'encrypt',
  DECRYPT = 'decrypt',
}

const sssSecret = new SSSSecret();

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
      name: ASYMMETRIC_CRYPTO_ALGORITHM,
      modulusLength: ASYMMETRIC_KEY_LENGTH,
      publicExponent: new Uint8Array(FERMAT_PRIME_NUMBER_IN_HEX),
      hash: HASH_ALGORITHM,
    },
    true,
    [CryptoOperationMode.ENCRYPT, CryptoOperationMode.DECRYPT]
  );
}

export async function exportPublicKey(publicKey: CryptoKey): Promise<JsonWebKey> {
  return crypto.subtle.exportKey(ASYMMETRIC_KEY_FORMAT, publicKey);
}

export async function exportPrivateKey(privateKey: CryptoKey): Promise<JsonWebKey> {
  return crypto.subtle.exportKey(ASYMMETRIC_KEY_FORMAT, privateKey);
}

export async function importPublicKey(keyData: JsonWebKey): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    ASYMMETRIC_KEY_FORMAT,
    keyData,
    {
      name: ASYMMETRIC_CRYPTO_ALGORITHM,
      hash: HASH_ALGORITHM,
    },
    true,
    [CryptoOperationMode.ENCRYPT]
  );
}

export async function importPrivateKey(keyData: JsonWebKey): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    ASYMMETRIC_KEY_FORMAT,
    keyData,
    {
      name: ASYMMETRIC_CRYPTO_ALGORITHM,
      hash: HASH_ALGORITHM,
    },
    true,
    [CryptoOperationMode.DECRYPT]
  );
}

export async function encryptData(data: string, publicKey: CryptoKey): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  return new Uint8Array(
    await crypto.subtle.encrypt(
      {
        name: ASYMMETRIC_CRYPTO_ALGORITHM,
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
      name: ASYMMETRIC_CRYPTO_ALGORITHM,
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
  const symmetricKey = await crypto.subtle.generateKey(
    { name: SYMMETRIC_CRYPTO_ALGORITHM, length: SYMMETRIC_KEY_LENGTH },
    true,
    [CryptoOperationMode.ENCRYPT, CryptoOperationMode.DECRYPT]
  );
  const encryptedContent = await crypto.subtle.encrypt(
    { name: SYMMETRIC_CRYPTO_ALGORITHM, iv },
    symmetricKey,
    fileArrayBuffer
  );

  const exportedSymmetricKey = await crypto.subtle.exportKey(SYMMETRIC_KEY_FORMAT, symmetricKey);
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
    SYMMETRIC_KEY_FORMAT,
    decryptedSymmetricKey,
    { name: SYMMETRIC_CRYPTO_ALGORITHM, length: SYMMETRIC_KEY_LENGTH },
    true,
    [CryptoOperationMode.DECRYPT]
  );

  const decryptedContent = await crypto.subtle.decrypt(
    { name: SYMMETRIC_CRYPTO_ALGORITHM, iv },
    importedSymmetricKey,
    encryptedContent
  );

  return decryptedContent;
};

export function separatePrivateKey(privateKey: JsonWebKey) {
  const { d, p, q, dp, dq, qi, ...metadata } = privateKey;

  const separateField = (field: string | undefined) => {
    const newField = field
      ? sssSecret.base64Share(field, CRYPTO_KEY_TOTAL_AMOUNT, CRYPTO_KEY_PASS_THRESHOLD)
      : Array(CRYPTO_KEY_TOTAL_AMOUNT).fill(null);
    return newField;
  };

  const dSeparated = separateField(d);
  const pSeparated = separateField(p);
  const qSeparated = separateField(q);
  const dpSeparated = separateField(dp);
  const dqSeparated = separateField(dq);
  const qiSeparated = separateField(qi);

  const separatedPrivateKeys = Array.from({ length: CRYPTO_KEY_TOTAL_AMOUNT }, (_, i) => ({
    d: dSeparated[i] || null,
    p: pSeparated[i] || null,
    q: qSeparated[i] || null,
    dp: dpSeparated[i] || null,
    dq: dqSeparated[i] || null,
    qi: qiSeparated[i] || null,
  }));

  return {
    metadata,
    separatedPrivateKeys,
  };
}

export function assemblePrivateKey(
  separatedPrivateKey: {
    d: string | null;
    p: string | null;
    q: string | null;
    dp: string | null;
    dq: string | null;
    qi: string | null;
  }[],
  metadata: Partial<JsonWebKey>
): JsonWebKey {
  const combineField = (shares: (string | null)[]) => {
    const validShares = shares.filter((share) => share !== null) as string[];
    return validShares.length >= CRYPTO_KEY_PASS_THRESHOLD
      ? sssSecret.base64Combine(validShares)
      : undefined;
  };

  const d = combineField(separatedPrivateKey.map((item) => item.d));
  const p = combineField(separatedPrivateKey.map((item) => item.p));
  const q = combineField(separatedPrivateKey.map((item) => item.q));
  const dp = combineField(separatedPrivateKey.map((item) => item.dp));
  const dq = combineField(separatedPrivateKey.map((item) => item.dq));
  const qi = combineField(separatedPrivateKey.map((item) => item.qi));

  return {
    ...metadata,
    d,
    p,
    q,
    dp,
    dq,
    qi,
  };
}

export async function storeKeyByCompany(companyId: number, keyPair: CryptoKeyPair) {
  const publicKey = await exportPublicKey(keyPair.publicKey);
  const privateKey = await exportPrivateKey(keyPair.privateKey);

  const { metadata, separatedPrivateKeys } = separatePrivateKey(privateKey);

  const publicKeyPath = path.join(CRYPTO_PUBLIC_FOLDER_PATH, `${companyId}.json`);
  const privateMetaPath = path.join(CRYPTO_PRIVATE_METADATA_FOLDER_PATH, `${companyId}.json`);
  fs.writeFile(publicKeyPath, JSON.stringify(publicKey));
  fs.writeFile(privateMetaPath, JSON.stringify(metadata));

  separatedPrivateKeys.forEach((separatedPrivateKey, index) => {
    const privatePath = path.join(CRYPTO_PRIVATE_FOLDER_PATH, `${index + 1}`, `${companyId}.json`);
    fs.writeFile(privatePath, JSON.stringify(separatedPrivateKey));
  });
}

export async function getPublicKeyByCompany(companyId: string): Promise<CryptoKey | null> {
  const publicKeyPath = path.join(CRYPTO_PUBLIC_FOLDER_PATH, `${companyId}.json`);

  let publicKey: CryptoKey | null = null;

  try {
    const publicKeyJSON = await fs.readFile(publicKeyPath, 'utf-8');
    publicKey = await importPublicKey(JSON.parse(publicKeyJSON));
  } catch (error) {
    logger.error(`Failed to import public key for company ${companyId}`);
  }

  return publicKey;
}

export async function getPrivateKeyByCompany(companyId: string): Promise<CryptoKey | null> {
  const privateMetaPath = path.join(CRYPTO_PRIVATE_METADATA_FOLDER_PATH, `${companyId}.json`);
  const metadata = JSON.parse(await fs.readFile(privateMetaPath, 'utf-8'));

  const separatedPrivateKeyJSONs = await Promise.all(
    Array.from({ length: CRYPTO_KEY_TOTAL_AMOUNT }, (_, i) => {
      const privatePath = path.join(CRYPTO_PRIVATE_FOLDER_PATH, `${i + 1}`, `${companyId}.json`);
      return fs.readFile(privatePath, 'utf-8');
    })
  );

  const separatedPrivateKeys = separatedPrivateKeyJSONs.map((json) => JSON.parse(json));
  const privateKeyAssembled = assemblePrivateKey(separatedPrivateKeys, metadata);

  let privateKey: CryptoKey | null = null;
  try {
    privateKey = await importPrivateKey(privateKeyAssembled);
  } catch (error) {
    logger.error(`Failed to import private key for company ${companyId}`);
  }

  return privateKey;
}
