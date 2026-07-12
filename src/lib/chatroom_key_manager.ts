// Info: (20260712 - Luphia) chatroom 加密金鑰管理：以 WebAuthn PRF 派生金鑰包裝/解包主私鑰，並持久化於後端
// Info: (20260712 - Luphia) 主私鑰永不以明文離開瀏覽器；後端只存公鑰與 PRF 包裝後的密文

import { request } from "@/lib/utils/request";
import {
  generateMasterKey,
  generatePrfSalt,
  getPrfSecret,
  wrapMasterKey,
  unwrapMasterKey,
  bytesToBase64,
  base64ToBytes,
  type IChatroomMasterKey,
} from "@/lib/chatroom_ecies";

const ENCRYPTION_KEY_ENDPOINT = "/api/v1/user/encryption_key";

interface IOwnKeyRecord {
  encryptionPublicKey: string;
  wrappedPrivateKey: string;
  prfSalt: string;
}

// Info: (20260712 - Luphia) 取得自身已註冊的金鑰紀錄（無則回 null）
async function fetchOwnKeyRecord(): Promise<IOwnKeyRecord | null> {
  const res = await request<{ payload: IOwnKeyRecord | null }>(
    ENCRYPTION_KEY_ENDPOINT,
  );
  return res.payload ?? null;
}

// Info: (20260712 - Luphia) 快取金鑰紀錄的取回；於進入頁面時先預抓，讓手勢當下呼叫 PRF 前不需再等網路
// Info: (20260712 - Luphia) 避免「fetch → PRF」順序耗掉 WebAuthn 的 transient user activation
let ownKeyRecordPromise: Promise<IOwnKeyRecord | null> | null = null;

export function prefetchOwnKeyRecord(): Promise<IOwnKeyRecord | null> {
  if (!ownKeyRecordPromise) {
    ownKeyRecordPromise = fetchOwnKeyRecord();
  }
  return ownKeyRecordPromise;
}

// Info: (20260712 - Luphia) 註冊自身金鑰（公鑰 + PRF 包裝私鑰 + salt）
async function registerOwnKey(record: IOwnKeyRecord): Promise<void> {
  await request(ENCRYPTION_KEY_ENDPOINT, {
    method: "POST",
    body: JSON.stringify(record),
  });
}

// Info: (20260712 - Luphia) 確保取得可用的主金鑰：已註冊者經 PRF 解包；未註冊者產生後 PRF 包裝並註冊
// Info: (20260712 - Luphia) 裝置不支援 PRF 時，getPrfSecret 會拋 ChatroomUnsupportedDeviceError（由呼叫端提示）
export async function ensureMasterKey(): Promise<IChatroomMasterKey> {
  // Info: (20260712 - Luphia) 使用預抓結果（多半已就緒），手勢當下 getPrfSecret 前不再等網路
  const existing = await prefetchOwnKeyRecord();

  if (existing) {
    const prfSecret = await getPrfSecret(base64ToBytes(existing.prfSalt));
    const extendedPrivateKey = await unwrapMasterKey(
      prfSecret,
      existing.wrappedPrivateKey,
    );
    return {
      extendedPrivateKey,
      extendedPublicKey: existing.encryptionPublicKey,
    };
  }

  const master = generateMasterKey();
  const prfSalt = generatePrfSalt();
  const prfSecret = await getPrfSecret(prfSalt);
  const wrappedPrivateKey = await wrapMasterKey(
    prfSecret,
    master.extendedPrivateKey,
  );
  const record: IOwnKeyRecord = {
    encryptionPublicKey: master.extendedPublicKey,
    wrappedPrivateKey,
    prfSalt: bytesToBase64(prfSalt),
  };
  await registerOwnKey(record);
  // Info: (20260712 - Luphia) 更新快取，避免後續重複視為未註冊
  ownKeyRecordPromise = Promise.resolve(record);
  return master;
}

// Info: (20260712 - Luphia) 取得指定用戶（address）對外公開的加密公鑰，供加密訊息給對方
export async function fetchRecipientPublicKey(
  address: string,
): Promise<string | null> {
  const res = await request<{
    payload: { encryptionPublicKey: string } | null;
  }>(ENCRYPTION_KEY_ENDPOINT, { query: { address } });
  return res.payload?.encryptionPublicKey ?? null;
}
