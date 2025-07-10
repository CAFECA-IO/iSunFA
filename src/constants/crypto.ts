import * as path from 'path';

export enum CryptoFolder {
  PUBLIC = 'public',
  PRIVATE = 'private',
}

// ToDo: (20250710 - Luphia) Use IPFS to store files （S4: path 組合，僅組字串，不做 IO，需同步 S1/S2 重構檢查）
export const BASE_CRYPTO_FOLDER = process.env.BASE_STORAGE_PATH || '.';

export const VERCEL_STORAGE_FOLDER = '/tmp';

// Info: (20240827 - Murky) private key會被分割成多少把
export const CRYPTO_KEY_TOTAL_AMOUNT = 5;

// Info: (20240827 - Murky) private key被分割後，需要幾把才能還原
export const CRYPTO_KEY_PASS_THRESHOLD = 3;

const CRYPTO_BASE_FOLDER_PATH =
  process.env.VERCEL === '1' ? VERCEL_STORAGE_FOLDER : BASE_CRYPTO_FOLDER;

// ToDo: (20250710 - Luphia) Use IPFS to store files （S4: path 組合，僅組字串，不做 IO，需同步 S1/S2 重構檢查）
export const CRYPTO_PUBLIC_FOLDER_PATH = path.join(CRYPTO_BASE_FOLDER_PATH, CryptoFolder.PUBLIC);

// ToDo: (20250710 - Luphia) Use IPFS to store files （S4: path 組合，僅組字串，不做 IO，需同步 S1/S2 重構檢查）
export const CRYPTO_PRIVATE_FOLDER_PATH = path.join(CRYPTO_BASE_FOLDER_PATH, CryptoFolder.PRIVATE);

// ToDo: (20250710 - Luphia) Use IPFS to store files （S4: path 組合，僅組字串，不做 IO，需同步 S1/S2 重構檢查）
export const CRYPTO_PRIVATE_METADATA_FOLDER_PATH = path.join(
  CRYPTO_PRIVATE_FOLDER_PATH,
  'metadata'
);

export const CRYPTO_PRIVATE_KEY_FOLDER_PATH = Array.from(
  { length: CRYPTO_KEY_TOTAL_AMOUNT },
  (_, index) => {
    // ToDo: (20250710 - Luphia) Use IPFS to store files （S4: path 組合，僅組字串，不做 IO，需同步 S1/S2 重構檢查）
    return path.join(CRYPTO_PRIVATE_FOLDER_PATH, `${index + 1}`);
  }
);

export const CRYPTO_FOLDER_PATH = [
  CRYPTO_PUBLIC_FOLDER_PATH,
  CRYPTO_PRIVATE_METADATA_FOLDER_PATH,
  ...CRYPTO_PRIVATE_KEY_FOLDER_PATH,
];
