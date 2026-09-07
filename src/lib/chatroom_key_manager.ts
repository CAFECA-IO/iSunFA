// Info: (20260712 - Luphia) chatroom 加密金鑰管理：以 WebAuthn PRF 派生金鑰包裝/解包主私鑰，並持久化於後端
// Info: (20260712 - Luphia) 主私鑰永不以明文離開瀏覽器；後端只存公鑰與 PRF 包裝後的密文

/**
 * Info: (20260812 - Luphia) PRF 秘密改由 `requestPrfSecret()` 統一取得。
 *
 * passkey 帳號行為完全不變。託管帳號（第三方登入）沒有 passkey，
 * 原本會卡在一個永遠不會成功的系統對話框前面，現在改向 API 索取
 * （見 `assertion_client.requestPrfSecret` 與 ADR 016 補充）。
 *
 * **上面第二行那句保證只對 passkey 帳號成立。** 託管帳號的秘密由伺服器派生，
 * 主私鑰仍然只在瀏覽器裡解包，但伺服器有能力自己派生同一個秘密 ——
 * 與它已經持有那些帳號的簽章私鑰是同一個信任模型。
 */

import { request } from "@/lib/utils/request";
import { requestPrfSecret } from "@/lib/auth/assertion_client";
import { WalletCustodyType } from "@/constants/auth_provider";
import { CHATROOM_KEY_ALGORITHM } from "@/constants/chatroom_key";
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

/**
 * Info: (20260812 - Luphia) 這一列的包裝來源與當下的 custody 不符（PR review P-1）。
 *
 * 最可能的觸發情境:託管使用者補綁了 passkey,託管金鑰列被廢除,
 * `resolveCustodyType` 於是回 PASSKEY —— 前端改走 passkey 派生,
 * 同一個 salt 得到不同的秘密,`unwrapMasterKey` 必然失敗。
 *
 * 沒有這個具名錯誤的話,使用者看到的是一句通用的「解鎖失敗」,
 * 而真相是「這份對話以平台代管金鑰加密,需要先完成金鑰移轉」——
 * 那是兩件完全不同的事,前者會讓人一直重按。
 */
export class ChatroomKeySourceMismatchError extends Error {
  constructor(
    public readonly recordAlgorithm: string,
    public readonly expectedAlgorithm: string,
  ) {
    super(
      `chatroom key was wrapped by ${recordAlgorithm}, but this account now resolves to ${expectedAlgorithm}`,
    );
    this.name = "ChatroomKeySourceMismatchError";
  }
}

/**
 * Info: (20260812 - Luphia) custody 還沒載入就別猜（PR review P-2）。
 *
 * 猜錯的方向不對稱:把託管帳號當成 passkey,會開出一個永遠不會成功的系統對話框
 * —— 正是這批修正要消滅的那個 bug。未知時拋錯,由 UI 擋在按鈕層（disabled）,
 * 這個錯誤是那道防線失效時的第二層。
 */
export class ChatroomCustodyUnknownError extends Error {
  constructor() {
    super("account custody is not loaded yet; refusing to guess a key source");
    this.name = "ChatroomCustodyUnknownError";
  }
}

// Info: (20260812 - Luphia) 依 custody 決定這條路徑該用哪一種包裝來源
const expectedAlgorithmFor = (custody?: string): string => {
  if (custody === undefined) throw new ChatroomCustodyUnknownError();
  return custody === WalletCustodyType.CUSTODIAL
    ? CHATROOM_KEY_ALGORITHM.CUSTODIAL_PRF
    : CHATROOM_KEY_ALGORITHM.PASSKEY_PRF;
};

interface IOwnKeyRecord {
  encryptionPublicKey: string;
  wrappedPrivateKey: string;
  prfSalt: string;
  // Info: (20260812 - Luphia) 這一列是誰包裝的（PR review P-1）；舊列可能沒有這個欄位
  algorithm?: string;
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

/**
 * Info: (20260812 - Luphia) 失敗的 promise 不留在快取裡。
 *
 * 原本只判斷 `if (!ownKeyRecordPromise)`,而被記住的包含**已 reject 的 promise** ——
 * `/api/v1/user/encryption_key` 只要失敗過一次(網路抖動、後端重啟、一次 500),
 * 之後每一次 `ensureMasterKey()` 都會 await 到同一個 rejected promise,
 * 在碰到 WebAuthn 之前就拋出。
 *
 * 使用者看到的是「按了解鎖完全沒反應,連驗證對話框都不跳」,
 * 而且**重按沒有用**,只有重新整理頁面才會好 —— 因為模組層級的變數不會自己清掉。
 *
 * 清掉之後重按就是一次真正的重試。成功的結果仍然快取(那才是這支存在的理由:
 * 避免「fetch → PRF」的順序耗掉 WebAuthn 的 transient user activation)。
 */
export function prefetchOwnKeyRecord(): Promise<IOwnKeyRecord | null> {
  if (!ownKeyRecordPromise) {
    ownKeyRecordPromise = fetchOwnKeyRecord().catch((error: unknown) => {
      ownKeyRecordPromise = null;
      throw error;
    });
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
// Info: (20260812 - Luphia) custody 來自 /auth/me；未提供時視為 passkey，與 requestAssertion 的預設一致
export async function ensureMasterKey(
  custody?: string,
): Promise<IChatroomMasterKey> {
  // Info: (20260712 - Luphia) 使用預抓結果（多半已就緒），手勢當下 getPrfSecret 前不再等網路
  const existing = await prefetchOwnKeyRecord();

  const expectedAlgorithm = expectedAlgorithmFor(custody);

  if (existing) {
    /**
     * Info: (20260812 - Luphia) 解包前先比對來源（PR review P-1）。
     *
     * 舊列沒有這個欄位時視為 passkey —— schema 的預設值就是那個,
     * 而託管路徑是這批修正才出現的,所以「沒標記」等於「passkey 時代寫的」。
     */
    const recordAlgorithm =
      existing.algorithm ?? CHATROOM_KEY_ALGORITHM.PASSKEY_PRF;
    if (recordAlgorithm !== expectedAlgorithm) {
      throw new ChatroomKeySourceMismatchError(
        recordAlgorithm,
        expectedAlgorithm,
      );
    }

    const prfSecret = await requestPrfSecret({
      prfSaltBase64: existing.prfSalt,
      custody,
      derivePasskeySecret: () => getPrfSecret(base64ToBytes(existing.prfSalt)),
    });
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
  const prfSecret = await requestPrfSecret({
    prfSaltBase64: bytesToBase64(prfSalt),
    custody,
    derivePasskeySecret: () => getPrfSecret(prfSalt),
  });
  const wrappedPrivateKey = await wrapMasterKey(
    prfSecret,
    master.extendedPrivateKey,
  );
  const record: IOwnKeyRecord = {
    encryptionPublicKey: master.extendedPublicKey,
    wrappedPrivateKey,
    prfSalt: bytesToBase64(prfSalt),
    // Info: (20260812 - Luphia) 記下是誰包裝的,否則將來無從辨識也無從重新包裝（P-1）
    algorithm: expectedAlgorithm,
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
