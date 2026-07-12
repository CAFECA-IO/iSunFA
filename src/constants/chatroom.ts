// Info: (20260712 - Luphia) Chatroom (Centrifugo) 共用常數

// Info: (20260712 - Luphia) 未設定 NEXT_PUBLIC_CHATROOM_PORT 時的預設連線 port（前後端共用單一來源）
export const DEFAULT_CHATROOM_PORT = "20027";

// Info: (20260712 - Luphia) 未設定 CENTRIFUGO_API_KEY 時的預設值（與 docker-compose 預設一致，單一來源）
export const DEFAULT_CENTRIFUGO_API_KEY = "isunfa_api_key";

// Info: (20260712 - Luphia) 歷史訊息每頁筆數（進入載入最近 N 則，上卷每次再載 N 則）
export const CHATROOM_HISTORY_PAGE_SIZE = 20;

// Info: (20260712 - Luphia) chatroom 訊息加密參數（encrypt/decrypt 共用單一來源，必須一致）
export const CHATROOM_ENCRYPTION_ALGORITHM = "AES-GCM";
export const CHATROOM_ENCRYPTION_KEY_LENGTH = 256;
export const CHATROOM_ENCRYPTION_IV_BYTES = 12;

// Info: (20260712 - Luphia) ECIES（非對稱）與 HD 派生參數；encrypt/decrypt/wrap 三方必須一致
export const CHATROOM_HKDF_HASH = "SHA-256";
// Info: (20260712 - Luphia) ECIES 對稱金鑰的 HKDF context（區隔用途，避免金鑰重用）
export const CHATROOM_ECIES_HKDF_INFO = "iSunFA-chatroom-ecies-v1";
// Info: (20260712 - Luphia) 以 passkey PRF 秘密包裝主私鑰時的 HKDF context
export const CHATROOM_PRF_HKDF_INFO = "iSunFA-chatroom-prf-wrap-v1";
// Info: (20260712 - Luphia) 演算法版本標記（對應 DB 欄位，便於未來演進）
export const CHATROOM_ECIES_ALGORITHM = "ECIES-secp256k1-AES-256-GCM";
